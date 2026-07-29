import {
  conversationScenarios, db, grammarTopics, learningActivityEvents, studyRoomActivities,
  studyRoomAnswers, studyRoomMembers, studyRooms, userGrammarProgress, userProgress, vocabulary,
} from '@english-coach/database';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { publishStudyEvent } from '@/lib/ably';
import { auth } from '@/lib/auth';
import { generateGroupActivity } from '@/lib/group-activity-generator';

export const runtime = 'nodejs';
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start'), activityType: z.enum(['grammar', 'vocabulary', 'discussion']), sourceId: z.string().uuid().optional(), category: z.string().trim().min(1).max(80).optional(), level: z.string().trim().min(1).max(40).optional() }),
  z.object({ action: z.literal('submit'), activityId: z.string().uuid(), answer: z.union([z.number().int(), z.string().trim().min(1).max(1000)]) }),
  z.object({ action: z.literal('end'), activityId: z.string().uuid() }),
]);

function shuffled<T>(values: T[]) { return [...values].sort(() => Math.random() - 0.5); }

export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: parsed.error.issues[0]?.message ?? 'Invalid activity request.' }, { status: 400 });
  const { roomId } = await params;
  const [room] = await db.select().from(studyRooms).where(and(eq(studyRooms.id, roomId), eq(studyRooms.status, 'in-progress'))).limit(1);
  const [member] = await db.select().from(studyRoomMembers).where(and(eq(studyRoomMembers.roomId, roomId), eq(studyRoomMembers.userId, session.user.id), eq(studyRoomMembers.status, 'joined'))).limit(1);
  if (!room || !member) return Response.json({ message: 'Active room membership is required.' }, { status: 403 });

  const data = parsed.data;
  if (data.action === 'start') {
    if (room.hostUserId !== session.user.id) return Response.json({ message: 'Only the host can start an activity.' }, { status: 403 });
    if (room.currentActivityId) await db.update(studyRoomActivities).set({ status: 'completed', endedAt: new Date(), updatedAt: new Date() }).where(eq(studyRoomActivities.id, room.currentActivityId));
    let title = ''; let content: Record<string, unknown> = {}; let answerKey: Record<string, unknown> | null = null;

    if (data.activityType === 'grammar') {
      const [topic] = data.sourceId
        ? await db.select().from(grammarTopics).where(and(eq(grammarTopics.id, data.sourceId), eq(grammarTopics.status, 'published'))).limit(1)
        : await db.select().from(grammarTopics).where(eq(grammarTopics.status, 'published')).orderBy(sql`random()`).limit(1);
      if (!topic) return Response.json({ message: 'Grammar lesson not found.' }, { status: 404 });
      const generated = await generateGroupActivity({ activityType: 'grammar', title: topic.title, level: topic.level, sourceMaterial: { summary: topic.summary, explanation: topic.explanation, structures: topic.structures, rules: topic.rules, exceptions: topic.exceptions, tips: topic.tips, examples: topic.examples } });
      const fallbackQuestion = topic.practiceQuestions[Math.floor(Math.random() * topic.practiceQuestions.length)];
      if (!generated && !fallbackQuestion) return Response.json({ message: 'This grammar lesson has no practice question yet.' }, { status: 503 });
      title = topic.title;
      content = { kind: 'grammar', sourceId: topic.id, level: topic.level, category: topic.category, summary: topic.summary, explanation: topic.explanation, structures: topic.structures, rules: topic.rules, exceptions: topic.exceptions, tips: topic.tips, keyVocabulary: topic.keyVocabulary, examples: generated?.examples ?? topic.examples.slice(0, 4), question: { question: generated?.question ?? fallbackQuestion!.question, options: generated?.options ?? fallbackQuestion!.options }, aiGenerated: Boolean(generated) };
      answerKey = { answer: generated?.answer ?? fallbackQuestion!.answer, explanation: generated?.explanation ?? fallbackQuestion!.explanation };
    } else if (data.activityType === 'vocabulary') {
      const filters = [eq(vocabulary.status, 'published')];
      if (data.category) filters.push(eq(vocabulary.category, data.category));
      if (data.level) filters.push(eq(vocabulary.level, data.level as typeof vocabulary.level.enumValues[number]));
      const words = await db.select().from(vocabulary).where(and(...filters)).orderBy(sql`random()`).limit(8);
      if (words.length < 4) return Response.json({ message: 'This vocabulary pack needs at least four published words.' }, { status: 503 });
      const target = words[0]!;
      const generated = await generateGroupActivity({ activityType: 'vocabulary', title: data.category ?? 'Vocabulary practice', level: data.level ?? target.level, sourceMaterial: { words: words.map(({ word, meaning, hindiMeaning, partOfSpeech, example, officeExample, synonyms, phrasePatterns }) => ({ word, meaning, hindiMeaning, partOfSpeech, example, officeExample, synonyms, phrasePatterns })) } });
      const fallbackOptions = shuffled(words.slice(0, 4).map((word) => word.meaning));
      title = data.category ? `${data.category} vocabulary` : 'Vocabulary practice';
      content = { kind: 'vocabulary', category: data.category ?? target.category, level: data.level ?? target.level, words: words.map(({ id, word, meaning, hindiMeaning, partOfSpeech, pronunciation, example, officeExample, synonyms, phrasePatterns }) => ({ id, word, meaning, hindiMeaning, partOfSpeech, pronunciation, example, officeExample, synonyms, phrasePatterns })), examples: generated?.examples ?? words.slice(0, 3).flatMap((word) => word.example ? [word.example] : []), question: { question: generated?.question ?? `What does “${target.word}” mean?`, options: generated?.options ?? fallbackOptions }, aiGenerated: Boolean(generated) };
      answerKey = { answer: generated?.answer ?? fallbackOptions.indexOf(target.meaning), explanation: generated?.explanation ?? `${target.word}: ${target.meaning}${target.example ? ` Example: ${target.example}` : ''}` };
    } else {
      const [scenario] = data.sourceId
        ? await db.select().from(conversationScenarios).where(and(eq(conversationScenarios.id, data.sourceId), eq(conversationScenarios.status, 'published'))).limit(1)
        : await db.select().from(conversationScenarios).where(eq(conversationScenarios.status, 'published')).orderBy(sql`random()`).limit(1);
      if (!scenario) return Response.json({ message: 'Discussion lesson not found.' }, { status: 404 });
      const generated = await generateGroupActivity({ activityType: 'discussion', title: scenario.title, level: scenario.level, sourceMaterial: { description: scenario.description, teachingGoal: scenario.systemPrompt, category: scenario.category } });
      title = scenario.title;
      content = { kind: 'discussion', sourceId: scenario.id, level: scenario.level, category: scenario.category, prompt: generated?.question ?? scenario.description ?? scenario.systemPrompt, examples: generated?.examples ?? [], instruction: 'Write a helpful English response and discuss it with the group.', aiGenerated: Boolean(generated) };
    }
    const [activity] = await db.insert(studyRoomActivities).values({ roomId, createdBy: session.user.id, activityType: data.activityType, title, content, answerKey }).returning();
    if (!activity) return Response.json({ message: 'Could not start activity.' }, { status: 503 });
    await db.update(studyRooms).set({ currentActivityId: activity.id, updatedAt: new Date() }).where(eq(studyRooms.id, roomId));
    const safeActivity = { id: activity.id, activityType: activity.activityType, title: activity.title, content: activity.content, status: activity.status, startedAt: activity.startedAt, answerCount: 0, myAnswer: null };
    await publishStudyEvent(roomId, 'activity-updated', safeActivity).catch(() => undefined);
    return Response.json({ activity: safeActivity });
  }

  const [activity] = await db.select().from(studyRoomActivities).where(and(eq(studyRoomActivities.id, data.activityId), eq(studyRoomActivities.roomId, roomId), eq(studyRoomActivities.status, 'in-progress'))).limit(1);
  if (!activity) return Response.json({ message: 'This activity is no longer active.' }, { status: 409 });
  if (data.action === 'end') {
    if (room.hostUserId !== session.user.id) return Response.json({ message: 'Only the host can end an activity.' }, { status: 403 });
    await db.update(studyRoomActivities).set({ status: 'completed', endedAt: new Date(), updatedAt: new Date() }).where(eq(studyRoomActivities.id, activity.id));
    await db.update(studyRooms).set({ currentActivityId: null, updatedAt: new Date() }).where(eq(studyRooms.id, roomId));
    await publishStudyEvent(roomId, 'activity-updated', null).catch(() => undefined);
    return Response.json({ ended: true });
  }
  const [existingAnswer] = await db.select({ id: studyRoomAnswers.id }).from(studyRoomAnswers).where(and(eq(studyRoomAnswers.activityId, activity.id), eq(studyRoomAnswers.userId, session.user.id))).limit(1);
  if (existingAnswer) return Response.json({ message: 'You already submitted this activity.' }, { status: 409 });
  const key = activity.answerKey as { answer?: number; explanation?: string } | null;
  const isDiscussion = activity.activityType === 'discussion';
  const isCorrect = isDiscussion ? typeof data.answer === 'string' && data.answer.trim().length >= 3 : typeof data.answer === 'number' && data.answer === key?.answer;
  const score = isCorrect ? 100 : 0;
  await db.insert(studyRoomAnswers).values({ activityId: activity.id, userId: session.user.id, answer: data.answer, isCorrect, score });
  const progressDate = new Date().toISOString().slice(0, 10);
  const skillType = activity.activityType === 'grammar' ? 'grammar' : activity.activityType === 'vocabulary' ? 'vocabulary' : 'speaking';
  await Promise.all([
    db.insert(learningActivityEvents).values({ userId: session.user.id, skillType, activityType: `group-${activity.activityType}`, entityId: activity.id, durationSeconds: 180, score, metadata: { roomId, sourceId: activity.content.sourceId ?? null } }),
    db.insert(userProgress).values({ userId: session.user.id, progressDate, learningMinutes: 3, wordsLearned: activity.activityType === 'vocabulary' && isCorrect ? 1 : 0, grammarScore: activity.activityType === 'grammar' ? score : null, vocabularyScore: activity.activityType === 'vocabulary' ? score : null }).onConflictDoUpdate({ target: [userProgress.userId, userProgress.progressDate], set: { learningMinutes: sql`${userProgress.learningMinutes} + 3`, wordsLearned: activity.activityType === 'vocabulary' && isCorrect ? sql`${userProgress.wordsLearned} + 1` : sql`${userProgress.wordsLearned}`, ...(activity.activityType === 'grammar' ? { grammarScore: score } : {}), ...(activity.activityType === 'vocabulary' ? { vocabularyScore: score } : {}), updatedAt: new Date() } }),
  ]);
  if (activity.activityType === 'grammar' && typeof activity.content.sourceId === 'string') {
    const [grammarProgress] = await db.select().from(userGrammarProgress).where(and(eq(userGrammarProgress.userId, session.user.id), eq(userGrammarProgress.grammarTopicId, activity.content.sourceId))).limit(1);
    const progressValues = { status: (isCorrect ? 'completed' : 'in-progress') as 'completed' | 'in-progress', completionPercentage: isCorrect ? 100 : Math.max(grammarProgress?.completionPercentage ?? 0, 40), bestScore: Math.max(grammarProgress?.bestScore ?? 0, score), attempts: (grammarProgress?.attempts ?? 0) + 1, completedAt: isCorrect ? new Date() : grammarProgress?.completedAt, updatedAt: new Date() };
    if (grammarProgress) await db.update(userGrammarProgress).set(progressValues).where(eq(userGrammarProgress.id, grammarProgress.id));
    else await db.insert(userGrammarProgress).values({ userId: session.user.id, grammarTopicId: activity.content.sourceId, ...progressValues });
  }
  await publishStudyEvent(roomId, 'answer-submitted', { activityId: activity.id, userId: session.user.id, name: session.user.name, score }).catch(() => undefined);
  return Response.json({ isCorrect, score, explanation: key?.explanation ?? (isDiscussion ? 'Response shared with the group.' : 'Review the lesson and try again.') });
}