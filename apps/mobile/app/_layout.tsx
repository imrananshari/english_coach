import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { AppProviders } from '@/providers/app-providers';

export default function RootLayout() {
  useEffect(() => {
    if (
      Platform.OS === 'web' &&
      process.env.NODE_ENV === 'production' &&
      'serviceWorker' in navigator
    ) {
      void navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  return (
    <AppProviders>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="assessment" />
        <Stack.Screen name="vocabulary" />
        <Stack.Screen name="grammar" />
        <Stack.Screen name="study" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AppProviders>
  );
}
