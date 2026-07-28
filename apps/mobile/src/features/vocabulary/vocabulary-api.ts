import { apiClient } from '@/lib/api-client';
import { getAuthenticatedHeaders } from '@/lib/auth-client';

export type VocabularyStatus = 'new' | 'learning' | 'difficult' | 'remembered' | 'mastered';
export type VocabularyFilter = 'all' | 'due' | 'learning' | 'remembered' | 'difficult';
export interface VocabularyWord {
  id: string;
  word: string;
  meaning: string;
  hindiMeaning: string;
  pronunciation: string | null;
  partOfSpeech: string | null;
  simpleExplanation: string | null;
  example: string | null;
  officeExample: string | null;
  register: 'formal' | 'neutral' | 'informal' | 'slang';
  phrasePatterns: string[];
  conversationExamples: string[];
  contentSource: string;
  audioUrl: string | null;
  synonyms: string[];
  antonyms: string[];
  status: VocabularyStatus;
  correctCount: number;
}
export interface VocabularyData {
  categories: string[];
  selectedCategory: string;
  level: string;
  words: VocabularyWord[];
  catalogCount: number;
  categoryCount: number;
  catalogueTarget: number;
  resultCount: number;
  activeFilter: VocabularyFilter;
  stats: { learned: number; learning: number; difficult: number; dueToday: number };
}
export const vocabularyQueryKey = (category: string, search = '', filter: VocabularyFilter = 'all') => ['vocabulary', category, search, filter] as const;
export function fetchVocabulary(category: string, search = '', filter: VocabularyFilter = 'all'): Promise<VocabularyData> {
  const query = new URLSearchParams({ category, filter, ...(search.length >= 2 ? { search } : {}) });
  return apiClient.get(`/api/vocabulary?${query}`, { headers: getAuthenticatedHeaders() });
}
export function reviewVocabulary(vocabularyId: string, action: 'learning' | 'difficult' | 'remembered') {
  return apiClient.patch<{ status: VocabularyStatus; nextReviewDate: string }>('/api/vocabulary', { vocabularyId, action }, { headers: getAuthenticatedHeaders() });
}
export function generateVocabularyPack(category: string) {
  return apiClient.post<{ added: number; total: number; message: string }>('/api/vocabulary', { category }, { headers: getAuthenticatedHeaders(), timeoutMs: 60_000 });
}
