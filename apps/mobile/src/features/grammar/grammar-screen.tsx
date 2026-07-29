import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { askGrammarTeacher, fetchGrammar, generateGrammarPractice, grammarLevelLabel, grammarQueryKey, saveGrammarProgress, submitGrammarPractice, type GrammarAiPractice, type GrammarAiResult, type GrammarTopic } from './grammar-api';

function Section({ icon, title, color, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; color: string; children: ReactNode }) {
  return (
    <View className="mt-4 rounded-[26px] border border-white bg-white p-5 shadow-sm">
      <View className="mb-4 flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${color}18` }}><Ionicons name={icon} size={21} color={color} /></View>
        <Text className="ml-3 text-xl font-extrabold text-[#10233f]">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Bullet({ children, color = '#146ef5' }: { children: ReactNode; color?: string }) {
  return <View className="mb-3 flex-row"><View className="mr-3 mt-2 h-2 w-2 rounded-full" style={{ backgroundColor: color }} /><Text className="flex-1 leading-6 text-[#40546d]">{children}</Text></View>;
}

function TopicLesson({ topic, onBack }: { topic: GrammarTopic; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [question, setQuestion] = useState('');
  const [teacherAnswer, setTeacherAnswer] = useState<string | null>(null);
  const [aiPractice, setAiPractice] = useState<GrammarAiPractice | null>(null);
  const [aiAnswers, setAiAnswers] = useState<Record<string, number>>({});
  const [aiResult, setAiResult] = useState<GrammarAiResult | null>(null);

  const progress = useMutation({
    mutationFn: saveGrammarProgress,
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: grammarQueryKey }), queryClient.invalidateQueries({ queryKey: ['progress'] }), queryClient.invalidateQueries({ queryKey: ['learn'] })]);
    },
  });
  const askTeacher = useMutation({
    mutationFn: askGrammarTeacher,
    onMutate: () => setTeacherAnswer(null),
    onSuccess: (data) => setTeacherAnswer(data.answer),
    onError: (error) => setTeacherAnswer(error.message),
  });
  const generateAiPractice = useMutation({
    mutationFn: () => generateGrammarPractice(topic.id),
    onMutate: () => { setAiPractice(null); setAiAnswers({}); setAiResult(null); },
    onSuccess: setAiPractice,
  });
  const submitAiPractice = useMutation({
    mutationFn: () => submitGrammarPractice(aiPractice!.sessionId, aiAnswers),
    onSuccess: async (result) => {
      setAiResult(result);
      await Promise.all([queryClient.invalidateQueries({ queryKey: grammarQueryKey }), queryClient.invalidateQueries({ queryKey: ['progress'] }), queryClient.invalidateQueries({ queryKey: ['learn'] })]);
    },
  });

  const submitQuiz = () => {
    if (!topic.practiceQuestions.length) return;
    const correct = topic.practiceQuestions.filter((item) => selectedAnswers[item.id] === item.answer).length;
    const score = Math.round((correct / topic.practiceQuestions.length) * 100);
    setQuizScore(score);
    progress.mutate({ topicId: topic.id, action: 'practice', score });
  };
  const submitQuestion = () => {
    const value = question.trim();
    if (value.length < 3) return;
    Keyboard.dismiss();
    askTeacher.mutate({ topicId: topic.id, question: value });
  };
  const completed = topic.progress?.status === 'completed';

  return (
    <SafeAreaView className="flex-1 bg-[#edf6ff]" edges={['top']}>
      <View className="flex-row items-center border-b border-white bg-[#edf6ff] px-5 py-3">
        <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-white" onPress={onBack}><Ionicons name="arrow-back" size={22} color="#10233f" /></Pressable>
        <View className="ml-3 min-w-0 flex-1"><Text className="text-xs font-bold uppercase text-[#18a67e]">{topic.category}</Text><Text className="mt-0.5 text-lg font-extrabold text-[#10233f]" numberOfLines={1}>{topic.title}</Text></View>
        {completed ? <Ionicons name="checkmark-circle" size={29} color="#18a67e" /> : null}
      </View>
      <ScrollView contentContainerClassName="px-5 pb-28" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
        <View className="mt-4 overflow-hidden rounded-[28px] bg-[#126e58] p-6">
          <View className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <Text className="text-3xl font-extrabold leading-9 text-white">{topic.title}</Text>
          <Text className="mt-3 leading-6 text-[#d5f5eb]">{topic.summary}</Text>
          <View className="mt-5 flex-row gap-2"><View className="rounded-full bg-white/15 px-3 py-2"><Text className="text-xs font-bold text-white">{grammarLevelLabel(topic.level)}</Text></View><View className="rounded-full bg-white/15 px-3 py-2"><Text className="text-xs font-bold text-white">{topic.estimatedMinutes} min</Text></View></View>
        </View>

        <Section icon="git-branch-outline" title="Sentence structure" color="#146ef5">
          {topic.structures.map((item) => <View key={item} className="mb-2 rounded-2xl bg-[#edf5ff] p-4"><Text className="font-bold leading-6 text-[#124d91]">{item}</Text></View>)}
        </Section>

        <Section icon="book-outline" title="Rules explained" color="#18a67e">
          {topic.rules.map((rule, index) => <View key={`${rule.title}-${index}`} className="mb-4"><Text className="font-extrabold text-[#10233f]">{rule.title}</Text><Text className="mt-1 leading-6 text-[#52647b]">{rule.description}</Text></View>)}
        </Section>

        <Section icon="chatbubbles-outline" title="Practical examples" color="#7c5cff">
          {topic.examples.map((item) => <View key={item} className="mb-3 rounded-2xl border-l-4 border-[#7c5cff] bg-[#f4f1ff] p-4"><Text className="leading-6 text-[#3e3472]">{item}</Text></View>)}
        </Section>
        <Section icon="warning-outline" title="Exceptions" color="#e6a01d">
          {topic.exceptions.map((item) => <Bullet key={item} color="#e6a01d">{item}</Bullet>)}
        </Section>

        <Section icon="bulb-outline" title="Tips & memory tricks" color="#7c5cff">
          {topic.tips.map((item) => <Bullet key={item} color="#7c5cff">{item}</Bullet>)}
        </Section>

        <Section icon="close-circle-outline" title="Common mistakes" color="#e35d55">
          {topic.commonMistakes.map((item) => <View key={item} className="mb-3 rounded-2xl bg-[#fff0ee] p-4"><Text className="leading-6 text-[#8f342f]">{item}</Text></View>)}
        </Section>

        <Section icon="library-outline" title="Grammar vocabulary" color="#146ef5">
          {topic.keyVocabulary.map((item) => <View key={item.term} className="mb-3 flex-row rounded-2xl bg-[#f3f7fb] p-4"><Text className="w-28 font-extrabold text-[#10233f]">{item.term}</Text><Text className="flex-1 leading-5 text-[#52647b]">{item.meaning}</Text></View>)}
        </Section>

        <Section icon="help-circle-outline" title="Check your understanding" color="#18a67e">
          {topic.practiceQuestions.map((item, questionIndex) => (
            <View key={item.id} className="mb-5">
              <Text className="font-extrabold leading-6 text-[#10233f]">{questionIndex + 1}. {item.question}</Text>
              <View className="mt-3 gap-2">
                {item.options.map((option, optionIndex) => {
                  const selected = selectedAnswers[item.id] === optionIndex;
                  const revealCorrect = quizScore !== null && optionIndex === item.answer;
                  const revealWrong = quizScore !== null && selected && optionIndex !== item.answer;
                  return (
                    <Pressable key={option} disabled={quizScore !== null} className={`rounded-2xl border p-3 ${revealCorrect ? 'border-[#18a67e] bg-[#e7f8f2]' : revealWrong ? 'border-[#e35d55] bg-[#fff0ee]' : selected ? 'border-[#146ef5] bg-[#edf5ff]' : 'border-[#e2e9f1] bg-white'}`} onPress={() => setSelectedAnswers((current) => ({ ...current, [item.id]: optionIndex }))}>
                      <Text className={`font-semibold ${revealCorrect ? 'text-[#126e58]' : revealWrong ? 'text-[#a33d36]' : 'text-[#40546d]'}`}>{option}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {quizScore !== null ? <Text className="mt-3 leading-6 text-[#52647b]"><Text className="font-bold">Why: </Text>{item.explanation}</Text> : null}
            </View>
          ))}
          {quizScore === null ? (
            <Pressable disabled={Object.keys(selectedAnswers).length !== topic.practiceQuestions.length || progress.isPending} className={`items-center rounded-2xl py-4 ${Object.keys(selectedAnswers).length === topic.practiceQuestions.length ? 'bg-[#18a67e]' : 'bg-[#b9c8d6]'}`} onPress={submitQuiz}><Text className="font-extrabold text-white">Check answers</Text></Pressable>
          ) : (
            <View className="items-center rounded-2xl bg-[#e7f8f2] p-5"><Text className="text-3xl font-extrabold text-[#126e58]">{quizScore}%</Text><Text className="mt-1 font-semibold text-[#377462]">{quizScore >= 70 ? 'Great understanding!' : 'Review the lesson and try again.'}</Text><Pressable className="mt-3" onPress={() => { setSelectedAnswers({}); setQuizScore(null); }}><Text className="font-bold text-[#146ef5]">Try again</Text></Pressable></View>
          )}
        </Section>

        <Section icon="sparkles-outline" title="AI practice lab" color="#7c5cff">
          <Text className="mb-4 leading-6 text-[#52647b]">Generate fresh examples and questions for this exact topic. The examples mix daily life, meetings and office English, and every verified score updates your Progress.</Text>
          {!aiPractice && !generateAiPractice.isPending ? <Pressable className="items-center rounded-2xl bg-[#7c5cff] py-4" onPress={() => generateAiPractice.mutate()}><Text className="font-extrabold text-white">Generate fresh practice</Text></Pressable> : null}
          {generateAiPractice.isPending ? <View className="items-center rounded-2xl bg-[#f4f1ff] p-5"><ActivityIndicator color="#7c5cff" /><Text className="mt-3 font-semibold text-[#5b48ad]">Your AI teacher is preparing a new set…</Text></View> : null}
          {generateAiPractice.error ? <View className="rounded-2xl bg-[#fff0ee] p-4"><Text className="leading-6 text-[#8f342f]">{generateAiPractice.error.message}</Text><Pressable className="mt-3" onPress={() => generateAiPractice.mutate()}><Text className="font-extrabold text-[#7c5cff]">Try generation again</Text></Pressable></View> : null}
          {aiPractice ? <View>
            <Text className="mb-3 text-lg font-extrabold text-[#10233f]">Fresh examples</Text>
            {aiPractice.examples.map((example, index) => <View key={`${example.sentence}-${index}`} className="mb-3 rounded-2xl bg-[#f4f1ff] p-4">
              <View className="self-start rounded-full bg-[#e2dcff] px-3 py-1"><Text className="text-xs font-extrabold uppercase text-[#5b48ad]">{example.context.replace('-', ' ')}</Text></View>
              <Text className="mt-3 text-base font-extrabold leading-6 text-[#302663]">{example.sentence}</Text>
              <Text className="mt-2 leading-6 text-[#5d5680]">{example.explanation}</Text>
              <View className="mt-2 flex-row flex-wrap gap-2">{example.vocabulary.map((item) => <View key={`${example.sentence}-${item.word}`} className="rounded-xl bg-white px-3 py-2"><Text className="font-bold text-[#10233f]">{item.word}</Text><Text className="text-xs text-[#68788d]">{item.meaning}</Text></View>)}</View>
            </View>)}
            <Text className="mb-3 mt-3 text-lg font-extrabold text-[#10233f]">Answer these questions</Text>
            {aiPractice.questions.map((item, questionIndex) => {
              const review = aiResult?.review.find((entry) => entry.questionId === item.id);
              return <View key={item.id} className="mb-5">
                <Text className="font-extrabold leading-6 text-[#10233f]">{questionIndex + 1}. {item.question}</Text>
                <View className="mt-3 gap-2">{item.options.map((option, optionIndex) => {
                  const selected = aiAnswers[item.id] === optionIndex;
                  const correct = review?.correctIndex === optionIndex;
                  const wrong = Boolean(review && selected && !review.isCorrect);
                  return <Pressable key={`${item.id}-${optionIndex}`} disabled={Boolean(aiResult)} className={`rounded-2xl border p-3 ${correct ? 'border-[#18a67e] bg-[#e7f8f2]' : wrong ? 'border-[#e35d55] bg-[#fff0ee]' : selected ? 'border-[#7c5cff] bg-[#f4f1ff]' : 'border-[#e2e9f1] bg-white'}`} onPress={() => setAiAnswers((current) => ({ ...current, [item.id]: optionIndex }))}><Text className={`font-semibold ${correct ? 'text-[#126e58]' : wrong ? 'text-[#a33d36]' : 'text-[#40546d]'}`}>{option}</Text></Pressable>;
                })}</View>
                {review ? <Text className="mt-3 leading-6 text-[#52647b]"><Text className="font-bold">Why: </Text>{review.explanation}</Text> : null}
              </View>;
            })}
            {!aiResult ? <Pressable disabled={Object.keys(aiAnswers).length !== aiPractice.questions.length || submitAiPractice.isPending} className={`items-center rounded-2xl py-4 ${Object.keys(aiAnswers).length === aiPractice.questions.length ? 'bg-[#18a67e]' : 'bg-[#b9c8d6]'}`} onPress={() => submitAiPractice.mutate()}>{submitAiPractice.isPending ? <ActivityIndicator color="white" /> : <Text className="font-extrabold text-white">Submit AI practice</Text>}</Pressable> : <View className="items-center rounded-2xl bg-[#e7f8f2] p-5"><Text className="text-3xl font-extrabold text-[#126e58]">{aiResult.score}%</Text><Text className="mt-1 font-semibold text-[#377462]">{aiResult.correct} of {aiResult.total} correct · saved to Progress</Text><Pressable className="mt-4 rounded-xl bg-white px-5 py-3" onPress={() => generateAiPractice.mutate()}><Text className="font-extrabold text-[#7c5cff]">Generate another set</Text></Pressable></View>}
            {submitAiPractice.error ? <Text className="mt-3 text-center font-semibold text-[#a33d36]">{submitAiPractice.error.message}</Text> : null}
          </View> : null}
        </Section>

        <View className="mt-4 overflow-hidden rounded-[28px] bg-[#10233f] p-5">
          <View className="flex-row items-center"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><Ionicons name="sparkles" size={23} color="#8dc5ff" /></View><View className="ml-3"><Text className="text-xl font-extrabold text-white">Ask AI grammar teacher</Text><Text className="text-sm text-[#b8cce2]">Solve a doubt about this lesson</Text></View></View>
          <TextInput className="mt-4 min-h-24 rounded-2xl bg-white px-4 py-3 text-base leading-6 text-[#10233f]" value={question} onChangeText={setQuestion} placeholder="Example: Why can I not use present perfect with yesterday?" placeholderTextColor="#8291a4" multiline textAlignVertical="top" />
          <Pressable disabled={askTeacher.isPending || question.trim().length < 3} className={`mt-3 items-center rounded-2xl py-3.5 ${question.trim().length >= 3 ? 'bg-[#146ef5]' : 'bg-[#53657c]'}`} onPress={submitQuestion}>{askTeacher.isPending ? <ActivityIndicator color="white" /> : <Text className="font-extrabold text-white">Ask teacher</Text>}</Pressable>
          {teacherAnswer ? <View className="mt-4 rounded-2xl bg-white/10 p-4"><Text className="leading-6 text-[#e5eef8]">{teacherAnswer}</Text></View> : null}
        </View>

        <Pressable disabled={progress.isPending || completed} className={`mb-5 mt-5 items-center rounded-2xl py-4 ${completed ? 'bg-[#b9c8d6]' : 'bg-[#18a67e]'}`} onPress={() => progress.mutate({ topicId: topic.id, action: 'complete', score: quizScore ?? undefined })}>
          <View className="flex-row items-center"><Ionicons name={completed ? 'checkmark-circle' : 'flag-outline'} size={21} color="white" /><Text className="ml-2 font-extrabold text-white">{completed ? 'Lesson completed' : 'Mark lesson complete'}</Text></View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
export function GrammarScreen() {
  const grammar = useQuery({ queryKey: grammarQueryKey, queryFn: fetchGrammar });
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const selectedTopic = grammar.data?.topics.find((topic) => topic.id === selectedTopicId);
  const filteredTopics = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (grammar.data?.topics ?? []).filter((topic) =>
      (category === 'All' || topic.category === category) &&
      (!query || `${topic.title} ${topic.summary} ${topic.structures.join(' ')}`.toLowerCase().includes(query)),
    );
  }, [category, grammar.data?.topics, search]);

  if (selectedTopic) return <TopicLesson key={selectedTopic.id} topic={selectedTopic} onBack={() => setSelectedTopicId(null)} />;
  if (grammar.isPending) return <SafeAreaView className="flex-1 items-center justify-center bg-[#edf6ff]"><ActivityIndicator size="large" color="#18a67e" /></SafeAreaView>;
  if (grammar.error) return <SafeAreaView className="flex-1 items-center justify-center bg-[#edf6ff] px-6"><Ionicons name="cloud-offline-outline" size={42} color="#e35d55" /><Text className="mt-4 text-center font-semibold text-[#10233f]">{grammar.error.message}</Text><Pressable className="mt-5 rounded-2xl bg-[#18a67e] px-6 py-3" onPress={() => grammar.refetch()}><Text className="font-bold text-white">Try again</Text></Pressable></SafeAreaView>;

  const completedPercent = grammar.data?.stats.total ? Math.round((grammar.data.stats.completed / grammar.data.stats.total) * 100) : 0;
  return (
    <SafeAreaView className="flex-1 bg-[#edf6ff]" edges={['top']}>
      <View className="flex-row items-center px-5 pb-3 pt-3">
        <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-white" onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color="#10233f" /></Pressable>
        <View className="ml-4"><Text className="text-2xl font-extrabold text-[#10233f]">Grammar academy</Text><Text className="text-sm text-[#718198]">Rules made clear and practical</Text></View>
      </View>
      <ScrollView contentContainerClassName="pb-28" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
        <View className="mx-5 mt-2 overflow-hidden rounded-[28px] bg-[#126e58] p-6">
          <View className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
          <Text className="text-sm font-bold uppercase tracking-wider text-[#b8eadb]">Your grammar journey</Text>
          <Text className="mt-2 text-3xl font-extrabold text-white">{completedPercent}% complete</Text>
          <Text className="mt-2 text-[#d5f5eb]">{grammar.data?.stats.completed ?? 0} of {grammar.data?.stats.total ?? 0} lessons mastered</Text>
          <View className="mt-5 h-3 overflow-hidden rounded-full bg-white/15"><View className="h-full rounded-full bg-white" style={{ width: `${completedPercent}%` }} /></View>
          <View className="mt-5 flex-row"><View className="mr-5"><Text className="text-2xl font-extrabold text-white">{grammar.data?.stats.averageScore ?? 0}%</Text><Text className="text-xs text-[#b8eadb]">Average quiz</Text></View><View><Text className="text-2xl font-extrabold text-white">{grammar.data?.stats.inProgress ?? 0}</Text><Text className="text-xs text-[#b8eadb]">In progress</Text></View></View>
        </View>

        <View className="mx-5 mt-4 flex-row items-center rounded-2xl bg-white px-4 py-2 shadow-sm"><Ionicons name="search" size={20} color="#718198" /><TextInput className="ml-3 min-h-11 flex-1 text-base text-[#10233f]" value={search} onChangeText={setSearch} placeholder="Search a grammar topic or structure..." placeholderTextColor="#8b99aa" />{search ? <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={21} color="#96a4b6" /></Pressable> : null}</View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5 py-4">
          {['All', ...(grammar.data?.categories ?? [])].map((item) => <Pressable key={item} className={`rounded-full px-4 py-2.5 ${category === item ? 'bg-[#18a67e]' : 'bg-white'}`} onPress={() => setCategory(item)}><Text className={`font-bold ${category === item ? 'text-white' : 'text-[#52647b]'}`}>{item}</Text></Pressable>)}
        </ScrollView>

        <View className="px-5">
          <View className="mb-3 flex-row items-center justify-between"><Text className="text-xl font-extrabold text-[#10233f]">{category === 'All' ? 'Complete curriculum' : category}</Text><Text className="font-bold text-[#18a67e]">{filteredTopics.length} topics</Text></View>
          {filteredTopics.map((topic) => {
            const complete = topic.progress?.status === 'completed';
            return (
              <Pressable key={topic.id} className="mb-3 rounded-[24px] border border-white bg-white p-4 shadow-sm active:opacity-75" onPress={() => setSelectedTopicId(topic.id)}>
                <View className="flex-row items-start">
                  <View className={`h-12 w-12 items-center justify-center rounded-2xl ${complete ? 'bg-[#e7f8f2]' : 'bg-[#edf5ff]'}`}><Ionicons name={complete ? 'checkmark-circle' : 'document-text-outline'} size={24} color={complete ? '#18a67e' : '#146ef5'} /></View>
                  <View className="ml-3 flex-1"><View className="flex-row items-center"><Text className="flex-1 text-lg font-extrabold text-[#10233f]">{topic.title}</Text><Ionicons name="chevron-forward" size={19} color="#96a4b6" /></View><Text className="mt-1 leading-5 text-[#718198]" numberOfLines={2}>{topic.summary}</Text><View className="mt-3 flex-row items-center"><View className="rounded-full bg-[#f1edff] px-2.5 py-1"><Text className="text-[10px] font-bold uppercase text-[#6748d7]">{grammarLevelLabel(topic.level)}</Text></View><Text className="ml-3 text-xs font-semibold text-[#8291a4]">{topic.estimatedMinutes} min</Text>{topic.progress?.bestScore !== null && topic.progress ? <Text className="ml-3 text-xs font-bold text-[#18a67e]">Best {topic.progress.bestScore}%</Text> : null}</View></View>
                </View>
              </Pressable>
            );
          })}
          {!filteredTopics.length ? <View className="items-center rounded-3xl bg-white p-8"><Ionicons name="search-outline" size={38} color="#96a4b6" /><Text className="mt-3 text-center font-semibold text-[#52647b]">No grammar topic matches your search.</Text></View> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}