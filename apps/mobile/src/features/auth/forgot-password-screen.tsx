import { passwordSchema } from '@english-coach/validation';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { authClient } from '@/lib/auth-client';

import {
  AuthShell,
  AuthTitle,
  ErrorNotice,
  FormField,
  PrimaryButton,
} from './auth-ui';

export function ForgotPasswordScreen() {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setError(null);
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: 'forget-password',
      });
      if (result.error) {
        setError(result.error.message ?? 'Unable to send code.');
        return;
      }
      setStep('reset');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send code.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    setError(null);
    const checkedPassword = passwordSchema.safeParse(password);
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    if (!checkedPassword.success) {
      setError(checkedPassword.error.issues[0]?.message ?? 'Invalid password.');
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.emailOtp.resetPassword({
        email: email.trim(),
        otp,
        password,
      });
      if (result.error) {
        setError(result.error.message ?? 'Unable to reset password.');
        return;
      }
      router.replace('/(auth)/login');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to reset password.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <AuthTitle
        title={
          step === 'request' ? 'Forgot password?' : 'Create a new password'
        }
        subtitle={
          step === 'request'
            ? 'Enter your email and we will send you a secure code.'
            : `Enter the code sent to ${email.trim()}.`
        }
      />
      <ErrorNotice message={error} />
      {step === 'request' ? (
        <FormField
          autoCapitalize="none"
          icon="mail-outline"
          inputMode="email"
          label="Email address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          value={email}
        />
      ) : (
        <>
          <FormField
            icon="keypad-outline"
            inputMode="numeric"
            label="Reset code"
            maxLength={6}
            onChangeText={(value) => setOtp(value.replace(/\D/g, ''))}
            placeholder="000000"
            textAlign="center"
            value={otp}
          />
          <FormField
            autoComplete="new-password"
            icon="lock-closed-outline"
            label="New password"
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            value={password}
          />
        </>
      )}
      <PrimaryButton
        busy={busy}
        label={step === 'request' ? 'Send reset code' : 'Reset password'}
        onPress={step === 'request' ? sendCode : resetPassword}
      />
      <Link href="/(auth)/login" asChild>
        <Pressable className="mt-5 items-center py-2">
          <Text className="font-semibold text-[#146ef5]">Back to sign in</Text>
        </Pressable>
      </Link>
    </AuthShell>
  );
}
