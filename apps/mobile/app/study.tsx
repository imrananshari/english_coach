import type { ErrorBoundaryProps } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StudyScreen } from '@/features/study/study-screen';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-[#edf6ff] px-6">
      <View className="w-full rounded-[28px] bg-white p-6">
        <Text className="text-center text-xl font-extrabold text-[#10233f]">Learn Together could not open</Text>
        <Text className="mt-3 text-center leading-6 text-[#66778e]">{error.message || 'Please reload the room.'}</Text>
        <Pressable className="mt-5 items-center rounded-2xl bg-[#146ef5] py-4" onPress={retry}>
          <Text className="font-extrabold text-white">Reload screen</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function StudyRoute() {
  return <StudyScreen />;
}