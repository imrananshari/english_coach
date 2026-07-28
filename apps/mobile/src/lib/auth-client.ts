import { expoClient } from '@better-auth/expo/client';
import type { BetterAuthClientPlugin } from 'better-auth';
import {
  emailOTPClient,
  inferAdditionalFields,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { API_BASE_URL } from './api-client';

const secureExpoClient = expoClient({
  scheme: 'englishcoach',
  storagePrefix: 'english-coach',
  storage: SecureStore,
}) as unknown as ReturnType<typeof expoClient> & BetterAuthClientPlugin;

export const authClient = createAuthClient({
  baseURL: API_BASE_URL || 'http://localhost:3000',
  fetchOptions: { credentials: 'include' },
  plugins: [
    inferAdditionalFields({
      user: { age: { type: 'number', required: true, input: true } },
    }),
    emailOTPClient(),
    secureExpoClient,
  ],
});

export function getAuthenticatedHeaders(): HeadersInit {
  if (Platform.OS === 'web') return {};
  const cookie = authClient.getCookie();
  return cookie ? { cookie } : {};
}

export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    age: number;
  };
}

export function useAuthSession(): {
  data: AuthSession | null;
  isPending: boolean;
} {
  const session = authClient.useSession();
  return {
    data: session.data as unknown as AuthSession | null,
    isPending: session.isPending,
  };
}
