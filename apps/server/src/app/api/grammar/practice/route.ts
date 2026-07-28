import { db, grammarPracticeSessions, grammarTopics, learningActivityEvents, userGrammarProgress, userProgress } from '@english-coach/database';
import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { generateGrammarPractice } from '@/lib/grammar-practice-generator';

export const runtime = 'nodejs';

const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('generate'), topicId: z.string().uuid() }),
  z.object({ action: z.literal('submit'), sessionId: z.string().uuid(), answers: z.record(z.string(), z.number().int().min(0).max(3)) }),
]);

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: 'Invalid grammar practice request.' }, { status: 400 });

  const data = parsed.data;
  if (data.action === 'generate') {
    const [topic] = await db.select().from(grammarTopics).where(and(eq(grammarTopics.id, data.topicId), eq(grammarTopics.status, 'published'))).limit(1);
    if (!topic) return Response.json({ message: 'Grammar topic not found.' }, { status: 404 });
    const recent = await db.select({ questions: grammarPracticeSessions.questions }).from(grammarPracticeSessions)
      .where(and(eq(grammarPracticeSessions.userId, session.user.id), eq(grammarPracticeSessions.grammarTopicId, topic.id)))
      .orderBy(desc(grammarPracticeSessions.createdAt)).limit(3);
    try {
      const generated = await generateGrammarPractice({
        title: topic.title, level: topic.level, summary: topic.summary, structures: topic.structures, rules: topic.rules,
        previousPrompts: recent.flatMap((item) => item.questions.map((question) => question.question)),
      });
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const [created] = await db.insert(grammarPracticeSessions).values({
        userId: session.user.id, grammarTopicId: topic.id, examples: generated.examples, questions: generated.questions, expiresAt,
      }).returning();
      if (!created) throw new Error('Could not save the generated practice set.');
      return Response.json({
        sessionId: created.id, examples: created.examples,
        questions: created.questions.map(({ answer: _answer, explanation: _explanation, ...question }) => question),
        expiresAt: created.expiresAt,
      });
    } catch (error) {
      return Response.json({ message: error instanceof Error ? error.message : 'Could not generate grammar practice.' }, { status: 503 });
    }
  }

  const [practice] = await db.select().from(grammarPracticeSessions).where(and(
    eq(grammarPracticeSessions.id, data.sessionId), eq(grammarPracticeSessions.userId, session.user.id),
    eq(grammarPracticeSessions.status, 'in-progress'), gt(grammarPracticeSessions.expiresAt, new Date()),
  )).limit(1);
  if (!practice) return Response.json({ message: 'This practice set is completed or expired. Generate a new one.' }, { status: 409 });
  const answeredAll = practice.questions.every((question) => data.answers[question.id] !== undefined);
  if (!answeredAll) return Response.json({ message: 'Please answer every question.' }, { status: 400 });

  const correct = practice.questions.filter((question) => data.answers[question.id] === question.answer).length;
  const score = Math.round((correct / practice.questions.length) * 100);
  const review = practice.questions.map((question) => ({
    questionId: question.id, selectedIndex: data.answers[question.id], correctIndex: question.answer,
    isCorrect: data.answers[question.id] === question.answer, explanation: question.explanation,
  }));
  const [existing] = await db.select().from(userGrammarProgress).where(and(
    eq(userGrammarProgress.userId, session.user.id), eq(userGrammarProgress.grammarTopicId, practice.grammarTopicId),
  )).limit(1);
  const progressValues = {
    status: (existing?.status === 'completed' ? 'completed' : 'in-progress') as 'completed' | 'in-progress',
    completionPercentage: Math.max(existing?.completionPercentage ?? 0, score),
    bestScore: Math.max(existing?.bestScore ?? 0, score), attempts: (existing?.attempts ?? 0) + 1, updatedAt: new Date(),
  };
  const progressDate = new Date().toISOString().slice(0, 10);

  const [claimed] = await db.update(grammarPracticeSessions).set({ status: 'completed', score, updatedAt: new Date() })
    .where(and(eq(grammarPracticeSessions.id, practice.id), eq(grammarPracticeSessions.status, 'in-progress'))).returning({ id: grammarPracticeSessions.id });
  if (!claimed) return Response.json({ message: 'This practice set was already submitted.' }, { status: 409 });
  if (existing) await db.update(userGrammarProgress).set(progressValues).where(eq(userGrammarProgress.id, existing.id));
  else await db.insert(userGrammarProgress).values({ userId: session.user.id, grammarTopicId: practice.grammarTopicId, ...progressValues });
  await Promise.all([
    db.insert(learningActivityEvents).values({
      userId: session.user.id, skillType: 'grammar', activityType: 'grammar-ai-practice', entityId: practice.grammarTopicId,
      durationSeconds: 300, score, metadata: { sessionId: practice.id, correct, total: practice.questions.length },
    }),
    db.insert(userProgress).values({ userId: session.user.id, progressDate, learningMinutes: 5, grammarScore: score })
      .onConflictDoUpdate({ target: [userProgress.userId, userProgress.progressDate], set: {
        learningMinutes: sql`${userProgress.learningMinutes} + 5`, grammarScore: score, updatedAt: new Date(),
      } }),
  ]);

  return Response.json({ score, correct, total: practice.questions.length, review, progress: progressValues });
}