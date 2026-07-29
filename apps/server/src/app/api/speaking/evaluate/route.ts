import { conversations, db, learningActivityEvents, userProgress } from '@english-coach/database';
import { and, eq, sql } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { serverEnv } from '@/lib/env';
import { evaluateSpeaking } from '@/lib/speaking-coach';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!serverEnv.GROQ_API_KEY) return Response.json({ message: 'Speech transcription is not configured.' }, { status: 503 });
  const form = await request.formData().catch(() => null);
  const audio = form?.get('audio');
  const sessionId = form?.get('sessionId');
  const durationValue = Number(form?.get('durationSeconds'));
  if (!(audio instanceof Blob) || typeof sessionId !== 'string' || !Number.isFinite(durationValue)) return Response.json({ message: 'A valid audio recording is required.' }, { status: 400 });
  if (audio.size > 15 * 1024 * 1024) return Response.json({ message: 'Recording is too large. Keep answers under 2 minutes.' }, { status: 413 });
  const durationSeconds = Math.max(1, Math.min(180, Math.round(durationValue)));
  const [conversation] = await db.select().from(conversations).where(and(eq(conversations.id, sessionId), eq(conversations.userId, session.user.id))).limit(1);
  if (!conversation || conversation.durationSeconds > 0) return Response.json({ message: 'This speaking session is invalid or already completed.' }, { status: 409 });
  const coach = (conversation.transcript[0] ?? {}) as { prompt?:string;task?:string;targetPhrases?:Array<{phrase:string;meaning:string}> };
  if (!coach.prompt || !coach.task || !coach.targetPhrases) return Response.json({ message: 'Speaking prompt data is missing.' }, { status: 409 });

  try {
    const groqForm = new FormData();
    groqForm.append('file', audio, audio instanceof File && audio.name ? audio.name : 'speaking.m4a');
    groqForm.append('model', 'whisper-large-v3-turbo');
    groqForm.append('language', 'en');
    groqForm.append('response_format', 'json');
    groqForm.append('temperature', '0');
    groqForm.append('prompt', `English learner response about: ${coach.prompt.slice(0,180)}`);
    const transcriptionResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method:'POST', headers:{ Authorization:`Bearer ${serverEnv.GROQ_API_KEY}` }, body:groqForm });
    const transcription = (await transcriptionResponse.json()) as { text?:string; error?:{message?:string} };
    if (!transcriptionResponse.ok) throw new Error(transcription.error?.message ?? 'Speech transcription failed.');
    const transcript = transcription.text?.trim() ?? '';
    if (transcript.split(/\s+/).filter(Boolean).length < 3) return Response.json({ message: 'We could not hear enough English. Record again in a quieter place.' }, { status: 422 });
    const feedback = await evaluateSpeaking({ prompt:coach.prompt,task:coach.task,transcript,targetPhrases:coach.targetPhrases,level:conversation.level,durationSeconds });
    const minutes = Math.max(1, Math.ceil(durationSeconds / 60));
    const progressDate = new Date().toISOString().slice(0,10);
    await db.update(conversations).set({
      transcript:[...conversation.transcript,{role:'learner',content:transcript}],durationSeconds,
      grammarScore:feedback.grammarScore,vocabularyScore:feedback.vocabularyScore,fluencyScore:feedback.fluencyScore,feedback,
    }).where(eq(conversations.id,conversation.id));
    await Promise.all([
      db.insert(learningActivityEvents).values({userId:session.user.id,skillType:'speaking',activityType:'ai-speaking-practice',entityId:conversation.id,durationSeconds,score:feedback.overallScore,metadata:{grammarScore:feedback.grammarScore,vocabularyScore:feedback.vocabularyScore,fluencyScore:feedback.fluencyScore,relevanceScore:feedback.relevanceScore}}),
      db.insert(userProgress).values({userId:session.user.id,progressDate,learningMinutes:minutes,speakingMinutes:minutes,speakingScore:feedback.overallScore}).onConflictDoUpdate({target:[userProgress.userId,userProgress.progressDate],set:{learningMinutes:sql`${userProgress.learningMinutes} + ${minutes}`,speakingMinutes:sql`${userProgress.speakingMinutes} + ${minutes}`,speakingScore:feedback.overallScore,updatedAt:new Date()}}),
    ]);
    return Response.json({ transcript, durationSeconds, ...feedback });
  } catch (error) {
    return Response.json({ message:error instanceof Error?error.message:'Could not evaluate this recording.' }, { status:503 });
  }
}