import { Ionicons } from '@expo/vector-icons';
import { signupSchema } from '@english-coach/validation';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { apiClient } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';

import {
  AuthShell,
  AuthTitle,
  ErrorNotice,
  FormField,
  PrimaryButton,
} from './auth-ui';

interface SelectedPhoto {
  base64: string;
  uri: string;
}

export function SignupScreen() {
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickPhoto = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.45,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setPhoto({ base64: result.assets[0].base64, uri: result.assets[0].uri });
    }
  };

  const createAccount = async () => {
    setError(null);
    const parsed = signupSchema.safeParse({ name, age, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details.');
      return;
    }
    if (!photo) {
      setError('Please choose a profile picture.');
      return;
    }
    setBusy(true);
    try {
      const upload = await apiClient.post<{ imageUrl: string }>(
        '/api/uploads/profile',
        {
          dataUrl: `data:image/jpeg;base64,${photo.base64}`,
        },
      );
      const result = await authClient.signUp.email({
        name: parsed.data.name,
        age: parsed.data.age,
        email: parsed.data.email,
        password: parsed.data.password,
        image: upload.imageUrl,
      });
      if (result.error) {
        setError(result.error.message ?? 'Unable to create your account.');
        return;
      }
      setStep('verify');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to create your account.',
      );
    } finally {
      setBusy(false);
    }
  };

  const verifyEmail = async () => {
    setError(null);
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.emailOtp.verifyEmail({
        email: email.trim(),
        otp,
      });
      if (result.error) {
        setError(result.error.message ?? 'That code is not valid.');
        return;
      }
      router.replace('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: 'email-verification',
      });
      if (result.error)
        setError(result.error.message ?? 'Unable to resend code.');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'verify') {
    return (
      <AuthShell>
        <AuthTitle
          title="Check your inbox"
          subtitle={`We sent a 6-digit code to ${email.trim()}.`}
        />
        <ErrorNotice message={error} />
        <FormField
          autoFocus
          icon="keypad-outline"
          inputMode="numeric"
          label="Verification code"
          maxLength={6}
          onChangeText={(value) => setOtp(value.replace(/\D/g, ''))}
          placeholder="000000"
          textAlign="center"
          value={otp}
        />
        <PrimaryButton
          busy={busy}
          label="Verify and continue"
          onPress={verifyEmail}
        />
        <Pressable
          className="mt-5 items-center py-2"
          disabled={busy}
          onPress={resend}
        >
          <Text className="font-semibold text-[#146ef5]">Send a new code</Text>
        </Pressable>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthTitle
        title="Create your account"
        subtitle="A few details, then you are ready to start learning."
      />
      <ErrorNotice message={error} />
      <Pressable className="mb-5 items-center" onPress={pickPhoto}>
        <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#dcecff] shadow-md shadow-blue-200">
          {photo ? (
            <Image
              source={{ uri: photo.uri }}
              contentFit="cover"
              style={{ width: 96, height: 96 }}
            />
          ) : (
            <Ionicons name="camera-outline" size={31} color="#146ef5" />
          )}
        </View>
        <Text className="mt-2 text-sm font-semibold text-[#146ef5]">
          {photo ? 'Change profile photo' : 'Add profile photo'}
        </Text>
      </Pressable>
      <FormField
        icon="person-outline"
        label="Full name"
        onChangeText={setName}
        placeholder="Your full name"
        value={name}
      />
      <FormField
        icon="calendar-outline"
        inputMode="numeric"
        label="Age"
        maxLength={3}
        onChangeText={(value) => setAge(value.replace(/\D/g, ''))}
        placeholder="Your age"
        value={age}
      />
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
        autoComplete="new-password"
        icon="lock-closed-outline"
        label="Password"
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        secureTextEntry
        value={password}
      />
      <PrimaryButton
        busy={busy}
        label="Create account"
        onPress={createAccount}
      />
      <View className="mt-6 flex-row justify-center">
        <Text className="text-[#6b7b91]">Already have an account? </Text>
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text className="font-bold text-[#146ef5]">Sign in</Text>
          </Pressable>
        </Link>
      </View>
    </AuthShell>
  );
}
