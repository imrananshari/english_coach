import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  assessmentQueryKey,
  fetchAssessment,
  levelLabel,
} from '@/features/assessment/assessment-api';
import { fetchLearn, learnQueryKey } from '@/features/learn/learn-api';
import { useAuthSession } from '@/lib/auth-client';

const learningCards = [
  {
    title: 'Vocabulary',
    subtitle: 'Build useful word power',
    icon: 'library-outline',
    color: '#7c5cff',
    tint: '#eeeaff',
  },
  {
    title: 'Speaking',
    subtitle: 'Practice with your AI coach',
    icon: 'mic-outline',
    color: '#ef6c62',
    tint: '#fff0ee',
  },
  {
    title: 'Grammar',
    subtitle: 'Master clear sentences',
    icon: 'create-outline',
    color: '#18a67e',
    tint: '#e7f8f2',
  },
] as const;

export function HomeScreen() {
  const { data: session } = useAuthSession();
  const user = session?.user;
  const assessment = useQuery({
    queryKey: [...assessmentQueryKey, user?.id ?? 'anonymous'],
    queryFn: fetchAssessment,
    enabled: Boolean(user?.id),
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
  });
  const dashboard = useQuery({ queryKey: learnQueryKey, queryFn: fetchLearn });
  const assessmentResult = assessment.data?.result ?? assessment.data?.history?.[0] ?? null;
  const dailyGoal = dashboard.data?.profile.dailyGoal ?? assessment.data?.profile?.dailyLearningMinutes ?? 15;
  const goal = dashboard.data?.goal;
  const todayMinutes = goal?.todayMinutes ?? 0;
  const currentStreak = goal?.currentStreak ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-[#edf6ff]" edges={['top']}>
      <View className="absolute -right-24 top-16 h-72 w-72 rounded-full bg-[#86baff]/25" />
      <View className="absolute -left-28 top-[420px] h-64 w-64 rounded-full bg-[#9d82ff]/15" />
      <ScrollView
        contentContainerClassName="px-5 pb-32 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6 flex-row items-center">
          <View className="min-w-0 flex-1 pr-4">
            <Text className="text-sm font-semibold text-[#708198]">
              GOOD TO SEE YOU
            </Text>
            <Text className="mt-1 text-[28px] font-extrabold tracking-tight text-[#10233f]">
              {user?.name || 'Learner'}
            </Text>
          </View>
          <View className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white bg-[#dbeaff] shadow-sm">
            {user?.image ? (
              <Image
                source={{ uri: user.image }}
                contentFit="cover"
                style={{ width: 56, height: 56 }}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="person" size={23} color="#146ef5" />
              </View>
            )}
          </View>
        </View>

        <View className="overflow-hidden rounded-[30px] bg-[#146ef5] p-6 shadow-lg shadow-blue-300">
          <View className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/15" />
          <View className="absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-[#8dd6ff]/20" />
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-bold tracking-wide text-blue-100">
                {assessmentResult ? 'YOUR ENGLISH LEVEL' : 'YOUR FIRST STEP'}
              </Text>
              <Text className="mt-2 text-2xl font-extrabold leading-8 text-white">
                {assessmentResult
                  ? levelLabel(assessmentResult.assignedLevel)
                  : 'Discover your English level'}
              </Text>
              <Text className="mt-2 leading-5 text-blue-100">
                {assessmentResult
                  ? 'Your personalized learning plan is ready.'
                  : 'Take a short assessment so we can personalize every lesson.'}
              </Text>
            </View>
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <Ionicons name="sparkles" size={28} color="white" />
            </View>
          </View>
          <View className="mt-6 flex-row gap-3">
            <Pressable
              className={`flex-1 items-center rounded-2xl px-3 py-3 active:opacity-80 ${assessmentResult ? 'bg-white' : 'bg-white/75'}`}
              onPress={() => assessmentResult ? router.push({ pathname: '/assessment', params: { view: 'result' } }) : Alert.alert('No result yet', 'Complete your first assessment on this account to unlock its result.')}
            >
              <Text className="text-center font-bold text-[#146ef5]">View result</Text>
            </Pressable>
            <Pressable className="flex-1 items-center rounded-2xl border border-white/40 bg-white/15 px-3 py-3 active:opacity-80" onPress={() => router.push('/assessment')}>
              <Text className="text-center font-bold text-white">New assessment</Text>
            </Pressable>
          </View>
        </View>

        <View className="mt-5 flex-row gap-3">
          <Pressable className="flex-1 rounded-3xl border border-white bg-white/80 p-4 active:opacity-80" onPress={() => router.push('/(tabs)/progress')}>
            <View className="flex-row items-center">
              <Ionicons name="flame" size={20} color="#ff7a59" />
              <Text className="ml-2 text-xs font-bold text-[#75859a]">STREAK</Text>
            </View>
            <Text className="mt-3 text-2xl font-extrabold text-[#10233f]">{currentStreak} {currentStreak === 1 ? 'day' : 'days'}</Text>
            <Text className="mt-1 text-xs font-semibold text-[#8a98aa]">{currentStreak ? `Best: ${goal?.longestStreak ?? currentStreak} days` : 'Learn today to begin'}</Text>
          </Pressable>
          <Pressable className="flex-1 rounded-3xl border border-white bg-white/80 p-4 active:opacity-80" onPress={() => router.push('/(tabs)/learn')}>
            <View className="flex-row items-center">
              <Ionicons name="time" size={20} color="#7c5cff" />
              <Text className="ml-2 text-xs font-bold text-[#75859a]">DAILY GOAL</Text>
            </View>
            <Text className="mt-3 text-2xl font-extrabold text-[#10233f]">{todayMinutes} / {dailyGoal}</Text>
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8e3fb]"><View className="h-full rounded-full bg-[#7c5cff]" style={{ width: `${goal?.goalPercentage ?? 0}%` }} /></View>
            <Text className="mt-1 text-xs font-semibold text-[#8a98aa]">{goal?.goalReached ? 'Goal completed!' : `${goal?.remainingMinutes ?? dailyGoal} min left`}</Text>
          </Pressable>
        </View>

        {goal ? (
          <Pressable className="mt-3 rounded-3xl border border-white bg-white/80 p-4 active:opacity-85" onPress={() => router.push('/(tabs)/progress')}>
            <View className="flex-row items-center justify-between"><Text className="font-extrabold text-[#10233f]">Weekly momentum</Text><Text className="text-xs font-bold text-[#146ef5]">{goal.activeDaysThisWeek}/7 active days</Text></View>
            <View className="mt-4 flex-row justify-between">
              {goal.week.map((day) => (
                <View key={day.date} className="items-center">
                  <Text className={`text-xs font-bold ${day.isToday ? 'text-[#146ef5]' : 'text-[#8a98aa]'}`}>{day.dayLabel}</Text>
                  <View className={`mt-2 h-8 w-8 items-center justify-center rounded-full ${day.goalReached ? 'bg-[#ff7a59]' : day.active ? 'bg-[#ffe4dc]' : 'bg-[#edf1f5]'}`}>
                    <Ionicons name={day.goalReached ? 'flame' : day.active ? 'checkmark' : 'ellipse-outline'} size={15} color={day.goalReached ? 'white' : day.active ? '#e85e3b' : '#a8b3c0'} />
                  </View>
                  <Text className="mt-1 text-[10px] font-semibold text-[#8a98aa]">{day.minutes}m</Text>
                </View>
              ))}
            </View>
          </Pressable>
        ) : null}

        <Pressable className="mt-4 overflow-hidden rounded-[28px] bg-[#6d4aff] p-5 active:opacity-85" onPress={() => router.push('/study')}>
          <View className="absolute -right-7 -top-9 h-32 w-32 rounded-full bg-white/15" />
          <View className="flex-row items-center">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><Ionicons name="people" size={27} color="white" /></View>
            <View className="ml-4 flex-1"><Text className="text-xs font-extrabold uppercase tracking-wide text-[#dcd3ff]">Live study rooms</Text><Text className="mt-1 text-xl font-extrabold text-white">Learn Together</Text><Text className="mt-1 text-sm leading-5 text-[#e3dcff]">Join friends for lessons, AI practice and chat.</Text></View>
            <Ionicons name="arrow-forward-circle" size={30} color="white" />
          </View>
        </Pressable>
        <View className="mb-3 mt-7 flex-row items-center justify-between">
          <Text className="text-xl font-extrabold text-[#10233f]">
            Explore learning
          </Text>
          <Pressable onPress={() => router.push('/(tabs)/learn')}><Text className="font-semibold text-[#146ef5]">See all</Text></Pressable>
        </View>
        {learningCards.map((card) => (
          <Pressable
            key={card.title}
            className="mb-3 flex-row items-center rounded-3xl border border-white bg-white/80 p-4 active:opacity-75"
            onPress={() => { if (card.title === 'Vocabulary') router.push('/vocabulary'); if (card.title === 'Grammar') router.push('/grammar'); if (card.title === 'Speaking') router.push('/(tabs)/speak'); }}
          >
            <View
              className="h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: card.tint }}
            >
              <Ionicons name={card.icon} size={25} color={card.color} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-base font-bold text-[#10233f]">
                {card.title}
              </Text>
              <Text className="mt-1 text-sm text-[#718198]">
                {card.subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#96a4b6" />
          </Pressable>
        ))}

        <View className="mt-3 rounded-[28px] border border-white bg-white/80 p-5">
          <View className="flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#fff3d9]">
              <Ionicons name="bulb" size={22} color="#e6a01d" />
            </View>
            <Text className="ml-3 text-base font-bold text-[#10233f]">
              Coach recommendation
            </Text>
          </View>
          <Text className="mt-3 leading-6 text-[#66778e]">
            {assessmentResult
              ? `Focus on ${assessment.data?.profile?.selectedGoal?.toLowerCase() ?? 'your selected goal'} for ${dailyGoal} minutes today.`
              : 'Complete your level assessment to unlock a personal daily plan and focused recommendations.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
