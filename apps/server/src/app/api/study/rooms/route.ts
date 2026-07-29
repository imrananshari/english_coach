import { db, studyRoomMembers, studyRooms, user } from '@english-coach/database';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { publishStudyEvent } from '@/lib/ably';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';
const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), title: z.string().trim().min(3).max(60), description: z.string().trim().max(180).optional(), visibility: z.enum(['public','private']).default('public') }),
  z.object({ action: z.literal('join'), roomId: z.string().uuid().optional(), code: z.string().trim().min(4).max(10).optional() }).refine((value)=>value.roomId||value.code,{message:'Room ID or code is required.'}),
]);
const roomCode = () => Array.from({length:6},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');

export async function GET(request:Request){
  const session=await auth.api.getSession({headers:request.headers});if(!session)return Response.json({message:'Unauthorized.'},{status:401});
  const rooms=await db.select().from(studyRooms).where(and(eq(studyRooms.status,'in-progress'),eq(studyRooms.visibility,'public'))).orderBy(desc(studyRooms.createdAt)).limit(40);
  const members=rooms.length?await db.select({roomId:studyRoomMembers.roomId,userId:studyRoomMembers.userId,status:studyRoomMembers.status}).from(studyRoomMembers):[];
  const hosts=rooms.length?await db.select({id:user.id,name:user.name,image:user.image}).from(user):[];
  const hostMap=new Map(hosts.map((item)=>[item.id,item]));
  return Response.json({rooms:rooms.map((room)=>({...room,host:hostMap.get(room.hostUserId)??null,memberCount:members.filter((member)=>member.roomId===room.id&&member.status==='joined').length,isMember:members.some((member)=>member.roomId===room.id&&member.userId===session.user.id&&member.status==='joined')}))});
}

export async function POST(request:Request){
  const session=await auth.api.getSession({headers:request.headers});if(!session)return Response.json({message:'Unauthorized.'},{status:401});
  const parsed=bodySchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({message:parsed.error.issues[0]?.message??'Invalid room request.'},{status:400});
  if(parsed.data.action==='create'){
    let code='';for(let attempt=0;attempt<5;attempt+=1){const candidate=roomCode();const [exists]=await db.select({id:studyRooms.id}).from(studyRooms).where(eq(studyRooms.code,candidate)).limit(1);if(!exists){code=candidate;break;}}
    if(!code)return Response.json({message:'Could not create a unique room code.'},{status:503});
    const [room]=await db.insert(studyRooms).values({code,hostUserId:session.user.id,title:parsed.data.title,description:parsed.data.description,visibility:parsed.data.visibility}).returning();
    if(!room)return Response.json({message:'Could not create room.'},{status:503});
    await db.insert(studyRoomMembers).values({roomId:room.id,userId:session.user.id,role:'host'});
    return Response.json({room});
  }
  const normalizedCode=parsed.data.code?.toUpperCase();
  const [room]=parsed.data.roomId
    ? await db.select().from(studyRooms).where(and(eq(studyRooms.id,parsed.data.roomId),eq(studyRooms.status,'in-progress'))).limit(1)
    : await db.select().from(studyRooms).where(and(eq(studyRooms.code,normalizedCode!),eq(studyRooms.status,'in-progress'))).limit(1);
  if(!room)return Response.json({message:'Room not found or already closed.'},{status:404});
  const joined=await db.select().from(studyRoomMembers).where(and(eq(studyRoomMembers.roomId,room.id),eq(studyRoomMembers.status,'joined')));
  if(joined.length>=room.maxMembers&&!joined.some((item)=>item.userId===session.user.id))return Response.json({message:'This room is full.'},{status:409});
  await db.insert(studyRoomMembers).values({roomId:room.id,userId:session.user.id,role:room.hostUserId===session.user.id?'host':'member'}).onConflictDoUpdate({target:[studyRoomMembers.roomId,studyRoomMembers.userId],set:{status:'joined',lastSeenAt:new Date()}});
  await publishStudyEvent(room.id,'room-member',{type:'joined',userId:session.user.id,name:session.user.name}).catch(()=>undefined);
  return Response.json({room});
}