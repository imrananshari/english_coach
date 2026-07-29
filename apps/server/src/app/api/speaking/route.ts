import { conversationScenarios, conversations, db, userProfiles } from '@english-coach/database';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { generateSpeakingPrompt } from '@/lib/speaking-coach';

export const runtime = 'nodejs';
const generateSchema = z.object({ scenarioId: z.string().uuid() });

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  const [scenarios, recent] = await Promise.all([
    db.select().from(conversationScenarios).where(eq(conversationScenarios.status, 'published')).orderBy(conversationScenarios.category, conversationScenarios.title),
    db.select({ id: conversations.id, level: conversations.level, durationSeconds: conversations.durationSeconds, grammarScore: conversations.grammarScore, vocabularyScore: conversations.vocabularyScore, fluencyScore: conversations.fluencyScore, feedback: conversations.feedback, createdAt: conversations.createdAt })
      .from(conversations).where(and(eq(conversations.userId, session.user.id), eq(conversations.durationSeconds, 0))).orderBy(desc(conversations.createdAt)).limit(3),
  ]);
  const completed = await db.select({ id: conversations.id, level: conversations.level, durationSeconds: conversations.durationSeconds, grammarScore: conversations.grammarScore, vocabularyScore: conversations.vocabularyScore, fluencyScore: conversations.fluencyScore, feedback: conversations.feedback, createdAt: conversations.createdAt })
    .from(conversations).where(eq(conversations.userId, session.user.id)).orderBy(desc(conversations.createdAt)).limit(8);
  const completedOnly = completed.filter((item) => item.durationSeconds > 0);
  const averageScore = completedOnly.length ? Math.round(completedOnly.reduce((sum,item)=>sum+((item.feedback as {overallScore?:number}|null)?.overallScore??item.fluencyScore??0),0)/completedOnly.length) : 0;
  return Response.json({ scenarios, stats: { sessions: completedOnly.length, totalMinutes: Math.round(completedOnly.reduce((sum,item)=>sum+item.durationSeconds,0)/60), averageScore }, recent: completedOnly.slice(0,3), abandoned: recent.length });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  const parsed = generateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: 'Choose a valid speaking scenario.' }, { status: 400 });
  const [[scenario], [profile]] = await Promise.all([
    db.select().from(conversationScenarios).where(and(eq(conversationScenarios.id, parsed.data.scenarioId), eq(conversationScenarios.status, 'published'))).limit(1),
    db.select().from(userProfiles).where(eq(userProfiles.userId, session.user.id)).limit(1),
  ]);
  if (!scenario) return Response.json({ message: 'Speaking scenario not found.' }, { status: 404 });
  try {
    const level = profile?.currentLevel ?? scenario.level;
    const generated = await generateSpeakingPrompt({ title: scenario.title, description: scenario.description, systemPrompt: scenario.systemPrompt, level, goal: profile?.selectedGoal ?? 'Confident spoken English' });
    const [created] = await db.insert(conversations).values({
      userId: session.user.id, scenarioId: scenario.id, level,
      transcript: [{ role: 'coach', ...generated, scenarioTitle: scenario.title }],
    }).returning({ id: conversations.id });
    if (!created) throw new Error('Could not save the speaking session.');
    return Response.json({ sessionId: created.id, scenario: { id: scenario.id, title: scenario.title, category: scenario.category }, ...generated });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : 'Could not create speaking practice.' }, { status: 503 });
  }
}