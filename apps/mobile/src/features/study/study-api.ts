import type * as Ably from 'ably';

import { apiClient } from '@/lib/api-client';
import { getAuthenticatedHeaders } from '@/lib/auth-client';

export interface StudyRoomSummary { id: string; code: string; title: string; description: string | null; visibility: string; status: string; maxMembers: number; memberCount: number; isMember: boolean; host: { id: string; name: string; image: string | null } | null; }
export interface StudyMessage { id: string; userId: string; message: string; name: string; image: string | null; createdAt: string; pending?: boolean; failed?: boolean; }
export interface StudyActivity {
  id: string; activityType: 'grammar' | 'vocabulary' | 'discussion'; title: string;
  content: {
    kind?: string; sourceId?: string; level?: string; category?: string; summary?: string; explanation?: string;
    structures?: string[]; rules?: Array<{ title: string; description: string }>; exceptions?: string[]; tips?: string[];
    keyVocabulary?: Array<{ term: string; meaning: string }>; examples?: string[]; prompt?: string; instruction?: string; aiGenerated?: boolean;
    words?: Array<{ id: string; word: string; meaning: string; hindiMeaning: string; partOfSpeech?: string | null; pronunciation?: string | null; example: string | null; officeExample?: string | null; synonyms?: string[] | null; phrasePatterns?: string[] | null }>;
    question?: { question: string; options: string[] };
  };
  status: string; startedAt: string; answerCount: number; myAnswer: { score: number } | null;
}
export interface StudyRoomDetail { room: StudyRoomSummary & { hostUserId: string }; membership: { role: 'host' | 'member' }; members: Array<{ userId: string; role: string; name: string; image: string | null }>; messages: StudyMessage[]; activity: StudyActivity | null; }
export interface StudyCatalog {
  grammar: Array<{ id: string; title: string; summary: string; category: string; level: string; estimatedMinutes: number }>;
  vocabulary: Array<{ category: string; level: string; count: number }>;
  discussions: Array<{ id: string; title: string; description: string | null; category: string; level: string }>;
}
export interface StartActivityInput { activityType: StudyActivity['activityType']; sourceId?: string; category?: string; level?: string; }

const headers = () => ({ headers: getAuthenticatedHeaders() });
export const studyRoomsQueryKey = ['study-rooms'] as const;
export const studyCatalogQueryKey = ['study-catalog'] as const;
export const studyRoomQueryKey = (roomId: string) => ['study-room', roomId] as const;
export const fetchStudyRooms = () => apiClient.get<{ rooms: StudyRoomSummary[] }>('/api/study/rooms', headers());
export const fetchStudyCatalog = () => apiClient.get<StudyCatalog>('/api/study/catalog', headers());
export const createStudyRoom = (input: { title: string; description?: string; visibility: 'public' | 'private' }) => apiClient.post<{ room: StudyRoomSummary }>('/api/study/rooms', { action: 'create', ...input }, headers());
export const joinStudyRoom = (input: { roomId?: string; code?: string }) => apiClient.post<{ room: StudyRoomSummary }>('/api/study/rooms', { action: 'join', ...input }, headers());
export const fetchStudyRoom = (roomId: string) => apiClient.get<StudyRoomDetail>(`/api/study/rooms/${roomId}`, headers());
export const fetchStudyToken = (roomId: string) => apiClient.post<Ably.TokenRequest>('/api/study/token', { roomId }, headers());
export const sendStudyMessage = (roomId: string, message: string) => apiClient.post<{ message: StudyMessage }>(`/api/study/rooms/${roomId}/messages`, { message }, headers());
export const startStudyActivity = (roomId: string, input: StartActivityInput) => apiClient.post<{ activity: StudyActivity }>(`/api/study/rooms/${roomId}/activity`, { action: 'start', ...input }, { ...headers(), timeoutMs: 30_000 });
export const submitStudyAnswer = (roomId: string, activityId: string, answer: number | string) => apiClient.post<{ isCorrect: boolean; score: number; explanation: string }>(`/api/study/rooms/${roomId}/activity`, { action: 'submit', activityId, answer }, headers());
export const endStudyActivity = (roomId: string, activityId: string) => apiClient.post<{ ended: true }>(`/api/study/rooms/${roomId}/activity`, { action: 'end', activityId }, headers());
export const updateStudyRoom = (roomId: string, action: 'leave' | 'close') => apiClient.patch<{ left?: true; closed?: true }>(`/api/study/rooms/${roomId}`, { action }, headers());