import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function AuthShell({ children }: PropsWithChildren) {
  return (
    <SafeAreaView className="flex-1 bg-[#eaf4ff]">
      <View className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#66a8ff]/30" />
      <View className="absolute -left-24 top-80 h-64 w-64 rounded-full bg-[#9f8cff]/20" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-5 py-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-7 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-[22px] bg-[#146ef5] shadow-lg shadow-blue-400">
              <Ionicons name="chatbubble-ellipses" color="white" size={30} />
            </View>
            <Text className="text-3xl font-extrabold tracking-tight text-[#10233f]">
              English Coach
            </Text>
            <Text className="mt-2 text-center text-[15px] text-[#63738c]">
              Speak clearly. Grow confidently.
            </Text>
          </View>
          <View className="rounded-[30px] border border-white/80 bg-white/80 p-5 shadow-xl shadow-blue-200">
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View className="mb-6">
      <Text className="text-2xl font-bold text-[#10233f]">{title}</Text>
      <Text className="mt-2 leading-5 text-[#6b7b91]">{subtitle}</Text>
    </View>
  );
}

interface FormFieldProps extends TextInputProps {
  error?: string;
  icon: IconName;
  label: string;
}

export function FormField({ error, icon, label, ...props }: FormFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 ml-1 text-sm font-semibold text-[#32445e]">
        {label}
      </Text>
      <View
        className={`flex-row items-center rounded-2xl border bg-white px-4 ${error ? 'border-red-300' : 'border-[#dbe8f8]'}`}
      >
        <Ionicons name={icon} size={19} color="#7b8ba3" />
        <TextInput
          className="min-h-14 flex-1 px-3 text-base text-[#10233f]"
          placeholderTextColor="#9aa8ba"
          {...props}
        />
      </View>
      {error ? (
        <Text className="ml-1 mt-1 text-xs text-red-600">{error}</Text>
      ) : null}
    </View>
  );
}

export function PrimaryButton({
  busy,
  disabled,
  label,
  onPress,
}: {
  busy?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="mt-2 min-h-14 flex-row items-center justify-center rounded-2xl bg-[#146ef5] px-5 shadow-md shadow-blue-300 active:opacity-80 disabled:opacity-50"
      disabled={disabled || busy}
      onPress={onPress}
    >
      {busy ? <ActivityIndicator color="white" className="mr-2" /> : null}
      <Text className="text-base font-bold text-white">{label}</Text>
    </Pressable>
  );
}

export function ErrorNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View className="mb-4 flex-row rounded-2xl bg-red-50 p-3">
      <Ionicons name="alert-circle" color="#dc2626" size={19} />
      <Text className="ml-2 flex-1 text-sm leading-5 text-red-700">
        {message}
      </Text>
    </View>
  );
}
