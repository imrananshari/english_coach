import { db, studyRoomMembers } from '@english-coach/database';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { createStudyToken } from '@/lib/ably';
import { auth } from '@/lib/auth';

export const runtime='nodejs';
const schema=z.object({roomId:z.string().uuid()});
export async function POST(request:Request){
  const session=await auth.api.getSession({headers:request.headers});if(!session)return Response.json({message:'Unauthorized.'},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({message:'Invalid room.'},{status:400});
  const [member]=await db.select().from(studyRoomMembers).where(and(eq(studyRoomMembers.roomId,parsed.data.roomId),eq(studyRoomMembers.userId,session.user.id),eq(studyRoomMembers.status,'joined'))).limit(1);
  if(!member)return Response.json({message:'Join the room before connecting.'},{status:403});
  try{return Response.json(await createStudyToken(parsed.data.roomId,session.user.id));}catch(error){return Response.json({message:error instanceof Error?error.message:'Realtime is unavailable.'},{status:503});}
}