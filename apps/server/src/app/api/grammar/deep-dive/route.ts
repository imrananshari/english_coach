import { db, grammarTopics, learningActivityEvents } from '@english-coach/database';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { publishGrammarEvent } from '@/lib/ably';
import { auth } from '@/lib/auth';
import { generateGrammarDeepDive } from '@/lib/grammar-deep-dive-generator';

export const runtime = 'nodejs';

const requestSchema = z.object({ topicId: z.string().uuid() });

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: 'Choose a valid grammar lesson.' }, { status: 400 });

  const [topic] = await db.select().from(grammarTopics).where(and(
    eq(grammarTopics.id, parsed.data.topicId),
    eq(grammarTopics.status, 'published'),
  )).limit(1);
  if (!topic) return Response.json({ message: 'Grammar lesson not found.' }, { status: 404 });

  if (topic.aiDeepDive) {
    return Response.json({ deepDive: topic.aiDeepDive, cached: true });
  }

  try {
    const deepDive = await generateGrammarDeepDive({
      title: topic.title,
      category: topic.category,
      level: topic.level,
      summary: topic.summary,
      structures: topic.structures,
      rules: topic.rules,
      examples: topic.examples,
      exceptions: topic.exceptions,
      mistakes: topic.commonMistakes,
    });
    await db.update(grammarTopics).set({ aiDeepDive: deepDive, updatedAt: new Date() }).where(eq(grammarTopics.id, topic.id));
    await publishGrammarEvent({ topicId: topic.id, deepDive }).catch(() => undefined);
    await db.insert(learningActivityEvents).values({
      userId: session.user.id,
      skillType: 'grammar',
      activityType: 'grammar-ai-deep-dive',
      entityId: topic.id,
      durationSeconds: 180,
      metadata: { topic: topic.slug, cached: false },
    });
    return Response.json({ deepDive, cached: false });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : 'Could not create the deep learning guide.' },
      { status: 503 },
    );
  }
}
