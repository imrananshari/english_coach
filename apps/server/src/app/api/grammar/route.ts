import { db, grammarTopics, learningActivityEvents, userGrammarProgress, userProgress } from '@english-coach/database';
import { and, asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { auth } from '@/lib/auth';

export const runtime = 'nodejs';

const progressSchema = z.object({
  topicId: z.string().uuid(),
  action: z.enum(['complete', 'practice']),
  score: z.number().int().min(0).max(100).optional(),
});

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });

  const [topics, progress] = await Promise.all([
    db.select().from(grammarTopics).where(eq(grammarTopics.status, 'published')).orderBy(asc(grammarTopics.sequenceNumber)),
    db.select().from(userGrammarProgress).where(eq(userGrammarProgress.userId, session.user.id)),
  ]);
  const progressByTopic = new Map(progress.map((item) => [item.grammarTopicId, item]));
  const result = topics.map((topic) => {
    const item = progressByTopic.get(topic.id);
    return {
      ...topic,
      progress: item ? { status: item.status, completionPercentage: item.completionPercentage, bestScore: item.bestScore, attempts: item.attempts } : null,
    };
  });
  const completed = progress.filter((item) => item.status === 'completed').length;

  return Response.json({
    topics: result,
    categories: [...new Set(topics.map((topic) => topic.category))],
    stats: {
      total: topics.length,
      completed,
      inProgress: progress.filter((item) => item.status === 'in-progress').length,
      averageScore: progress.filter((item) => item.bestScore !== null).length
        ? Math.round(progress.reduce((sum, item) => sum + (item.bestScore ?? 0), 0) / progress.filter((item) => item.bestScore !== null).length)
        : 0,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  const parsed = progressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: 'Invalid grammar progress.' }, { status: 400 });

  const [[topic], [existing]] = await Promise.all([
    db.select().from(grammarTopics).where(and(eq(grammarTopics.id, parsed.data.topicId), eq(grammarTopics.status, 'published'))).limit(1),
    db.select().from(userGrammarProgress).where(and(eq(userGrammarProgress.userId, session.user.id), eq(userGrammarProgress.grammarTopicId, parsed.data.topicId))).limit(1),
  ]);
  if (!topic) return Response.json({ message: 'Grammar topic not found.' }, { status: 404 });

  const newlyCompleted = parsed.data.action === 'complete' && existing?.status !== 'completed';
  const nextScore = parsed.data.score === undefined ? existing?.bestScore ?? null : Math.max(existing?.bestScore ?? 0, parsed.data.score);
  const values = {
    status: (parsed.data.action === 'complete' ? 'completed' : existing?.status ?? 'in-progress') as 'completed' | 'in-progress',
    completionPercentage: parsed.data.action === 'complete' ? 100 : Math.max(existing?.completionPercentage ?? 0, parsed.data.score ?? 0),
    bestScore: nextScore,
    attempts: (existing?.attempts ?? 0) + (parsed.data.action === 'practice' ? 1 : 0),
    completedAt: parsed.data.action === 'complete' ? existing?.completedAt ?? new Date() : existing?.completedAt ?? null,
    updatedAt: new Date(),
  };

  if (existing) await db.update(userGrammarProgress).set(values).where(eq(userGrammarProgress.id, existing.id));
  else await db.insert(userGrammarProgress).values({ userId: session.user.id, grammarTopicId: topic.id, ...values });

  const progressDate = new Date().toISOString().slice(0, 10);
  const addedMinutes = newlyCompleted ? topic.estimatedMinutes : parsed.data.action === 'practice' ? 2 : 0;
  await Promise.all([
    db.insert(learningActivityEvents).values({
      userId: session.user.id, skillType: 'grammar', activityType: parsed.data.action === 'complete' ? 'grammar-topic-completed' : 'grammar-practice',
      entityId: topic.id, durationSeconds: addedMinutes * 60, score: parsed.data.score, metadata: { topic: topic.slug },
    }),
    db.insert(userProgress).values({
      userId: session.user.id, progressDate, learningMinutes: addedMinutes, lessonsCompleted: newlyCompleted ? 1 : 0, grammarScore: parsed.data.score,
    }).onConflictDoUpdate({
      target: [userProgress.userId, userProgress.progressDate],
      set: {
        learningMinutes: sql`${userProgress.learningMinutes} + ${addedMinutes}`,
        lessonsCompleted: sql`${userProgress.lessonsCompleted} + ${newlyCompleted ? 1 : 0}`,
        grammarScore: parsed.data.score ?? userProgress.grammarScore,
        updatedAt: new Date(),
      },
    }),
  ]);

  return Response.json({ progress: values });
}