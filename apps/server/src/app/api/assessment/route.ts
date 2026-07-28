import {
  assessmentSessions,
  db,
  userAssessments,
  userProfiles,
} from '@english-coach/database';
import { and, desc, eq, gt } from 'drizzle-orm';
import { z } from 'zod';

import { auth } from '@/lib/auth';

export const runtime = 'nodejs';

type AssessmentSkill = 'grammar' | 'vocabulary' | 'workplace' | 'listening';
type EnglishLevel =
  | 'beginner'
  | 'elementary'
  | 'intermediate'
  | 'upper-intermediate'
  | 'advanced';

const submissionSchema = z.object({
  sessionId: z.string().uuid(),
  answers: z.record(z.string(), z.string()),
  writingSample: z.string().trim().min(20).max(1000),
});

function scoreWriting(sample: string): number {
  const words = sample.split(/\s+/).filter(Boolean);
  let score = 20;
  if (sample.length >= 80) score += 20;
  if (sample.length >= 140) score += 15;
  if (words.length >= 25) score += 20;
  if (
    /\b(please|thank|regards|update|meeting|project|available)\b/i.test(sample)
  )
    score += 15;
  if (/^[A-Z]/.test(sample) && /[.!?]$/.test(sample)) score += 10;
  return Math.min(score, 100);
}

function assignedLevel(score: number): EnglishLevel {
  if (score >= 85) return 'advanced';
  if (score >= 70) return 'upper-intermediate';
  if (score >= 55) return 'intermediate';
  if (score >= 40) return 'elementary';
  return 'beginner';
}

function resultView(assessment: typeof userAssessments.$inferSelect) {
  return {
    id: assessment.id,
    grammarScore: assessment.grammarScore,
    vocabularyScore: assessment.vocabularyScore,
    speakingScore: assessment.speakingScore,
    listeningScore: assessment.listeningScore,
    writingScore: assessment.writingScore,
    assignedLevel: assessment.assignedLevel,
    completedAt: assessment.completedAt,
    overallScore:
      typeof assessment.answers?.overallScore === 'number'
        ? assessment.answers.overallScore
        : null,
    workplaceScore:
      typeof assessment.answers?.workplaceScore === 'number'
        ? assessment.answers.workplaceScore
        : null,
    review: Array.isArray(assessment.answers?.review)
      ? assessment.answers.review
      : [],
    recommendations: Array.isArray(assessment.answers?.recommendations)
      ? assessment.answers.recommendations
      : [],
    teacherFeedback:
      typeof assessment.answers?.teacherFeedback === 'string'
        ? assessment.answers.teacherFeedback
        : null,
    writingFeedback:
      typeof assessment.answers?.writingFeedback === 'string'
        ? assessment.answers.writingFeedback
        : null,
  };
}

async function getUser(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export async function GET(request: Request) {
  const session = await getUser(request);
  if (!session)
    return Response.json({ message: 'Unauthorized.' }, { status: 401 });

  const assessmentHistory = await db
    .select()
    .from(userAssessments)
    .where(eq(userAssessments.userId, session.user.id))
    .orderBy(desc(userAssessments.completedAt))
    .limit(10);
  const latest = assessmentHistory[0];
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.user.id))
    .limit(1);

  return Response.json({
    result: latest ? resultView(latest) : null,
    history: assessmentHistory.map(resultView),
    profile: profile ?? null,
  });
}

