import { loginSchema } from '@english-coach/validation';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { authClient } from '@/lib/auth-client';

import {
  AuthShell,
  AuthTitle,
  ErrorNotice,
  FormField,
  PrimaryButton,
} from './auth-ui';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details.');
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.signIn.email(parsed.data);
      if (result.error) {
        setError(result.error.message ?? 'Unable to sign in.');
        return;
      }
      const session = await authClient.getSession();
      if (session.error || !session.data) {
        setError('Signed in, but the session could not be loaded. Please try once more.');
        return;
      }
      router.dismissAll();
      router.replace('/(tabs)');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <AuthTitle
        title="Welcome back"
        subtitle="Sign in and continue your learning journey."
      />
      <ErrorNotice message={error} />
      <FormField
        autoCapitalize="none"
        autoComplete="email"
        icon="mail-outline"
        inputMode="email"
        label="Email address"
        onChangeText={setEmail}
        placeholder="you@example.com"
        value={email}
      />
      <FormField
        autoComplete="current-password"
        icon="lock-closed-outline"
        label="Password"
        onChangeText={setPassword}
        placeholder="Enter your password"
        secureTextEntry
        value={password}
      />
      <Link href="/(auth)/forgot-password" asChild>
        <Pressable className="mb-2 self-end px-1 py-2">
          <Text className="font-semibold text-[#146ef5]">Forgot password?</Text>
        </Pressable>
      </Link>
      <PrimaryButton busy={busy} label="Sign in" onPress={submit} />
      <View className="mt-6 flex-row justify-center">
        <Text className="text-[#6b7b91]">New to English Coach? </Text>
        <Link href="/(auth)/signup" asChild>
          <Pressable>
            <Text className="font-bold text-[#146ef5]">Create account</Text>
          </Pressable>
        </Link>
      </View>
    </AuthShell>
  );
}
