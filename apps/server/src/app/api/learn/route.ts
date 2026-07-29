import { conversations, db, grammarTopics, learningActivityEvents, userGrammarProgress, userProfiles, userProgress, userVocabulary, vocabulary } from '@english-coach/database';
import { count, desc, eq } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { calculateLearningStreak } from '@/lib/streak';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  const userId = session.user.id;
  const [profileRows, historyRows, grammarTotalRows, grammarProgress, vocabularyTotalRows, vocabularyProgress, speakingRows, recent] = await Promise.all([
    db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1),
    db.select().from(userProgress).where(eq(userProgress.userId, userId)).orderBy(desc(userProgress.progressDate)),
    db.select({ value: count() }).from(grammarTopics).where(eq(grammarTopics.status, 'published')),
    db.select().from(userGrammarProgress).where(eq(userGrammarProgress.userId, userId)),
    db.select({ value: count() }).from(vocabulary).where(eq(vocabulary.status, 'published')),
    db.select().from(userVocabulary).where(eq(userVocabulary.userId, userId)),
    db.select({ value: count() }).from(conversations).where(eq(conversations.userId, userId)),
    db.select({ skillType: learningActivityEvents.skillType, activityType: learningActivityEvents.activityType, score: learningActivityEvents.score, occurredAt: learningActivityEvents.occurredAt })
      .from(learningActivityEvents).where(eq(learningActivityEvents.userId, userId)).orderBy(desc(learningActivityEvents.occurredAt)).limit(5),
  ]);
  const profile = profileRows[0];
  const dailyGoal = profile?.dailyLearningMinutes ?? 15;
  const streak = calculateLearningStreak(historyRows, dailyGoal);
  const todayProgress = historyRows.find((item) => item.progressDate === new Date().toISOString().slice(0, 10));
  if (profile && (profile.streak !== streak.currentStreak || profile.longestStreak !== streak.longestStreak)) {
    await db.update(userProfiles).set({ streak: streak.currentStreak, longestStreak: streak.longestStreak, updatedAt: new Date() }).where(eq(userProfiles.userId, userId));
  }
  const grammarTotal = grammarTotalRows[0]?.value ?? 0;
  const grammarCompleted = grammarProgress.filter((item) => item.status === 'completed').length;
  const vocabularyTotal = vocabularyTotalRows[0]?.value ?? 0;
  const remembered = vocabularyProgress.filter((item) => (['remembered', 'mastered'] as string[]).includes(item.learningStatus)).length;
  const speakingCount = speakingRows[0]?.value ?? 0;
  const goal = profile?.selectedGoal ?? 'Build confident everyday English';
  const goalText = goal.toLowerCase();
  const recommended = goalText.includes('speak') || goalText.includes('conversation') || goalText.includes('office')
    ? { skill: 'speaking', title: 'Practice a real conversation', subtitle: 'Record one answer and get personal AI feedback.' }
    : grammarCompleted <= remembered
      ? { skill: 'grammar', title: 'Continue your grammar path', subtitle: 'Learn one structured rule and complete its practice.' }
      : { skill: 'vocabulary', title: 'Review useful vocabulary', subtitle: 'Remember words through examples and conversations.' };

  return Response.json({
    profile: { level: profile?.currentLevel ?? 'beginner', goal, dailyGoal, streak: streak.currentStreak, longestStreak: streak.longestStreak },
    goal: streak,
    today: { learningMinutes: todayProgress?.learningMinutes ?? 0, lessonsCompleted: todayProgress?.lessonsCompleted ?? 0, wordsLearned: todayProgress?.wordsLearned ?? 0, speakingMinutes: todayProgress?.speakingMinutes ?? 0 },
    modules: [
      { id: 'grammar', title: 'Grammar Academy', description: 'Rules, examples, quizzes and AI practice.', completed: grammarCompleted, total: grammarTotal, color: '#18a67e' },
      { id: 'vocabulary', title: 'Vocabulary Builder', description: 'Daily, office, travel, slang and useful phrases.', completed: remembered, total: vocabularyTotal, color: '#7c5cff' },
      { id: 'speaking', title: 'Speaking Coach', description: 'Record real answers and receive AI feedback.', completed: speakingCount, total: Math.max(speakingCount + 10, 10), color: '#ef6c62' },
    ],
    recommended,
    recent,
  });
}