import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Speech from 'expo-speech';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  assessmentQueryKey,
  createAssessmentSession,
  fetchAssessment,
  levelLabel,
  submitAssessment,
  type AssessmentQuestion,
  type AssessmentResult,
} from './assessment-api';

const goals = [
  'Daily conversation',
  'Office communication',
  'Job interview',
  'Grammar accuracy',
  'Vocabulary growth',
  'Pronunciation',
  'Business writing',
  'Speaking confidence',
];
const dailyMinutes = [10, 15, 20, 30, 45];

export function AssessmentScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const queryClient = useQueryClient();
  const assessment = useQuery({
    queryKey: assessmentQueryKey,
    queryFn: fetchAssessment,
  });
  const [phase, setPhase] = useState<
    'setup' | 'questions' | 'writing' | 'result'
  >('setup');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [goal, setGoal] = useState('Office communication');
  const [minutes, setMinutes] = useState(15);
  const [writingSample, setWritingSample] = useState('');
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (assessment.data?.profile?.selectedGoal)
      setGoal(assessment.data.profile.selectedGoal);
    if (assessment.data?.profile?.dailyLearningMinutes)
      setMinutes(assessment.data.profile.dailyLearningMinutes);
  }, [assessment.data]);

  useEffect(() => {
    if (params.view === 'result' && assessment.data?.result) {
      setResult(assessment.data.result);
      setOverallScore(assessment.data.result.overallScore);
      setPhase('result');
    }
  }, [assessment.data?.result, params.view]);

  const question = questions[questionIndex];
  const progress = questions.length
    ? Math.round(((questionIndex + 1) / questions.length) * 100)
    : 0;

  const sessionMutation = useMutation({
    mutationFn: createAssessmentSession,
    onSuccess: (data) => {
      setQuestions(data.questions);
      setSessionId(data.sessionId);
      setAnswers({});
      setWritingSample('');
      setQuestionIndex(0);
      setPhase('questions');
    },
    onError: (cause) =>
      setError(
        cause instanceof Error
          ? cause.message
          : 'A fresh assessment could not be generated.',
      ),
  });

  const mutation = useMutation({
    mutationFn: submitAssessment,
    onSuccess: async (data) => {
      setResult(data.result);
      setOverallScore(data.overallScore);
      setPhase('result');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: assessmentQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['progress'] }),
      ]);
    },
    onError: (cause) =>
      setError(
        cause instanceof Error
          ? cause.message
          : 'Assessment could not be saved.',
      ),
  });

  const canContinue = useMemo(
    () => Boolean(question && answers[question.id]),
    [answers, question],
  );

  const startAssessment = () => {
    setError(null);
    sessionMutation.mutate({
      selectedGoal: goal,
      dailyLearningMinutes: minutes,
    });
  };

  const nextQuestion = () => {
    if (!canContinue) return;
    if (questionIndex === questions.length - 1) setPhase('writing');
    else setQuestionIndex((index) => index + 1);
  };

  const finishAssessment = () => {
    setError(null);
    if (writingSample.trim().length < 20) {
      setError('Write at least 20 characters so we can assess your writing.');
      return;
    }
    if (!sessionId) {
      setError('Assessment session is missing. Start a fresh assessment.');
      setPhase('setup');
      return;
    }
    mutation.mutate({
      sessionId,
      answers,
      writingSample: writingSample.trim(),
    });
  };

  if (assessment.isPending) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#edf6ff]">
        <ActivityIndicator color="#146ef5" size="large" />
        <Text className="mt-3 font-semibold text-[#66778e]">
          Preparing your assessment…
        </Text>
      </SafeAreaView>
    );
  }

  if (assessment.error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#edf6ff] px-6">
        <Ionicons name="cloud-offline-outline" size={40} color="#ef6c62" />
        <Text className="mt-4 text-center text-base font-semibold text-[#10233f]">
          {assessment.error.message}
        </Text>
        <Pressable
          className="mt-5 rounded-2xl bg-[#146ef5] px-6 py-3"
          onPress={() => assessment.refetch()}
        >
          <Text className="font-bold text-white">Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (phase === 'result' && result) {
    const displayScore = overallScore ?? result.overallScore ?? 0;
    return (
      <SafeAreaView className="flex-1 bg-[#edf6ff]" edges={['top']}>
        <ScrollView contentContainerClassName="items-center px-5 pb-10 pt-8">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-[#dff8ed]">
            <Ionicons name="trophy" size={48} color="#18a67e" />
          </View>
          <Text className="mt-6 text-center text-3xl font-extrabold text-[#10233f]">
            Assessment complete
          </Text>
          <Text className="mt-2 text-center leading-6 text-[#66778e]">
            Your learning plan will now match your current level and goal.
          </Text>
          <View className="mt-7 w-full rounded-[30px] bg-[#146ef5] p-6">
            <Text className="text-sm font-bold tracking-wide text-blue-100">
              YOUR ENGLISH LEVEL
            </Text>
            <Text className="mt-2 text-3xl font-extrabold text-white">
              {levelLabel(result.assignedLevel)}
            </Text>
            <Text className="mt-2 text-base font-semibold text-blue-100">
              Overall score: {displayScore}%
            </Text>
          </View>
          <View className="mt-4 w-full flex-row flex-wrap justify-between gap-y-3">
            {[
              ['Grammar', result.grammarScore],
              ['Vocabulary', result.vocabularyScore],
              ['Listening', result.listeningScore],
              ['Writing', result.writingScore],
            ].map(([label, score]) => (
              <View
                key={String(label)}
                className="w-[48%] rounded-3xl bg-white p-4"
              >
                <Text className="text-sm font-semibold text-[#75859a]">
                  {label}
                </Text>
                <Text className="mt-2 text-2xl font-extrabold text-[#10233f]">
                  {score ?? 0}%
                </Text>
              </View>
            ))}
          </View>
          <View className="mt-4 w-full rounded-[28px] border border-white bg-white/90 p-5">
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#fff3d9]">
                <Ionicons name="bulb" size={22} color="#e6a01d" />
              </View>
              <Text className="ml-3 text-lg font-extrabold text-[#10233f]">
                AI teacher feedback
              </Text>
            </View>
            <Text className="mt-3 leading-6 text-[#66778e]">
              {result.teacherFeedback ??
                'Complete a new AI assessment to receive detailed mistake feedback.'}
            </Text>
            {result.writingFeedback ? (
              <Text className="mt-3 leading-6 text-[#66778e]">
                Writing: {result.writingFeedback}
              </Text>
            ) : null}
          </View>
          {result.recommendations.length ? (
            <View className="mt-4 w-full">
              <Text className="mb-3 text-xl font-extrabold text-[#10233f]">
                What to learn next
              </Text>
              {result.recommendations.map((item) => (
                <View key={item.skill} className="mb-3 rounded-3xl bg-white p-4">
                  <Text className="font-extrabold text-[#10233f]">
                    {item.title}
                  </Text>
                  <Text className="mt-1 leading-5 text-[#6b7b91]">
                    {item.reason}
                  </Text>
                  <Text className="mt-2 text-sm font-bold text-[#146ef5]">
                    {item.mistakes} {item.mistakes === 1 ? 'mistake' : 'mistakes'} in this area
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {result.review.some((item) => !item.isCorrect) ? (
            <View className="mt-3 w-full">
              <Text className="mb-3 text-xl font-extrabold text-[#10233f]">
                Review your mistakes
              </Text>
              {result.review
                .filter((item) => !item.isCorrect)
                .map((item) => (
                  <View key={item.questionId} className="mb-3 rounded-3xl border border-red-100 bg-white p-5">
                    <Text className="text-xs font-bold uppercase tracking-wide text-[#ef6c62]">
                      {item.skill}
                    </Text>
                    <Text className="mt-2 font-bold leading-6 text-[#10233f]">
                      {item.prompt}
                    </Text>
                    <Text className="mt-3 text-[#a34b45]">
                      Your answer: {item.selectedText}
                    </Text>
                    <Text className="mt-1 font-semibold text-[#16815f]">
                      Correct answer: {item.correctText}
                    </Text>
                    <Text className="mt-3 leading-5 text-[#66778e]">
                      {item.explanation}
                    </Text>
                  </View>
                ))}
            </View>
          ) : null}
          <Pressable
            className="mt-7 w-full items-center rounded-2xl bg-[#10233f] py-4"
            onPress={() => router.replace('/(tabs)')}
          >
            <Text className="text-base font-bold text-white">
              Go to my learning plan
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (phase === 'writing') {
    return (
      <SafeAreaView className="flex-1 bg-[#edf6ff]" edges={['top']}>
        <ScrollView
          contentContainerClassName="px-5 pb-10 pt-4"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          <Pressable
            className="mb-5 h-11 w-11 items-center justify-center rounded-full bg-white"
            onPress={() => setPhase('questions')}
          >
            <Ionicons name="arrow-back" size={22} color="#10233f" />
          </Pressable>
          <Text className="text-sm font-bold text-[#146ef5]">FINAL TASK</Text>
          <Text className="mt-2 text-3xl font-extrabold text-[#10233f]">
            Short workplace message
          </Text>
          <Text className="mt-3 leading-6 text-[#66778e]">
            Write a polite message telling your manager that your report will be
            one day late and when you will send it.
          </Text>
          <TextInput
            className="mt-6 min-h-44 rounded-[26px] border border-white bg-white/90 p-5 text-base leading-6 text-[#10233f]"
            multiline
            onChangeText={setWritingSample}
            placeholder="Hello…"
            placeholderTextColor="#9aa8b8"
            textAlignVertical="top"
            value={writingSample}
          />
          <Text className="mt-2 text-right text-sm text-[#7c8ca0]">
            {writingSample.length}/1000
          </Text>
          {error ? (
            <Text className="mt-3 rounded-2xl bg-red-50 p-3 text-red-600">
              {error}
            </Text>
          ) : null}
          <Pressable
            className={`mt-5 items-center rounded-2xl py-4 ${mutation.isPending ? 'bg-[#8fbaf0]' : 'bg-[#146ef5]'}`}
            disabled={mutation.isPending}
            onPress={finishAssessment}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-bold text-white">
                Finish assessment
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (phase === 'questions' && question) {
    return (
      <SafeAreaView className="flex-1 bg-[#edf6ff]" edges={['top']}>
        <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
          <View className="flex-row items-center">
            <Pressable
              className="h-11 w-11 items-center justify-center rounded-full bg-white"
              onPress={() =>
                questionIndex === 0
                  ? setPhase('setup')
                  : setQuestionIndex((index) => index - 1)
              }
            >
              <Ionicons name="arrow-back" size={22} color="#10233f" />
            </Pressable>
            <View className="ml-4 flex-1">
              <View className="h-2 overflow-hidden rounded-full bg-white">
                <View
                  className="h-full rounded-full bg-[#146ef5]"
                  style={{ width: `${progress}%` }}
                />
              </View>
              <Text className="mt-2 text-right text-xs font-semibold text-[#75859a]">
                {questionIndex + 1} of {questions.length}
              </Text>
            </View>
          </View>
          <Text className="mt-7 text-sm font-bold uppercase tracking-wide text-[#146ef5]">
            {question.skill}
          </Text>
          <Text className="mt-2 text-2xl font-extrabold leading-8 text-[#10233f]">
            {question.prompt}
          </Text>
          {question.spokenText ? (
            <Pressable
              className="mt-5 flex-row items-center self-start rounded-2xl bg-[#e0edff] px-4 py-3"
              onPress={() =>
                Speech.speak(question.spokenText!, {
                  language: 'en-US',
                  rate: 0.85,
                })
              }
            >
              <Ionicons name="volume-high" size={21} color="#146ef5" />
              <Text className="ml-2 font-bold text-[#146ef5]">Play audio</Text>
            </Pressable>
          ) : null}
          <View className="mt-6">
            {question.options.map((option) => {
              const selected = answers[question.id] === option.id;
              return (
                <Pressable
                  key={option.id}
                  className={`mb-3 flex-row items-center rounded-3xl border p-4 ${selected ? 'border-[#146ef5] bg-[#e4efff]' : 'border-white bg-white/85'}`}
                  onPress={() =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: option.id,
                    }))
                  }
                >
                  <View
                    className={`h-9 w-9 items-center justify-center rounded-full ${selected ? 'bg-[#146ef5]' : 'bg-[#edf2f8]'}`}
                  >
                    <Text
                      className={`font-extrabold ${selected ? 'text-white' : 'text-[#617187]'}`}
                    >
                      {option.id.toUpperCase()}
                    </Text>
                  </View>
                  <Text className="ml-3 flex-1 text-base font-semibold leading-6 text-[#10233f]">
                    {option.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            className={`mt-4 items-center rounded-2xl py-4 ${canContinue ? 'bg-[#146ef5]' : 'bg-[#b9c8d8]'}`}
            disabled={!canContinue}
            onPress={nextQuestion}
          >
            <Text className="text-base font-bold text-white">
              {questionIndex === questions.length - 1
                ? 'Continue to writing'
                : 'Next question'}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const previous = assessment.data?.result;
  return (
    <SafeAreaView className="flex-1 bg-[#edf6ff]" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <Pressable
          className="h-11 w-11 items-center justify-center rounded-full bg-white"
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={23} color="#10233f" />
        </Pressable>
        <View className="mt-6 rounded-[32px] bg-[#146ef5] p-6">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
            <Ionicons name="sparkles" size={29} color="white" />
          </View>
          <Text className="mt-5 text-3xl font-extrabold leading-10 text-white">
            Discover your English level
          </Text>
          <Text className="mt-3 leading-6 text-blue-100">
            10 quick questions, one listening activity, and a short writing
            task. About 7 minutes.
          </Text>
          {previous ? (
            <Text className="mt-4 font-bold text-white">
              Current level: {levelLabel(previous.assignedLevel)}
            </Text>
          ) : null}
        </View>
        <Text className="mt-7 text-lg font-extrabold text-[#10233f]">
          What is your main goal?
        </Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {goals.map((item) => (
            <Pressable
              key={item}
              className={`rounded-full px-4 py-3 ${goal === item ? 'bg-[#10233f]' : 'bg-white'}`}
              onPress={() => setGoal(item)}
            >
              <Text
                className={`font-semibold ${goal === item ? 'text-white' : 'text-[#56677e]'}`}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text className="mt-7 text-lg font-extrabold text-[#10233f]">
          Daily learning time
        </Text>
        <View className="mt-3 flex-row justify-between">
          {dailyMinutes.map((value) => (
            <Pressable
              key={value}
              className={`h-14 w-[18%] items-center justify-center rounded-2xl ${minutes === value ? 'bg-[#146ef5]' : 'bg-white'}`}
              onPress={() => setMinutes(value)}
            >
              <Text
                className={`font-extrabold ${minutes === value ? 'text-white' : 'text-[#56677e]'}`}
              >
                {value}
              </Text>
              <Text
                className={`text-[10px] ${minutes === value ? 'text-blue-100' : 'text-[#8795a7]'}`}
              >
                min
              </Text>
            </Pressable>
          ))}
        </View>
        {error ? (
          <Text className="mt-5 rounded-2xl bg-red-50 p-3 text-red-600">
            {error}
          </Text>
        ) : null}
        <Pressable
          className={`mt-8 items-center rounded-2xl py-4 ${sessionMutation.isPending ? 'bg-[#8fbaf0]' : 'bg-[#146ef5]'}`}
          disabled={sessionMutation.isPending}
          onPress={startAssessment}
        >
          {sessionMutation.isPending ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="white" />
              <Text className="ml-3 text-base font-bold text-white">
                AI is creating fresh questions...
              </Text>
            </View>
          ) : (
            <Text className="text-base font-bold text-white">
              {previous
                ? 'Generate a new assessment'
                : 'Generate my assessment'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
