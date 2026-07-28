import { apiClient } from '@/lib/api-client';
import { getAuthenticatedHeaders } from '@/lib/auth-client';

export type EnglishLevel =
  | 'beginner'
  | 'elementary'
  | 'intermediate'
  | 'upper-intermediate'
  | 'advanced';

export interface AssessmentQuestion {
  id: string;
  skill: 'grammar' | 'vocabulary' | 'workplace' | 'listening';
  prompt: string;
  options: { id: string; text: string }[];
  spokenText?: string;
}

export interface AssessmentReviewItem {
  questionId: string;
  skill: AssessmentQuestion['skill'];
  prompt: string;
  selectedText: string;
  correctText: string;
  isCorrect: boolean;
  explanation: string;
}

export interface AssessmentRecommendation {
  skill: AssessmentQuestion['skill'];
  title: string;
  reason: string;
  mistakes: number;
}

export interface AssessmentResult {
  id: string;
  grammarScore: number | null;
  vocabularyScore: number | null;
  listeningScore: number | null;
  writingScore: number | null;
  speakingScore: number | null;
  assignedLevel: EnglishLevel;
  overallScore: number | null;
  workplaceScore: number | null;
  review: AssessmentReviewItem[];
  recommendations: AssessmentRecommendation[];
  teacherFeedback: string | null;
  writingFeedback: string | null;
  completedAt: string;
}

export interface AssessmentProfile {
  currentLevel: EnglishLevel | null;
  selectedGoal: string | null;
  dailyLearningMinutes: number;
  onboardingCompleted: boolean;
}

export interface AssessmentData {
  result: AssessmentResult | null;
  history: AssessmentResult[];
  profile: AssessmentProfile | null;
}

export interface AssessmentSession {
  sessionId: string;
  questions: AssessmentQuestion[];
  expiresAt: string;
}

export interface AssessmentSubmission {
  sessionId: string;
  answers: Record<string, string>;
  writingSample: string;
}

export const assessmentQueryKey = ['assessment'] as const;

export function fetchAssessment(): Promise<AssessmentData> {
  return apiClient.get('/api/assessment', {
    headers: getAuthenticatedHeaders(),
  });
}

export function createAssessmentSession(input: {
  selectedGoal: string;
  dailyLearningMinutes: number;
}) {
  return apiClient.post<AssessmentSession>('/api/assessment/session', input, {
    headers: getAuthenticatedHeaders(),
    timeoutMs: 45_000,
  });
}

export function submitAssessment(input: AssessmentSubmission) {
  return apiClient.post<{
    result: AssessmentResult;
    overallScore: number;
    workplaceScore: number;
  }>('/api/assessment', input, {
    headers: getAuthenticatedHeaders(),
    timeoutMs: 20_000,
  });
}

export function levelLabel(level?: EnglishLevel | null): string {
  if (!level) return 'Not assessed';
  return level
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
