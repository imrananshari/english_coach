import { db, studyRoomMembers, studyRoomMessages } from '@english-coach/database';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { publishStudyEvent } from '@/lib/ably';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';
const schema = z.object({ message: z.string().trim().min(1).max(500) });

export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: 'Message must contain 1–500 characters.' }, { status: 400 });
  const { roomId } = await params;
  const [member] = await db.select({ id: studyRoomMembers.id }).from(studyRoomMembers).where(and(
    eq(studyRoomMembers.roomId, roomId),
    eq(studyRoomMembers.userId, session.user.id),
    eq(studyRoomMembers.status, 'joined'),
  )).limit(1);
  if (!member) return Response.json({ message: 'Join this room before sending messages.' }, { status: 403 });
  const [created] = await db.insert(studyRoomMessages).values({ roomId, userId: session.user.id, message: parsed.data.message }).returning();
  if (!created) return Response.json({ message: 'Could not send message.' }, { status: 503 });
  const message = { ...created, name: session.user.name, image: session.user.image };
  await publishStudyEvent(roomId, 'chat-message', message).catch(() => undefined);
  return Response.json({ message });
}
