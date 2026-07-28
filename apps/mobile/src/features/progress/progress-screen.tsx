import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { levelLabel } from '@/features/assessment/assessment-api';
import { fetchProgress, progressQueryKey } from './progress-api';

const colors: Record<string, string> = {
  Grammar: '#7c5cff', Vocabulary: '#146ef5', Listening: '#18a67e',
  Writing: '#ef6c62', Workplace: '#e6a01d',
};

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  const value = Math.max(0, Math.min(score ?? 0, 100));
  return (
    <View className="mb-4">
      <View className="flex-row justify-between">
        <Text className="font-semibold text-[#52647b]">{label}</Text>
        <Text className="font-extrabold text-[#10233f]">{value}%</Text>
      </View>
      <View className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e7edf4]">
        <View className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: colors[label] }} />
      </View>
    </View>
  );
}

export function ProgressScreen() {
  const progress = useQuery({ queryKey: progressQueryKey, queryFn: fetchProgress });
  if (progress.isPending)
    return <SafeAreaView className="flex-1 items-center justify-center bg-[#edf6ff]"><ActivityIndicator color="#146ef5" size="large" /></SafeAreaView>;
  if (progress.error)
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#edf6ff] px-6">
        <Ionicons name="cloud-offline-outline" size={42} color="#ef6c62" />
        <Text className="mt-4 text-center font-semibold text-[#10233f]">{progress.error.message}</Text>
        <Pressable className="mt-5 rounded-2xl bg-[#146ef5] px-6 py-3" onPress={() => progress.refetch()}><Text className="font-bold text-white">Try again</Text></Pressable>
      </SafeAreaView>
    );

  const data = progress.data;
  const latest = data.assessments[0];
  if (!latest)
    return (
      <SafeAreaView className="flex-1 bg-[#edf6ff]" edges={['top']}>
        <View className="flex-1 items-center justify-center px-7">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-[#dcecff]"><Ionicons name="stats-chart" size={43} color="#146ef5" /></View>
          <Text className="mt-6 text-center text-3xl font-extrabold text-[#10233f]">Your progress starts here</Text>
          <Text className="mt-3 text-center leading-6 text-[#66778e]">Complete your first AI assessment to establish your level and focus areas.</Text>
          <Pressable className="mt-7 rounded-2xl bg-[#146ef5] px-7 py-4" onPress={() => router.push('/assessment')}><Text className="font-bold text-white">Start assessment</Text></Pressable>
        </View>
      </SafeAreaView>
    );

  const scores = [
    ['Grammar', latest.grammarScore], ['Vocabulary', latest.vocabularyScore],
    ['Listening', latest.listeningScore], ['Writing', latest.writingScore],
    ['Workplace', latest.workplaceScore],
  ] as const;
  return (
    <SafeAreaView className="flex-1 bg-[#edf6ff]" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-28" showsVerticalScrollIndicator={false}>
        <Text className="mt-4 text-3xl font-extrabold text-[#10233f]">Your progress</Text>
        <Text className="mt-1 text-[#66778e]">Real learning data saved in your account</Text>

        <View className="mt-6 rounded-[28px] bg-[#10233f] p-5">
          <Text className="text-sm font-bold uppercase tracking-wider text-[#91b9ed]">Current level</Text>
          <Text className="mt-2 text-3xl font-extrabold text-white">{levelLabel(latest.assignedLevel)}</Text>
          <Text className="mt-1 text-[#c8d8ea]">Latest score: {latest.overallScore ?? 0}%</Text>
          <Pressable className="mt-5 self-start rounded-2xl bg-white px-5 py-3" onPress={() => router.push({ pathname: '/assessment', params: { view: 'result' } })}>
            <Text className="font-bold text-[#10233f]">View detailed feedback</Text>
          </Pressable>
        </View>

        <View className="mt-4 flex-row gap-3">
          {[
            ['Assessments', data.summary.assessmentsCompleted],
            ['Words', data.summary.totalWordsLearned],
            ['Minutes', data.summary.totalLearningMinutes],
          ].map(([label, value]) => (
            <View key={label} className="flex-1 rounded-2xl bg-white p-4 shadow-sm">
              <Text className="text-2xl font-extrabold text-[#146ef5]">{value}</Text>
              <Text className="mt-1 text-xs font-semibold text-[#66778e]">{label}</Text>
            </View>
          ))}
        </View>

        <View className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
          <Text className="mb-5 text-xl font-extrabold text-[#10233f]">Skill scores</Text>
          {scores.map(([label, score]) => <ScoreBar key={label} label={label} score={score} />)}
        </View>

        <View className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
          <Text className="text-xl font-extrabold text-[#10233f]">Assessment history</Text>
          {data.assessments.map((item) => (
            <View key={item.id} className="mt-4 flex-row items-center rounded-2xl bg-[#f3f7fb] p-4">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-[#dcecff]"><Ionicons name="checkmark" size={23} color="#146ef5" /></View>
              <View className="ml-3 flex-1">
                <Text className="font-bold text-[#10233f]">{levelLabel(item.assignedLevel)}</Text>
                <Text className="mt-0.5 text-xs text-[#66778e]">{new Date(item.completedAt).toLocaleDateString()}</Text>
              </View>
              <Text className="text-xl font-extrabold text-[#146ef5]">{item.overallScore ?? 0}%</Text>
            </View>
          ))}
        </View>

        <Text className="mt-5 text-center text-xs leading-5 text-[#718198]">Lesson, grammar, vocabulary and speaking activity will automatically appear here as you complete each feature.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}