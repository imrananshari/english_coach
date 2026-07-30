import type * as Ably from 'ably';

import { apiClient } from '@/lib/api-client';
import { getAuthenticatedHeaders } from '@/lib/auth-client';

export type GrammarLevel = 'beginner' | 'elementary' | 'intermediate' | 'upper-intermediate' | 'advanced';
export interface GrammarTopic {
  id: string;
  title: string;
  slug: string;
  summary: string;
  explanation: string;
  category: string;
  level: GrammarLevel;
  sequenceNumber: number;
  estimatedMinutes: number;
  structures: string[];
  rules: Array<{ title: string; description: string }>;
  examples: string[];
  exceptions: string[];
  tips: string[];
  commonMistakes: string[];
  keyVocabulary: Array<{ term: string; meaning: string }>;
  practiceQuestions: Array<{ id: string; question: string; options: string[]; answer: number; explanation: string }>;
  aiDeepDive: GrammarDeepDive | null;
  progress: { status: string; completionPercentage: number; bestScore: number | null; attempts: number } | null;
}
export interface GrammarDeepDive {
  simpleEnglish: string;
  hindiExplanation: string;
  learningGoals: string[];
  whenToUse: Array<{ situation: string; explanation: string }>;
  formulaCards: Array<{ label: string; formula: string; example: string; hindi: string }>;
  guidedExamples: Array<{ english: string; hindi: string; why: string; context: string }>;
  comparisons: Array<{ left: string; right: string; difference: string; example: string }>;
  mistakes: Array<{ wrong: string; correct: string; why: string }>;
  memoryTips: string[];
  miniTasks: Array<{ id: string; type: 'choose' | 'correct' | 'translate' | 'create'; prompt: string; hint: string; modelAnswer: string; explanation: string }>;
  generatedAt: string;
}
export interface GrammarData {
  topics: GrammarTopic[];
  categories: string[];
  stats: { total: number; completed: number; inProgress: number; averageScore: number };
}
export const grammarQueryKey = ['grammar'] as const;
export function fetchGrammar(): Promise<GrammarData> {
  return apiClient.get('/api/grammar', { headers: getAuthenticatedHeaders() });
}
export function saveGrammarProgress(input: { topicId: string; action: 'complete' | 'practice'; score?: number }) {
  return apiClient.patch('/api/grammar', input, { headers: getAuthenticatedHeaders() });
}
export function askGrammarTeacher(input: { topicId: string; question: string }) {
  return apiClient.post<{ answer: string }>('/api/grammar/ask', input, { headers: getAuthenticatedHeaders(), timeoutMs: 25_000 });
}
export function fetchGrammarDeepDive(topicId: string) {
  return apiClient.post<{ deepDive: GrammarDeepDive; cached: boolean }>('/api/grammar/deep-dive', { topicId }, { headers: getAuthenticatedHeaders(), timeoutMs: 120_000 });
}
export function fetchGrammarToken() {
  return apiClient.post<Ably.TokenRequest>('/api/grammar/token', undefined, { headers: getAuthenticatedHeaders() });
}
export function grammarLevelLabel(level: GrammarLevel) {
  return level.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}
export interface GrammarAiExample {
  sentence: string;
  context: 'daily-life' | 'meeting' | 'office';
  explanation: string;
  vocabulary: Array<{ word: string; meaning: string }>;
}
export interface GrammarAiQuestion { id: string; question: string; options: string[]; }
export interface GrammarAiPractice {
  sessionId: string;
  examples: GrammarAiExample[];
  questions: GrammarAiQuestion[];
  expiresAt: string;
}
export interface GrammarAiResult {
  score: number;
  correct: number;
  total: number;
  review: Array<{ questionId: string; selectedIndex: number; correctIndex: number; isCorrect: boolean; explanation: string }>;
}
export function generateGrammarPractice(topicId: string) {
  return apiClient.post<GrammarAiPractice>('/api/grammar/practice', { action: 'generate', topicId }, { headers: getAuthenticatedHeaders(), timeoutMs: 35_000 });
}
export function submitGrammarPractice(sessionId: string, answers: Record<string, number>) {
  return apiClient.post<GrammarAiResult>('/api/grammar/practice', { action: 'submit', sessionId, answers }, { headers: getAuthenticatedHeaders(), timeoutMs: 20_000 });
}
