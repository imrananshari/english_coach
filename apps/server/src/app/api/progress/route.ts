import {
  db,
  learningActivityEvents,
  userAssessments,
  userGrammarProgress,
  userLessonProgress,
  userProfiles,
  userProgress,
} from '@english-coach/database';
import { desc, eq } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { calculateLearningStreak } from '@/lib/streak';

export const runtime = 'nodejs';

function assessmentView(assessment: typeof userAssessments.$inferSelect) {
  return {
    id: assessment.id,
    assignedLevel: assessment.assignedLevel,
    grammarScore: assessment.grammarScore,
    vocabularyScore: assessment.vocabularyScore,
    listeningScore: assessment.listeningScore,
    writingScore: assessment.writingScore,
    speakingScore: assessment.speakingScore,
    overallScore:
      typeof assessment.answers?.overallScore === 'number'
        ? assessment.answers.overallScore
        : null,
    workplaceScore:
      typeof assessment.answers?.workplaceScore === 'number'
        ? assessment.answers.workplaceScore
        : null,
    completedAt: assessment.completedAt,
  };
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json({ message: 'Unauthorized.' }, { status: 401 });

  const [profile, assessments, dailyProgress, lessonProgress, grammarProgress, recentActivity] =
    await Promise.all([
      db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, session.user.id))
        .limit(1),
      db
        .select()
        .from(userAssessments)
        .where(eq(userAssessments.userId, session.user.id))
        .orderBy(desc(userAssessments.completedAt))
        .limit(12),
      db
        .select()
        .from(userProgress)
        .where(eq(userProgress.userId, session.user.id))
        .orderBy(desc(userProgress.progressDate)),
      db
        .select({
          status: userLessonProgress.status,
          completionPercentage: userLessonProgress.completionPercentage,
          score: userLessonProgress.score,
        })
        .from(userLessonProgress)
        .where(eq(userLessonProgress.userId, session.user.id)),
      db
        .select({
          status: userGrammarProgress.status,
          score: userGrammarProgress.bestScore,
        })
        .from(userGrammarProgress)
        .where(eq(userGrammarProgress.userId, session.user.id)),
      db
        .select({
          skillType: learningActivityEvents.skillType,
          activityType: learningActivityEvents.activityType,
          durationSeconds: learningActivityEvents.durationSeconds,
          score: learningActivityEvents.score,
          occurredAt: learningActivityEvents.occurredAt,
        })
        .from(learningActivityEvents)
        .where(eq(learningActivityEvents.userId, session.user.id))
        .orderBy(desc(learningActivityEvents.occurredAt))
        .limit(50),
    ]);

  const completedLessons = lessonProgress.filter(
    (item) => item.status === 'completed',
  );  const completedGrammar = grammarProgress.filter(
    (item) => item.status === 'completed',
  );
  const scoredLearning = [...completedLessons, ...completedGrammar].filter(
    (item) => item.score !== null,
  );
  const recordedDailyMinutes = dailyProgress.reduce(
    (sum, item) => sum + item.learningMinutes,
    0,
  );
  const activityMinutes = Math.round(
    recentActivity.reduce((sum, item) => sum + item.durationSeconds, 0) / 60,
  );
  const totalLearningMinutes = recordedDailyMinutes || activityMinutes;
  const profileData = profile[0] ?? null;
  const streak = calculateLearningStreak(dailyProgress, profileData?.dailyLearningMinutes ?? 15);
  if (profileData && (profileData.streak !== streak.currentStreak || profileData.longestStreak !== streak.longestStreak)) {
    await db.update(userProfiles).set({ streak: streak.currentStreak, longestStreak: streak.longestStreak, updatedAt: new Date() }).where(eq(userProfiles.userId, session.user.id));
  }

  return Response.json({
    profile: profileData ? { ...profileData, streak: streak.currentStreak, longestStreak: streak.longestStreak } : null,
    streak,
    assessments: assessments.map(assessmentView),
    dailyProgress,
    recentActivity,
    summary: {
      assessmentsCompleted: assessments.length,
      lessonsCompleted: completedLessons.length + completedGrammar.length,
      totalLearningMinutes,
      totalWordsLearned: dailyProgress.reduce((sum, item) => sum + item.wordsLearned, 0),
      averageLessonScore: scoredLearning.length
        ? Math.round(
            scoredLearning.reduce(
              (sum, item) => sum + (item.score ?? 0),
              0,
            ) / scoredLearning.length,
          )
        : 0,
    },
  });
}