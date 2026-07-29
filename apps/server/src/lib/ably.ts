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