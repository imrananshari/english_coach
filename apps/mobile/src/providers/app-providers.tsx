import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import { AppState, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/lib/query-client';

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (state) =>
      focusManager.setFocused(state === 'active'),
    );
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      {Platform.OS === 'android' ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="height" keyboardVerticalOffset={0}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </KeyboardAvoidingView>
      ) : (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )}
    </SafeAreaProvider>
  );
}
