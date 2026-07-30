import { Ionicons } from '@expo/vector-icons';
import * as Ably from 'ably';
import { AblyProvider, ChannelProvider, useChannel } from 'ably/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeInView, glassShadow, heroShadow } from '@/components/premium-ui';

import { askGrammarTeacher, fetchGrammar, fetchGrammarDeepDive, fetchGrammarToken, generateGrammarPractice, grammarLevelLabel, grammarQueryKey, saveGrammarProgress, submitGrammarPractice, type GrammarAiPractice, type GrammarAiResult, type GrammarData, type GrammarDeepDive, type GrammarTopic } from './grammar-api';

function Section({ icon, title, color, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; color: string; children: ReactNode }) {
  return (
    <FadeInView className="mt-4 overflow-hidden rounded-[28px] border border-white/90 bg-white/90 p-5" style={glassShadow}>
      <View className="absolute -right-10 -top-12 h-24 w-24 rounded-full bg-[#dcecff]/35" />
      <View className="mb-4 flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${color}18` }}><Ionicons name={icon} size={21} color={color} /></View>
        <Text className="ml-3 text-xl font-extrabold text-[#10233f]">{title}</Text>
      </View>
      {children}
    </FadeInView>
  );
}

function Bullet({ children, color = '#146ef5' }: { children: ReactNode; color?: string }) {
  return <View className="mb-3 flex-row"><View className="mr-3 mt-2 h-2 w-2 rounded-full" style={{ backgroundColor: color }} /><Text className="flex-1 leading-6 text-[#40546d]">{children}</Text></View>;
}