export async function POST(request: Request) {
  const authSession = await getUser(request);
  if (!authSession)
    return Response.json({ message: 'Unauthorized.' }, { status: 401 });

  const parsed = submissionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid assessment.' },
      { status: 400 },
    );
  }

  const [assessmentSession] = await db
    .select()
    .from(assessmentSessions)
    .where(
      and(
        eq(assessmentSessions.id, parsed.data.sessionId),
        eq(assessmentSessions.userId, authSession.user.id),
        eq(assessmentSessions.status, 'in-progress'),
        gt(assessmentSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!assessmentSession) {
    return Response.json(
      { message: 'This assessment session expired. Start a fresh assessment.' },
      { status: 410 },
    );
  }

  const questions = assessmentSession.questions;
  const skillTotals: Record<AssessmentSkill, number> = {
    grammar: 0,
    vocabulary: 0,
    workplace: 0,
    listening: 0,
  };
  const skillCorrect: Record<AssessmentSkill, number> = {
    grammar: 0,
    vocabulary: 0,
    workplace: 0,
    listening: 0,
  };

  for (const question of questions) {
    skillTotals[question.skill] += 1;
    if (parsed.data.answers[question.id] === question.answer)
      skillCorrect[question.skill] += 1;
  }

  const percent = (skill: AssessmentSkill) =>
    Math.round((skillCorrect[skill] / skillTotals[skill]) * 100);
  const grammarScore = percent('grammar');
  const vocabularyScore = percent('vocabulary');
  const listeningScore = percent('listening');
  const workplaceScore = percent('workplace');
  const writingScore = scoreWriting(parsed.data.writingSample);
  const objectiveScore = Math.round(
    (Object.values(skillCorrect).reduce((sum, value) => sum + value, 0) /
      questions.length) *
      100,
  );
  const overallScore = Math.round(objectiveScore * 0.85 + writingScore * 0.15);
  const level = assignedLevel(overallScore);

  const review = questions.map((question) => {
    const selectedId = parsed.data.answers[question.id];
    const selectedText =
      question.options.find((option) => option.id === selectedId)?.text ??
      'No answer';
    const correctText =
      question.options.find((option) => option.id === question.answer)?.text ??
      question.answer;
    return {
      questionId: question.id,
      skill: question.skill,
      prompt: question.prompt,
      selectedText,
      correctText,
      isCorrect: selectedId === question.answer,
      explanation: question.explanation,
    };
  });
  const mistakeCounts = review
    .filter((item) => !item.isCorrect)
    .reduce<Record<AssessmentSkill, number>>(
      (counts, item) => ({
        ...counts,
        [item.skill]: counts[item.skill] + 1,
      }),
      { grammar: 0, vocabulary: 0, workplace: 0, listening: 0 },
    );
  const focusCopy: Record<AssessmentSkill, { title: string; reason: string }> = {
    grammar: {
      title: 'Review grammar patterns',
      reason: 'Practice verb forms, sentence structure, and tense choices.',
    },
    vocabulary: {
      title: 'Build active vocabulary',
      reason: 'Review meanings in practical sentences and spaced repetition.',
    },
    workplace: {
      title: 'Practice professional communication',
      reason: 'Focus on clear, polite phrases for common workplace situations.',
    },
    listening: {
      title: 'Strengthen listening comprehension',
      reason: 'Replay short English messages and identify the key action or detail.',
    },
  };
  const recommendations = (Object.keys(mistakeCounts) as AssessmentSkill[])
    .filter((skill) => mistakeCounts[skill] > 0)
    .sort((a, b) => mistakeCounts[b] - mistakeCounts[a])
    .map((skill) => ({
      skill,
      ...focusCopy[skill],
      mistakes: mistakeCounts[skill],
    }));
  const totalMistakes = review.filter((item) => !item.isCorrect).length;
  const primaryFocus = recommendations[0]?.skill;
  const teacherFeedback = totalMistakes
    ? `You made ${totalMistakes} objective ${totalMistakes === 1 ? 'mistake' : 'mistakes'}. Focus first on ${primaryFocus ?? 'the reviewed topics'}, then use the explanations below to understand each correction.`
    : 'Excellent objective result. Keep progressing with more advanced questions and practical speaking tasks.';
  const writingFeedback =
    writingScore >= 80
      ? 'Your message is clear and professional. Continue improving precision and variety.'
      : writingScore >= 55
        ? 'Your message communicates the idea. Add a clear delivery time, polite wording, and complete punctuation.'
        : 'Practice a simple professional structure: greeting, reason, revised deadline, apology, and closing.';

  const [assessment] = await db
    .insert(userAssessments)
    .values({
      userId: authSession.user.id,
      grammarScore,
      vocabularyScore,
      listeningScore,
      writingScore,
      speakingScore: null,
      assignedLevel: level,
      answers: {
        sessionId: assessmentSession.id,
        responses: parsed.data.answers,
        writingSample: parsed.data.writingSample,
        workplaceScore,
        overallScore,
        review,
        recommendations,
        teacherFeedback,
        writingFeedback,
      },
    })
    .returning();

  await db
    .update(assessmentSessions)
    .set({ status: 'completed', updatedAt: new Date() })
    .where(eq(assessmentSessions.id, assessmentSession.id));

  await db
    .insert(userProfiles)
    .values({
      userId: authSession.user.id,
      currentLevel: level,
      selectedGoal: assessmentSession.selectedGoal,
      dailyLearningMinutes: assessmentSession.dailyLearningMinutes,
      onboardingCompleted: true,
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        currentLevel: level,
        selectedGoal: assessmentSession.selectedGoal,
        dailyLearningMinutes: assessmentSession.dailyLearningMinutes,
        onboardingCompleted: true,
        updatedAt: new Date(),
      },
    });

  if (!assessment)
    return Response.json(
      { message: 'Assessment could not be saved.' },
      { status: 500 },
    );
  return Response.json({
    result: resultView(assessment),
    overallScore,
    workplaceScore,
  });
}
