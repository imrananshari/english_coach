import { assessmentSessions, db, grammarTopics, userProfiles, vocabulary } from '@english-coach/database';
import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';

import { generateCurriculumAssessment } from '@/lib/assessment-fallback';
import { generateAssessmentQuestions, type GeneratedAssessmentQuestion } from '@/lib/assessment-generator';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';

const sessionSchema = z.object({
  selectedGoal: z.string().trim().min(2).max(100),
  dailyLearningMinutes: z
    .number()
    .int()
    .refine((value) => [10, 15, 20, 30, 45].includes(value)),
});

function publicQuestions(
  questions: typeof assessmentSessions.$inferSelect.questions,
) {
  return questions.map((question) => ({
    id: question.id,
    skill: question.skill,
    prompt: question.prompt,
    options: question.options,
    ...(question.spokenText ? { spokenText: question.spokenText } : {}),
  }));
}

export async function POST(request: Request) {
  const authSession = await auth.api.getSession({ headers: request.headers });
  if (!authSession)
    return Response.json({ message: 'Unauthorized.' }, { status: 401 });

  const parsed = sessionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      {
        message: parsed.error.issues[0]?.message ?? 'Invalid assessment setup.',
      },
      { status: 400 },
    );
  }

  const [activeSession] = await db
    .select()
    .from(assessmentSessions)
    .where(
      and(
        eq(assessmentSessions.userId, authSession.user.id),
        eq(assessmentSessions.status, 'in-progress'),
        gt(assessmentSessions.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(assessmentSessions.createdAt))
    .limit(1);
  if (
    activeSession &&
    activeSession.selectedGoal === parsed.data.selectedGoal &&
    activeSession.dailyLearningMinutes === parsed.data.dailyLearningMinutes
  ) {
    return Response.json({
      sessionId: activeSession.id,
      questions: publicQuestions(activeSession.questions),
      expiresAt: activeSession.expiresAt,
    });
  }

  const [profile] = await db
    .select({ currentLevel: userProfiles.currentLevel })
    .from(userProfiles)
    .where(eq(userProfiles.userId, authSession.user.id))
    .limit(1);
  const previousSessions = await db
    .select({ questions: assessmentSessions.questions })
    .from(assessmentSessions)
    .where(eq(assessmentSessions.userId, authSession.user.id))
    .orderBy(desc(assessmentSessions.createdAt))
    .limit(3);
  const previousPrompts = previousSessions.flatMap((session) =>
    session.questions.map((question) => question.prompt),
  );

  let questions: GeneratedAssessmentQuestion[];
  let source: 'groq' | 'curriculum-fallback' = 'groq';
  try {
    questions = await generateAssessmentQuestions({
      currentLevel: profile?.currentLevel,
      selectedGoal: parsed.data.selectedGoal,
      previousPrompts,
    });
  } catch {
    source = 'curriculum-fallback';
    const [grammar, words] = await Promise.all([
      db
        .select({ title: grammarTopics.title, practiceQuestions: grammarTopics.practiceQuestions })
        .from(grammarTopics)
        .where(eq(grammarTopics.status, 'published'))
        .limit(80),
      db
        .select({ word: vocabulary.word, meaning: vocabulary.meaning, example: vocabulary.example })
        .from(vocabulary)
        .where(eq(vocabulary.status, 'published'))
        .orderBy(sql`random()`)
        .limit(30),
    ]);
    questions = generateCurriculumAssessment({
      grammar,
      vocabulary: words,
      selectedGoal: parsed.data.selectedGoal,
      previousPrompts,
    });
  }

  try {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const [created] = await db
      .insert(assessmentSessions)
      .values({
        userId: authSession.user.id,
        questions,
        selectedGoal: parsed.data.selectedGoal,
        dailyLearningMinutes: parsed.data.dailyLearningMinutes,
        expiresAt,
      })
      .returning();
    if (!created) throw new Error('Assessment session could not be saved.');
    return Response.json({
      sessionId: created.id,
      questions: publicQuestions(created.questions),
      expiresAt: created.expiresAt,
      source,
    });
  } catch {
    return Response.json(
      { message: 'Assessment session could not be saved. Please try again.' },
      { status: 500 },
    );
  }
}
