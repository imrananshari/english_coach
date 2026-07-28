import { apiClient } from '@/lib/api-client';
import { getAuthenticatedHeaders } from '@/lib/auth-client';

import type { AssessmentResult, EnglishLevel } from '../assessment/assessment-api';

export interface ProgressData {
  profile: {
    currentLevel: EnglishLevel | null;
    selectedGoal: string | null;
    dailyLearningMinutes: number;
    streak: number;
    totalXp: number;
  } | null;
  assessments: AssessmentResult[];
  dailyProgress: Array<{
    progressDate: string;
    learningMinutes: number;
    lessonsCompleted: number;
    wordsLearned: number;
    speakingMinutes: number;
    totalScore: number | null;
  }>;
  recentActivity: Array<{
    skillType: string;
    activityType: string;
    durationSeconds: number;
    score: number | null;
    occurredAt: string;
  }>;
  summary: {
    assessmentsCompleted: number;
    lessonsCompleted: number;
    totalLearningMinutes: number;
    totalWordsLearned: number;
    averageLessonScore: number;
  };
}

export const progressQueryKey = ['progress'] as const;

export function fetchProgress(): Promise<ProgressData> {
  return apiClient.get('/api/progress', {
    headers: getAuthenticatedHeaders(),
  });
}