function AiDeepLearningPanel({ deepDive, loading, error, onGenerate }: { deepDive: GrammarDeepDive | null; loading: boolean; error: string | null; onGenerate: () => void }) {
  const [revealedTasks, setRevealedTasks] = useState<Record<string, boolean>>({});
  if (!deepDive) {
    return (
      <FadeInView className="mt-4 overflow-hidden rounded-[30px] border border-white/20 bg-[#29215f] p-5" style={heroShadow}>
        <View className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#947cff]/25" />
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Ionicons name="sparkles" size={25} color="#d9d0ff" /></View>
        <Text className="mt-4 text-2xl font-extrabold text-white">AI deep learning guide</Text>
        <Text className="mt-2 leading-6 text-[#d8d1ff]">Build a detailed bilingual guide for this lesson with usage situations, formulas, Hindi examples, comparisons, mistakes and four guided tasks.</Text>
        <Pressable disabled={loading} className="mt-5 items-center rounded-2xl bg-white py-4" onPress={onGenerate}>{loading ? <ActivityIndicator color="#6f55d9" /> : <Text className="font-extrabold text-[#5b45ba]">Create deep lesson</Text>}</Pressable>
        {error ? <Text className="mt-3 text-center leading-5 text-[#ffd5d1]">{error}</Text> : null}
      </FadeInView>
    );
  }
  return (
    <View>
      <Section icon="sparkles" title="AI deep explanation" color="#7c5cff">
        <Text className="leading-6 text-[#40546d]">{deepDive.simpleEnglish}</Text>
        <View className="mt-4 rounded-[20px] bg-[#fff4df] p-4"><Text className="text-xs font-extrabold uppercase tracking-wider text-[#aa7005]">Hindi explanation</Text><Text className="mt-2 text-base leading-7 text-[#5a3d08]">{deepDive.hindiExplanation}</Text></View>
        <Text className="mb-2 mt-5 text-xs font-extrabold uppercase tracking-wider text-[#718198]">You will learn</Text>
        {deepDive.learningGoals.map((item) => <Bullet key={item} color="#7c5cff">{item}</Bullet>)}
      </Section>

      <Section icon="compass-outline" title="When to use it" color="#146ef5">
        {deepDive.whenToUse.map((item) => <View key={item.situation} className="mb-3 rounded-[20px] border border-white bg-[#edf5ff] p-4"><Text className="font-extrabold text-[#1258a5]">{item.situation}</Text><Text className="mt-1 leading-6 text-[#40546d]">{item.explanation}</Text></View>)}
      </Section>

      <Section icon="git-branch-outline" title="Forms & formulas" color="#18a67e">
        {deepDive.formulaCards.map((item) => <View key={`${item.label}-${item.formula}`} className="mb-4 overflow-hidden rounded-[22px] border border-[#d8eee8] bg-[#effaf6]"><View className="bg-[#dff5ed] px-4 py-2"><Text className="text-xs font-extrabold uppercase tracking-wider text-[#13745c]">{item.label}</Text></View><View className="p-4"><Text className="font-extrabold leading-6 text-[#123d34]">{item.formula}</Text><Text className="mt-3 leading-6 text-[#365f56]">{item.example}</Text><Text className="mt-1 leading-6 text-[#6b5630]">{item.hindi}</Text></View></View>)}
      </Section>

      <Section icon="chatbubbles-outline" title="Bilingual guided examples" color="#7c5cff">
        {deepDive.guidedExamples.map((item, index) => <View key={`${item.english}-${index}`} className="mb-4 rounded-[22px] border border-white bg-[#f5f2ff] p-4"><View className="self-start rounded-full bg-[#e6dfff] px-3 py-1"><Text className="text-[10px] font-extrabold uppercase text-[#654bc0]">{item.context}</Text></View><Text className="mt-3 text-base font-extrabold leading-6 text-[#302663]">{item.english}</Text><Text className="mt-1 leading-6 text-[#6b5685]">{item.hindi}</Text><View className="mt-3 rounded-2xl bg-white/80 p-3"><Text className="text-sm leading-5 text-[#52647b]"><Text className="font-extrabold">Why: </Text>{item.why}</Text></View></View>)}
      </Section>

      <Section icon="swap-horizontal-outline" title="Do not confuse" color="#e6a01d">
        {deepDive.comparisons.map((item) => <View key={`${item.left}-${item.right}`} className="mb-4 rounded-[22px] bg-[#fff8e8] p-4"><View className="flex-row gap-2"><View className="flex-1 rounded-xl bg-white px-3 py-2"><Text className="font-extrabold text-[#9a6707]">{item.left}</Text></View><View className="flex-1 rounded-xl bg-white px-3 py-2"><Text className="font-extrabold text-[#9a6707]">{item.right}</Text></View></View><Text className="mt-3 leading-6 text-[#655333]">{item.difference}</Text><Text className="mt-2 font-semibold leading-6 text-[#40546d]">{item.example}</Text></View>)}
      </Section>

      <Section icon="close-circle-outline" title="Wrong → correct" color="#e35d55">
        {deepDive.mistakes.map((item) => <View key={item.wrong} className="mb-4 overflow-hidden rounded-[22px] border border-[#f6d9d6]"><View className="bg-[#fff0ee] p-3"><Text className="text-xs font-extrabold uppercase text-[#b8423b]">Wrong</Text><Text className="mt-1 font-bold leading-6 text-[#8f342f]">{item.wrong}</Text></View><View className="bg-[#eaf9f3] p-3"><Text className="text-xs font-extrabold uppercase text-[#168263]">Correct</Text><Text className="mt-1 font-bold leading-6 text-[#126e58]">{item.correct}</Text></View><Text className="bg-white p-3 leading-5 text-[#52647b]">{item.why}</Text></View>)}
      </Section>

      <Section icon="bulb-outline" title="Memory shortcuts" color="#7c5cff">
        {deepDive.memoryTips.map((item) => <Bullet key={item} color="#7c5cff">{item}</Bullet>)}
      </Section>

      <Section icon="school-outline" title="Guided mini tasks" color="#146ef5">
        {deepDive.miniTasks.map((task, index) => { const revealed = revealedTasks[task.id]; return <View key={task.id} className="mb-4 rounded-[22px] border border-[#d9e6f5] bg-[#f4f8fd] p-4"><View className="flex-row items-center"><View className="h-8 w-8 items-center justify-center rounded-full bg-[#146ef5]"><Text className="font-extrabold text-white">{index + 1}</Text></View><Text className="ml-3 text-xs font-extrabold uppercase tracking-wider text-[#146ef5]">{task.type}</Text></View><Text className="mt-3 font-extrabold leading-6 text-[#10233f]">{task.prompt}</Text><Text className="mt-2 text-sm leading-5 text-[#718198]">Hint: {task.hint}</Text><Pressable className="mt-3 self-start rounded-xl bg-white px-4 py-2.5" onPress={() => setRevealedTasks((current) => ({ ...current, [task.id]: !revealed }))}><Text className="font-extrabold text-[#146ef5]">{revealed ? 'Hide answer' : 'Check model answer'}</Text></Pressable>{revealed ? <View className="mt-3 rounded-2xl bg-[#e7f8f2] p-4"><Text className="font-extrabold leading-6 text-[#126e58]">{task.modelAnswer}</Text><Text className="mt-2 leading-5 text-[#3f6d61]">{task.explanation}</Text></View> : null}</View>; })}
      </Section>
    </View>
  );
}
function TopicLesson({ topic, onBack }: { topic: GrammarTopic; onBack: () => void }) {
  const queryClient = useQueryClient();
  const lessonScrollRef = useRef<ScrollView>(null);
  const teacherInputRef = useRef<TextInput>(null);
  const [practiceOffset, setPracticeOffset] = useState(0);
  const [teacherOffset, setTeacherOffset] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [question, setQuestion] = useState('');
  const [teacherAnswer, setTeacherAnswer] = useState<string | null>(null);
  const [aiPractice, setAiPractice] = useState<GrammarAiPractice | null>(null);
  const [aiAnswers, setAiAnswers] = useState<Record<string, number>>({});
  const [aiResult, setAiResult] = useState<GrammarAiResult | null>(null);
  const [deepDive, setDeepDive] = useState<GrammarDeepDive | null>(topic.aiDeepDive);

  useEffect(() => setDeepDive(topic.aiDeepDive), [topic.aiDeepDive]);

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
  const deepDiveMutation = useMutation({
    mutationFn: () => fetchGrammarDeepDive(topic.id),
    onSuccess: (data) => {
      setDeepDive(data.deepDive);
      queryClient.setQueryData<GrammarData>(grammarQueryKey, (current) => current ? {
        ...current,
        topics: current.topics.map((item) => item.id === topic.id ? { ...item, aiDeepDive: data.deepDive } : item),
      } : current);
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
    <SafeAreaView className="flex-1 bg-[#eef5f8]" edges={['top']}>
      <View className="border-b border-white/80 bg-[#eef5f8] px-5 pb-3">
        <FadeInView className="overflow-hidden rounded-[26px] border border-white/20 bg-[#0d715d] px-5 pb-4 pt-4" style={heroShadow}>
          <View className="absolute -left-12 -bottom-16 h-32 w-32 rounded-full bg-[#68e0bb]/15" />
          <View className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <View className="flex-row items-start">
            <Pressable className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white/15 active:opacity-70" onPress={onBack}><Ionicons name="arrow-back" size={21} color="white" /></Pressable>
            <View className="min-w-0 flex-1 pr-2">
              <Text className="text-[10px] font-extrabold uppercase tracking-wider text-[#aee8d8]">{topic.category}</Text>
              <Text className="mt-0.5 text-xl font-extrabold leading-7 text-white" numberOfLines={1}>{topic.title}</Text>
              <Text className="mt-1 text-xs leading-4 text-[#d5f5eb]" numberOfLines={1}>{topic.summary}</Text>
            </View>
            <View className="rounded-full bg-white/15 px-2.5 py-1.5"><Text className="text-[10px] font-bold text-white">{topic.estimatedMinutes}m</Text></View>
          </View>
          <View className="mt-3 flex-row gap-2">
            <Pressable disabled={generateAiPractice.isPending} className="flex-1 items-center justify-center rounded-2xl bg-white/15 px-2 py-2.5 active:opacity-70" onPress={() => { generateAiPractice.mutate(); lessonScrollRef.current?.scrollTo({ y: practiceOffset, animated: true }); }}>
              {generateAiPractice.isPending ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="sparkles-outline" size={19} color="white" />}
              <Text className="mt-1 text-center text-[10px] font-extrabold text-white">Fresh practice</Text>
            </Pressable>
            <Pressable className="flex-1 items-center justify-center rounded-2xl bg-white/15 px-2 py-2.5 active:opacity-70" onPress={() => { lessonScrollRef.current?.scrollTo({ y: teacherOffset, animated: true }); setTimeout(() => teacherInputRef.current?.focus(), 350); }}>
              <Ionicons name="chatbubble-ellipses-outline" size={19} color="white" />
              <Text className="mt-1 text-center text-[10px] font-extrabold text-white">Ask teacher</Text>
            </Pressable>
            <Pressable disabled={progress.isPending || completed} className={`flex-1 items-center justify-center rounded-2xl px-2 py-2.5 active:opacity-70 ${completed ? 'bg-[#69c9ad]' : 'bg-white'}`} onPress={() => progress.mutate({ topicId: topic.id, action: 'complete', score: quizScore ?? undefined })}>
              {progress.isPending ? <ActivityIndicator size="small" color={completed ? 'white' : '#0d715d'} /> : <Ionicons name={completed ? 'checkmark-circle' : 'flag-outline'} size={19} color={completed ? 'white' : '#0d715d'} />}
              <Text className={`mt-1 text-center text-[10px] font-extrabold ${completed ? 'text-white' : 'text-[#0d715d]'}`}>{completed ? 'Completed' : 'Mark lesson'}</Text>
            </Pressable>
          </View>
        </FadeInView>
      </View>
      <ScrollView ref={lessonScrollRef} contentContainerClassName="px-5 pb-28" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
        <AiDeepLearningPanel
          deepDive={deepDive}
          loading={deepDiveMutation.isPending}
          error={deepDiveMutation.error?.message ?? null}
          onGenerate={() => deepDiveMutation.mutate()}
        />
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

        <View onLayout={(event) => setPracticeOffset(event.nativeEvent.layout.y)}><Section icon="sparkles-outline" title="AI practice lab" color="#7c5cff">
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
        </Section></View>

        <View onLayout={(event) => setTeacherOffset(event.nativeEvent.layout.y)}>
          <FadeInView className="mt-4 overflow-hidden rounded-[30px] border border-white/15 bg-[#172d50] p-5" style={heroShadow}>
          <View className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#4f8dff]/20" />
          <View className="flex-row items-center"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><Ionicons name="sparkles" size={23} color="#8dc5ff" /></View><View className="ml-3"><Text className="text-xl font-extrabold text-white">Ask AI grammar teacher</Text><Text className="text-sm text-[#b8cce2]">Solve a doubt about this lesson</Text></View></View>
          <TextInput ref={teacherInputRef} className="mt-4 min-h-24 rounded-2xl bg-white px-4 py-3 text-base leading-6 text-[#10233f]" value={question} onChangeText={setQuestion} placeholder="Example: Why can I not use present perfect with yesterday?" placeholderTextColor="#8291a4" multiline textAlignVertical="top" />
          <Pressable disabled={askTeacher.isPending || question.trim().length < 3} className={`mt-3 items-center rounded-2xl py-3.5 ${question.trim().length >= 3 ? 'bg-[#146ef5]' : 'bg-[#53657c]'}`} onPress={submitQuestion}>{askTeacher.isPending ? <ActivityIndicator color="white" /> : <Text className="font-extrabold text-white">Ask teacher</Text>}</Pressable>
          {teacherAnswer ? <View className="mt-4 rounded-2xl bg-white/10 p-4"><Text className="leading-6 text-[#e5eef8]">{teacherAnswer}</Text></View> : null}
        </FadeInView></View>
      </ScrollView>
    </SafeAreaView>
  );
}
type SharedGrammarEvent = { topicId: string; deepDive: GrammarDeepDive };
const realtimeError = (error: unknown) => error instanceof Error ? error.message : 'Grammar realtime failed.';

export function GrammarScreen() {
  const client = useMemo(
    () => new Ably.Realtime({
      autoConnect: true,
      authCallback: (_params, callback) => {
        fetchGrammarToken()
          .then((token) => callback(null, token))
          .catch((error) => callback(realtimeError(error), null));
      },
    }),
    [],
  );
  useEffect(() => () => client.close(), [client]);
  return (
    <AblyProvider client={client}>
      <ChannelProvider channelName="grammar:catalogue">
        <GrammarCatalogue />
      </ChannelProvider>
    </AblyProvider>
  );
}

function GrammarCatalogue() {
  const queryClient = useQueryClient();
  const grammar = useQuery({ queryKey: grammarQueryKey, queryFn: fetchGrammar });
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const selectedTopic = grammar.data?.topics.find((topic) => topic.id === selectedTopicId);

  useChannel('grammar:catalogue', (event) => {
    if (event.name !== 'grammar-deep-dive-ready') return;
    const data = event.data as SharedGrammarEvent;
    queryClient.setQueryData<GrammarData>(grammarQueryKey, (current) => current ? {
      ...current,
      topics: current.topics.map((topic) => topic.id === data.topicId ? { ...topic, aiDeepDive: data.deepDive } : topic),
    } : current);
  });
  const filteredTopics = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (grammar.data?.topics ?? []).filter((topic) =>
      (category === 'All' || topic.category === category) &&
      (!query || `${topic.title} ${topic.summary} ${topic.structures.join(' ')}`.toLowerCase().includes(query)),
    );
  }, [category, grammar.data?.topics, search]);

  if (selectedTopic) return <TopicLesson key={selectedTopic.id} topic={selectedTopic} onBack={() => setSelectedTopicId(null)} />;
  if (grammar.isPending) return <SafeAreaView className="flex-1 items-center justify-center bg-[#eef5f8]"><ActivityIndicator size="large" color="#18a67e" /></SafeAreaView>;
  if (grammar.error) return <SafeAreaView className="flex-1 items-center justify-center bg-[#eef5f8] px-6"><Ionicons name="cloud-offline-outline" size={42} color="#e35d55" /><Text className="mt-4 text-center font-semibold text-[#10233f]">{grammar.error.message}</Text><Pressable className="mt-5 rounded-2xl bg-[#18a67e] px-6 py-3" onPress={() => grammar.refetch()}><Text className="font-bold text-white">Try again</Text></Pressable></SafeAreaView>;

  const completedPercent = grammar.data?.stats.total ? Math.round((grammar.data.stats.completed / grammar.data.stats.total) * 100) : 0;
  return (
    <SafeAreaView className="flex-1 bg-[#eef5f8]" edges={['top']}>
      <View className="flex-row items-center px-5 pb-3 pt-3">
        <Pressable className="h-11 w-11 items-center justify-center rounded-full border border-white bg-white/90" style={glassShadow} onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color="#10233f" /></Pressable>
        <View className="ml-4"><Text className="text-2xl font-extrabold text-[#10233f]">Grammar academy</Text><Text className="text-sm text-[#718198]">Rules made clear and practical</Text></View>
      </View>
      <ScrollView contentContainerClassName="pb-28" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
        <FadeInView className="mx-5 mt-2 overflow-hidden rounded-[30px] border border-white/20 bg-[#0d715d] p-6" style={heroShadow}>
          <View className="absolute -left-12 -bottom-16 h-36 w-36 rounded-full bg-[#77e8c6]/15" />
          <View className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
          <Text className="text-sm font-bold uppercase tracking-wider text-[#b8eadb]">Your grammar journey</Text>
          <Text className="mt-2 text-3xl font-extrabold text-white">{completedPercent}% complete</Text>
          <Text className="mt-2 text-[#d5f5eb]">{grammar.data?.stats.completed ?? 0} of {grammar.data?.stats.total ?? 0} lessons mastered</Text>
          <View className="mt-5 h-3 overflow-hidden rounded-full bg-white/15"><View className="h-full rounded-full bg-white" style={{ width: `${completedPercent}%` }} /></View>
          <View className="mt-5 flex-row"><View className="mr-5"><Text className="text-2xl font-extrabold text-white">{grammar.data?.stats.averageScore ?? 0}%</Text><Text className="text-xs text-[#b8eadb]">Average quiz</Text></View><View><Text className="text-2xl font-extrabold text-white">{grammar.data?.stats.inProgress ?? 0}</Text><Text className="text-xs text-[#b8eadb]">In progress</Text></View></View>
        </FadeInView>

        <View className="mx-5 mt-4 flex-row items-center rounded-[22px] border border-white/90 bg-white/90 px-4 py-2" style={glassShadow}><Ionicons name="search" size={20} color="#718198" /><TextInput className="ml-3 min-h-11 flex-1 text-base text-[#10233f]" value={search} onChangeText={setSearch} placeholder="Search a grammar topic or structure..." placeholderTextColor="#8b99aa" />{search ? <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={21} color="#96a4b6" /></Pressable> : null}</View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5 py-4">
          {['All', ...(grammar.data?.categories ?? [])].map((item) => <Pressable key={item} className={`rounded-full px-4 py-2.5 ${category === item ? 'bg-[#18a67e]' : 'bg-white'}`} onPress={() => setCategory(item)}><Text className={`font-bold ${category === item ? 'text-white' : 'text-[#52647b]'}`}>{item}</Text></Pressable>)}
        </ScrollView>

        <View className="px-5">
          <View className="mb-3 flex-row items-center justify-between"><Text className="text-xl font-extrabold text-[#10233f]">{category === 'All' ? 'Complete curriculum' : category}</Text><Text className="font-bold text-[#18a67e]">{filteredTopics.length} topics</Text></View>
          {filteredTopics.map((topic) => {
            const complete = topic.progress?.status === 'completed';
            return (
              <Pressable key={topic.id} className="mb-4 overflow-hidden rounded-[26px] border border-white/90 bg-white/90 p-4 active:opacity-75" style={glassShadow} onPress={() => setSelectedTopicId(topic.id)}>
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
