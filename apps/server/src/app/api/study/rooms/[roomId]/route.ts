import {
  db,
  studyRoomActivities,
  studyRoomAnswers,
  studyRoomMembers,
  studyRoomMessages,
  studyRooms,
  user,
} from '@english-coach/database';
import { and, asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { publishStudyEvent } from '@/lib/ably';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';

async function membership(roomId: string, userId: string) {
  const [member] = await db
    .select()
    .from(studyRoomMembers)
    .where(and(eq(studyRoomMembers.roomId, roomId), eq(studyRoomMembers.userId, userId), eq(studyRoomMembers.status, 'joined')))
    .limit(1);
  return member;
}

export async function GET(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  const { roomId } = await params;
  const member = await membership(roomId, session.user.id);
  if (!member) return Response.json({ message: 'Join this room first.' }, { status: 403 });

  const [room] = await db.select().from(studyRooms).where(eq(studyRooms.id, roomId)).limit(1);
  if (!room) return Response.json({ message: 'Room not found.' }, { status: 404 });
  const members = await db
    .select({ userId: studyRoomMembers.userId, role: studyRoomMembers.role, name: user.name, image: user.image })
    .from(studyRoomMembers)
    .innerJoin(user, eq(user.id, studyRoomMembers.userId))
    .where(and(eq(studyRoomMembers.roomId, roomId), eq(studyRoomMembers.status, 'joined')))
    .orderBy(asc(studyRoomMembers.joinedAt));
  const recent = await db
    .select({ id: studyRoomMessages.id, userId: studyRoomMessages.userId, message: studyRoomMessages.message, createdAt: studyRoomMessages.createdAt, name: user.name, image: user.image })
    .from(studyRoomMessages)
    .innerJoin(user, eq(user.id, studyRoomMessages.userId))
    .where(eq(studyRoomMessages.roomId, roomId))
    .orderBy(desc(studyRoomMessages.createdAt))
    .limit(60);

  let activity = null;
  if (room.currentActivityId) {
    const [current] = await db.select().from(studyRoomActivities).where(eq(studyRoomActivities.id, room.currentActivityId)).limit(1);
    if (current) {
      const answers = await db.select({ userId: studyRoomAnswers.userId, score: studyRoomAnswers.score }).from(studyRoomAnswers).where(eq(studyRoomAnswers.activityId, current.id));
      activity = {
        id: current.id,
        activityType: current.activityType,
        title: current.title,
        content: current.content,
        status: current.status,
        startedAt: current.startedAt,
        answerCount: answers.length,
        myAnswer: answers.find((answer) => answer.userId === session.user.id) ?? null,
      };
    }
  }
  return Response.json({ room, membership: member, members, messages: recent.reverse(), activity });
}

const patchSchema = z.object({ action: z.enum(['leave', 'close']) });

export async function PATCH(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: 'Invalid room action.' }, { status: 400 });
  const { roomId } = await params;
  const [room] = await db.select().from(studyRooms).where(eq(studyRooms.id, roomId)).limit(1);
  const member = await membership(roomId, session.user.id);
  if (!room || !member) return Response.json({ message: 'Room not found.' }, { status: 404 });

  if (parsed.data.action === 'close') {
    if (room.hostUserId !== session.user.id) return Response.json({ message: 'Only the host can close this room.' }, { status: 403 });
    await db.update(studyRooms).set({ status: 'completed', currentActivityId: null, updatedAt: new Date() }).where(eq(studyRooms.id, roomId));
    await publishStudyEvent(roomId, 'room-closed', { roomId }).catch(() => undefined);
    return Response.json({ closed: true });
  }
  if (room.hostUserId === session.user.id) return Response.json({ message: 'The host must close the room.' }, { status: 400 });
  await db.update(studyRoomMembers).set({ status: 'left', lastSeenAt: new Date() }).where(eq(studyRoomMembers.id, member.id));
  await publishStudyEvent(roomId, 'room-member', { type: 'left', userId: session.user.id }).catch(() => undefined);
  return Response.json({ left: true });
}
