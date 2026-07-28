import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchVocabulary, generateVocabularyPack, reviewVocabulary, vocabularyQueryKey, type VocabularyFilter, type VocabularyWord } from './vocabulary-api';

const defaultCategory = 'Daily Conversation';
const fallbackCategories = [defaultCategory, 'Office & Meetings', 'Business Email', 'Customer Service', 'Job Interviews', 'Travel', 'Feelings', 'Technology', 'Study & Academic', 'Phrasal Verbs', 'Idioms', 'Gen Z & Slang'];
type ReviewAction = 'learning' | 'difficult' | 'remembered';

function ScalePressable({ children, className, disabled, flex, onPress, pulseKey }: { children: ReactNode; className: string; disabled?: boolean; flex?: boolean; onPress: () => void; pulseKey?: string | number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const previousPulse = useRef(pulseKey);
  const animateTo = (value: number) => Animated.spring(scale, { toValue: value, speed: 30, bounciness: 7, useNativeDriver: true }).start();

  useEffect(() => {
    if (previousPulse.current === pulseKey) return;
    previousPulse.current = pulseKey;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.09, speed: 28, bounciness: 9, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 25, bounciness: 7, useNativeDriver: true }),
    ]).start();
  }, [pulseKey, scale]);

  return (
    <Animated.View style={{ flex: flex ? 1 : undefined, transform: [{ scale }] }}>
      <Pressable disabled={disabled} className={className} onPress={onPress} onPressIn={() => animateTo(0.95)} onPressOut={() => animateTo(1)}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
function WordCard({ word, saving, onReview }: { word: VocabularyWord; saving: boolean; onReview: (action: ReviewAction) => void }) {
  const [revealed, setRevealed] = useState(false);
  const isRemembered = word.status === 'remembered' || word.status === 'mastered';
  return (
    <View className="mb-4 overflow-hidden rounded-[28px] border border-white bg-white p-5 shadow-sm">
      <View className="flex-row items-start">
        <View className="flex-1 pr-3">
          <View className="flex-row flex-wrap items-center">
            <Text className="text-3xl font-extrabold text-[#10233f]">{word.word}</Text>
            {isRemembered ? (
              <View className="ml-2 flex-row items-center rounded-full bg-[#e7f8f2] px-2.5 py-1">
                <Ionicons name="checkmark-circle" size={14} color="#148764" />
                <Text className="ml-1 text-[10px] font-bold uppercase text-[#148764]">Remembered</Text>
              </View>
            ) : word.status !== 'new' ? (
              <View className="ml-2 rounded-full bg-[#e9f4ff] px-2.5 py-1">
                <Text className="text-[10px] font-bold uppercase text-[#146ef5]">{word.status}</Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-1 text-sm font-semibold text-[#7c5cff]">
            {word.partOfSpeech}{word.pronunciation ? ` | ${word.pronunciation}` : ''}
          </Text>
          <View className="mt-2 self-start rounded-full bg-[#f1edff] px-3 py-1">
            <Text className="text-xs font-bold uppercase text-[#6748d7]">{word.register}</Text>
          </View>
        </View>
        <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-[#e8f2ff]" onPress={() => Speech.speak(word.word, { language: 'en-US', rate: 0.8 })}>
          <Ionicons name="volume-high" size={21} color="#146ef5" />
        </Pressable>
      </View>

      <View className="mt-5 rounded-2xl bg-[#fff4df] p-4">
        <Text className="text-xs font-bold uppercase tracking-wider text-[#b37400]">Hindi meaning</Text>
        <Text className="mt-1 text-xl font-extrabold text-[#593b00]">{word.hindiMeaning}</Text>
      </View>
      <Text className="mt-4 text-base font-bold leading-6 text-[#213650]">{word.meaning}</Text>
      {word.simpleExplanation ? <Text className="mt-1 leading-6 text-[#687990]">{word.simpleExplanation}</Text> : null}

      <Pressable className="mt-4 flex-row items-center" onPress={() => setRevealed((value) => !value)}>
        <Text className="font-bold text-[#146ef5]">{revealed ? 'Hide learning details' : 'Examples, phrases & conversations'}</Text>
        <Ionicons className="ml-1" name={revealed ? 'chevron-up' : 'chevron-down'} size={17} color="#146ef5" />
      </Pressable>
      {revealed ? (
        <View className="mt-4 border-t border-[#e7edf4] pt-4">
          {word.example ? <Text className="leading-6 text-[#344a65]"><Text className="font-bold">Example: </Text>{word.example}</Text> : null}
          {word.officeExample ? <Text className="mt-2 leading-6 text-[#344a65]"><Text className="font-bold">At work: </Text>{word.officeExample}</Text> : null}
          <Text className="mt-4 text-xs font-bold uppercase tracking-wider text-[#73849a]">Useful phrases</Text>
          {word.phrasePatterns.map((item) => <Text key={item} className="mt-2 leading-6 text-[#344a65]">- {item}</Text>)}
          <Text className="mt-4 text-xs font-bold uppercase tracking-wider text-[#73849a]">Use in conversation</Text>
          {word.conversationExamples.map((item) => (
            <View key={item} className="mt-2 rounded-2xl bg-[#f3f7fb] p-3">
              <Text className="leading-6 text-[#344a65]">{`"${item}"`}</Text>
            </View>
          ))}
          <Text className="mt-4 text-xs font-bold uppercase tracking-wider text-[#73849a]">Synonyms</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {word.synonyms.map((item) => (
              <View key={item} className="rounded-full bg-[#eeeaff] px-3 py-1.5">
                <Text className="font-semibold text-[#6748d7]">{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View className="mt-5 flex-row gap-2">
        <ScalePressable flex disabled={saving} className="items-center rounded-2xl bg-[#fff0ee] py-3" onPress={() => onReview('difficult')}><Text className="font-bold text-[#d8564c]">Difficult</Text></ScalePressable>
        <ScalePressable flex disabled={saving} className="items-center rounded-2xl bg-[#eef3f8] py-3" onPress={() => onReview('learning')}><Text className="font-bold text-[#52647b]">Learning</Text></ScalePressable>
        <ScalePressable flex disabled={saving} className="items-center rounded-2xl bg-[#e7f8f2] py-3" onPress={() => onReview('remembered')}><Text className="font-bold text-[#148764]">Remembered</Text></ScalePressable>
      </View>
    </View>
  );
}

export function VocabularyScreen() {
  const [category, setCategory] = useState(defaultCategory);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VocabularyFilter>('all');
  const queryClient = useQueryClient();
  const vocabulary = useQuery({
    queryKey: vocabularyQueryKey(category, submittedSearch, statusFilter),
    queryFn: () => fetchVocabulary(category, submittedSearch, statusFilter),
    placeholderData: (previous) => previous,
  });

  const submitSearch = () => {
    const value = search.trim();
    setSubmittedSearch(value.length >= 2 ? value : '');
    setStatusFilter('all');
    Keyboard.dismiss();
  };
  const clearSearch = () => {
    setSearch('');
    setSubmittedSearch('');
    setStatusFilter('all');
    Keyboard.dismiss();
  };

  const review = useMutation({
    mutationFn: ({ id, action }: { id: string; action: ReviewAction }) => reviewVocabulary(id, action),
    onMutate: ({ id }) => setSavingId(id),
    onSettled: async () => {
      setSavingId(null);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['vocabulary'] }), queryClient.invalidateQueries({ queryKey: ['progress'] })]);
    },
  });
  const generatePack = useMutation({
    mutationFn: () => generateVocabularyPack(category),
    onMutate: () => setGenerationMessage(null),
    onSuccess: async (data) => {
      setGenerationMessage(data.message);
      await queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
    },
    onError: (error) => setGenerationMessage(error.message),
  });

  return (
    <SafeAreaView className="flex-1 bg-[#edf6ff]" edges={['top']}>
      <View className="flex-row items-center px-5 pb-3 pt-3">
        <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-white" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#10233f" />
        </Pressable>
        <View className="ml-4">
          <Text className="text-2xl font-extrabold text-[#10233f]">Daily vocabulary</Text>
          <Text className="text-sm text-[#718198]">Learn, remember, review</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-28">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5 py-3">
          {(vocabulary.data?.categories ?? fallbackCategories).map((item) => (
            <Pressable key={item} onPress={() => { setCategory(item); setGenerationMessage(null); clearSearch(); }} className={`rounded-full border px-4 py-2.5 ${category === item ? 'border-[#146ef5] bg-[#146ef5]' : 'border-white bg-white'}`}>
              <Text className={`font-bold ${category === item ? 'text-white' : 'text-[#52647b]'}`}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {vocabulary.isPending ? <ActivityIndicator className="mt-20" size="large" color="#146ef5" /> : vocabulary.error ? (
          <View className="mx-5 mt-12 items-center rounded-3xl bg-white p-7">
            <Text className="text-center font-semibold text-[#d8564c]">{vocabulary.error.message}</Text>
            <Pressable className="mt-4 rounded-2xl bg-[#146ef5] px-5 py-3" onPress={() => vocabulary.refetch()}><Text className="font-bold text-white">Try again</Text></Pressable>
          </View>
        ) : (
          <View className="px-5">
            <View className="mb-4 mt-2 overflow-hidden rounded-[26px] bg-[#10233f] p-5">
              <View className="flex-row items-center"><Ionicons name="sparkles" size={22} color="#8dc5ff" /><Text className="ml-2 text-lg font-extrabold text-white">AI vocabulary catalogue</Text></View>
              <Text className="mt-2 leading-5 text-[#c8d8ea]">{vocabulary.data?.catalogCount ?? 0} / {vocabulary.data?.catalogueTarget ?? 5000} words cached in Neon - {vocabulary.data?.categoryCount ?? 0} in this category</Text>
              <Pressable disabled={generatePack.isPending} className="mt-4 items-center rounded-2xl bg-white px-5 py-3" onPress={() => generatePack.mutate()}>
                {generatePack.isPending ? <ActivityIndicator color="#146ef5" /> : <Text className="font-bold text-[#146ef5]">Generate 20 new verified words</Text>}
              </Pressable>
              {generationMessage ? <Text className="mt-3 text-center text-sm text-[#d8e8fa]">{generationMessage}</Text> : null}
            </View>

            <View className="mb-4 flex-row items-center rounded-2xl border border-white bg-white px-4 py-2 shadow-sm">
              <TextInput className="min-h-11 flex-1 text-base text-[#10233f]" value={search} onChangeText={setSearch} onSubmitEditing={submitSearch} returnKeyType="search" placeholder="Search word, meaning, Hindi or Hinglish..." placeholderTextColor="#8b99aa" autoCapitalize="none" autoCorrect={false} />
              {search.length > 0 ? <Pressable className="h-10 w-10 items-center justify-center" onPress={clearSearch}><Ionicons name="close-circle" size={21} color="#96a4b6" /></Pressable> : null}
              <Pressable className="h-11 w-11 items-center justify-center rounded-xl bg-[#146ef5]" onPress={submitSearch} accessibilityLabel="Search vocabulary">
                {vocabulary.isFetching && submittedSearch ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="search" size={21} color="white" />}
              </Pressable>
            </View>

            <View className="mb-5 flex-row gap-2">
              {([
                { label: 'Due', value: vocabulary.data?.stats.dueToday ?? 0, filter: 'due', icon: 'time-outline' },
                { label: 'Learning', value: vocabulary.data?.stats.learning ?? 0, filter: 'learning', icon: 'book-outline' },
                { label: 'Remember', value: vocabulary.data?.stats.learned ?? 0, filter: 'remembered', icon: 'checkmark-circle-outline' },
                { label: 'Difficult', value: vocabulary.data?.stats.difficult ?? 0, filter: 'difficult', icon: 'alert-circle-outline' },
              ] as const).map((card) => {
                const active = statusFilter === card.filter;
                return (
                  <ScalePressable key={card.filter} flex pulseKey={card.value} className={`items-center rounded-2xl px-1 py-3 ${active ? 'bg-[#146ef5]' : 'bg-white'}`} onPress={() => { setSearch(''); setSubmittedSearch(''); setStatusFilter(active ? 'all' : card.filter); }}>
                    <Ionicons name={card.icon} size={18} color={active ? 'white' : '#146ef5'} />
                    <Text className={`mt-1 text-lg font-extrabold ${active ? 'text-white' : 'text-[#146ef5]'}`}>{card.value}</Text>
                    <Text className={`mt-0.5 text-[10px] font-bold ${active ? 'text-blue-100' : 'text-[#718198]'}`}>{card.label}</Text>
                  </ScalePressable>
                );
              })}
            </View>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="flex-1 pr-3 text-lg font-extrabold text-[#10233f]">
                {submittedSearch ? `Search results for "${submittedSearch}"` : statusFilter === 'remembered' ? 'Remembered words' : statusFilter === 'difficult' ? 'Difficult words' : statusFilter === 'learning' ? 'Learning words' : statusFilter === 'due' ? 'Words due for review' : `Today's words - ${category}`}
              </Text>
              <View className="rounded-full bg-[#dcecff] px-3 py-1.5"><Text className="text-xs font-extrabold text-[#146ef5]">{vocabulary.data?.resultCount ?? 0} words</Text></View>
            </View>
            {vocabulary.data?.words.length === 0 ? <View className="mb-4 items-center rounded-3xl bg-white p-7"><Ionicons name="search-outline" size={34} color="#96a4b6" /><Text className="mt-3 text-center font-semibold text-[#52647b]">No matching vocabulary found.</Text></View> : null}
            {vocabulary.data?.words.map((word) => <WordCard key={word.id} word={word} saving={savingId === word.id} onReview={(action) => review.mutate({ id: word.id, action })} />)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}