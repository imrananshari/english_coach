import { db, grammarTopics, learningActivityEvents } from '@english-coach/database';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { serverEnv } from '@/lib/env';

export const runtime = 'nodejs';

const askSchema = z.object({ topicId: z.string().uuid(), question: z.string().trim().min(3).max(600) });
interface GroqBody { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  const parsed = askSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: 'Write a clear grammar question.' }, { status: 400 });
  if (!serverEnv.GROQ_API_KEY) return Response.json({ message: 'GROQ_API_KEY is not configured.' }, { status: 503 });

  const [topic] = await db.select().from(grammarTopics).where(and(eq(grammarTopics.id, parsed.data.topicId), eq(grammarTopics.status, 'published'))).limit(1);
  if (!topic) return Response.json({ message: 'Grammar topic not found.' }, { status: 404 });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(20_000),
      headers: { Authorization: `Bearer ${serverEnv.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: serverEnv.GROQ_TEXT_MODEL, temperature: 0.35, max_completion_tokens: 1400,
        messages: [
          { role: 'system', content: 'You are a patient senior English grammar teacher for an adult Hindi-speaking learner. Solve the learner question directly. Then give: the rule in simple English, a short natural Hindi/Hinglish explanation, two practical examples (daily life and office/meeting), the most relevant exception, one wrong-vs-correct correction, one memory tip, and two short practice tasks with answers hidden below a clear Answer label. Adapt to the lesson level and never invent a grammar rule.' },
          { role: 'user', content: `Lesson: ${topic.title}\nSummary: ${topic.summary}\nStructures: ${topic.structures.join(' | ')}\nRules: ${topic.rules.map((rule) => rule.description).join(' ')}\nExceptions: ${topic.exceptions.join(' ')}\nCommon mistakes: ${topic.commonMistakes.join(' ')}\nLearner question: ${parsed.data.question}` },
        ],
      }),
    });
    const body = await response.json() as GroqBody;
    if (!response.ok) return Response.json({ message: response.status === 429 ? 'The free AI teacher is busy. Please wait briefly and ask again.' : body.error?.message ?? 'AI teacher is unavailable.' }, { status: response.status === 429 ? 429 : 503 });
    const answer = body.choices?.[0]?.message?.content?.trim();
    if (!answer) return Response.json({ message: 'AI teacher returned an empty answer.' }, { status: 503 });
    await db.insert(learningActivityEvents).values({ userId: session.user.id, skillType: 'grammar', activityType: 'grammar-ai-doubt', entityId: topic.id, durationSeconds: 60, metadata: { topic: topic.slug } });
    return Response.json({ answer });
  } catch {
    return Response.json({ message: 'AI teacher could not be reached. Please try again.' }, { status: 503 });
  }
}