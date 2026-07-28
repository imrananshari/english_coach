import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/providers/app-providers';

export default function RootLayout() {
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
        <Stack.Screen name="+not-found" />
      </Stack>
    </AppProviders>
  );
}
