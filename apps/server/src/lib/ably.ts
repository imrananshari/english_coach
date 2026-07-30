import * as Ably from 'ably';

import { serverEnv } from '@/lib/env';

let client: Ably.Rest | null = null;
function getClient() {
  if (!serverEnv.ABLY_API_KEY) throw new Error('Learn Together is not configured. Add ABLY_API_KEY to apps/server/.env.local.');
  client ??= new Ably.Rest({ key: serverEnv.ABLY_API_KEY });
  return client;
}
export function studyChannel(roomId: string) { return `study:${roomId}`; }
export async function createStudyToken(roomId: string, userId: string) {
  return getClient().auth.createTokenRequest({
    clientId: userId,
    ttl: 60 * 60 * 1000,
    capability: JSON.stringify({ [studyChannel(roomId)]: ['subscribe', 'presence', 'history'] }),
  });
}
export async function publishStudyEvent(roomId: string, name: string, data: unknown) {
  await getClient().channels.get(studyChannel(roomId)).publish(name, data);
}
export const vocabularyChannel = 'vocabulary:catalogue';
export async function createVocabularyToken(userId: string) {
  return getClient().auth.createTokenRequest({
    clientId: userId,
    ttl: 60 * 60 * 1000,
    capability: JSON.stringify({ [vocabularyChannel]: ['subscribe'] }),
  });
}
export async function publishVocabularyEvent(data: unknown) {
  await getClient().channels.get(vocabularyChannel).publish('vocabulary-generated', data);
}
export const grammarChannel = 'grammar:catalogue';
export async function createGrammarToken(userId: string) {
  return getClient().auth.createTokenRequest({
    clientId: userId,
    ttl: 60 * 60 * 1000,
    capability: JSON.stringify({ [grammarChannel]: ['subscribe'] }),
  });
}
export async function publishGrammarEvent(data: unknown) {
  await getClient().channels.get(grammarChannel).publish('grammar-deep-dive-ready', data);
}