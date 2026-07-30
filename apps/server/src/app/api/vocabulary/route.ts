import {
  db,
  learningActivityEvents,
  userProfiles,
  userProgress,
  userVocabulary,
  vocabulary,
} from '@english-coach/database';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { publishVocabularyEvent } from '@/lib/ably';
import { auth } from '@/lib/auth';
import { generateVocabularyPack } from '@/lib/vocabulary-generator';

export const runtime = 'nodejs';

const categories = [
  'Daily Conversation',
  'Office & Meetings',
  'Business Email',
  'Customer Service',
  'Job Interviews',
  'Travel',
  'Feelings',
  'Technology',
  'Study & Academic',
  'Phrasal Verbs',
  'Idioms',
  'Gen Z & Slang',
] as const;

const reviewSchema = z.object({
  vocabularyId: z.string().uuid(),
  action: z.enum(['learning', 'difficult', 'remembered']),
});

function dailyRank(seed: string, id: string) {
  let value = 2166136261;
  for (const character of `${seed}:${id}`) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

const devanagariToRoman: Record<string, string> = {
  '\u0905': 'a', '\u0906': 'aa', '\u0907': 'i', '\u0908': 'ee', '\u0909': 'u', '\u090a': 'oo', '\u090f': 'e', '\u0910': 'ai', '\u0913': 'o', '\u0914': 'au',
  '\u0915': 'k', '\u0916': 'kh', '\u0917': 'g', '\u0918': 'gh', '\u091a': 'ch', '\u091b': 'chh', '\u091c': 'j', '\u091d': 'jh', '\u091f': 't', '\u0920': 'th',
  '\u0921': 'd', '\u0922': 'dh', '\u0924': 't', '\u0925': 'th', '\u0926': 'd', '\u0927': 'dh', '\u0928': 'n', '\u092a': 'p', '\u092b': 'ph', '\u092c': 'b', '\u092d': 'bh',
  '\u092e': 'm', '\u092f': 'y', '\u0930': 'r', '\u0932': 'l', '\u0935': 'v', '\u0936': 'sh', '\u0937': 'sh', '\u0938': 's', '\u0939': 'h', '\u0902': 'n', '\u0903': 'h',
  '\u093e': 'aa', '\u093f': 'i', '\u0940': 'ee', '\u0941': 'u', '\u0942': 'oo', '\u0943': 'ri', '\u0947': 'e', '\u0948': 'ai', '\u094b': 'o', '\u094c': 'au', '\u094d': '',
};
function normalizedSearch(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\u0900-\u097f]+/g, ' ').trim();
}

function romanizeHindi(value: string) {
  const roman = [...value].map((character) => devanagariToRoman[character] ?? character).join('').toLowerCase();
  return `${roman} ${roman.replaceAll('ee', 'i').replaceAll('aa', 'a').replaceAll('oo', 'u')}`;
}

function matchesHinglish(word: typeof vocabulary.$inferSelect, query: string) {
  const haystack = normalizedSearch([
    word.word, word.meaning, word.hindiMeaning, romanizeHindi(word.hindiMeaning),
    word.simpleExplanation ?? '', ...(word.synonyms ?? []), ...(word.phrasePatterns ?? []),
  ].join(' '));
  return haystack.includes(normalizedSearch(query));
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });

  const url = new URL(request.url);
  const requestedCategory = url.searchParams.get('category');
  const category = categories.includes(requestedCategory as (typeof categories)[number]) ? requestedCategory! : categories[0];
  const search = url.searchParams.get('search')?.trim().slice(0, 80) ?? '';
  const requestedFilter = url.searchParams.get('filter');
  const filter = ['due', 'learning', 'remembered', 'difficult'].includes(requestedFilter ?? '') ? requestedFilter! : 'all';
  const requestedLetter = url.searchParams.get('letter')?.toUpperCase() ?? 'ALL';
  const letter = /^[A-Z]$/.test(requestedLetter) ? requestedLetter : 'all';
  const limit = Math.min(500, Math.max(20, Number(url.searchParams.get('limit')) || 20));
  const loadWholeCatalogue = search.length >= 2 || filter !== 'all';

  const [profileRows, progressRows, totalRows, categoryRows, catalogue] = await Promise.all([
    db.select().from(userProfiles).where(eq(userProfiles.userId, session.user.id)).limit(1),
    db.select().from(userVocabulary).where(eq(userVocabulary.userId, session.user.id)).orderBy(desc(userVocabulary.updatedAt)),
    db.select({ value: count() }).from(vocabulary),
    db.select({ value: count() }).from(vocabulary).where(and(eq(vocabulary.category, category), eq(vocabulary.status, 'published'))),
    loadWholeCatalogue
      ? db.select().from(vocabulary).where(eq(vocabulary.status, 'published'))
      : db.select().from(vocabulary).where(and(eq(vocabulary.category, category), eq(vocabulary.status, 'published'))),
  ]);

  const progressByWord = new Map(progressRows.map((item) => [item.vocabularyId, item]));
  const now = new Date();
  const matchesFilter = (wordId: string) => {
    const progress = progressByWord.get(wordId);
    if (filter === 'remembered') return progress?.learningStatus === 'remembered' || progress?.learningStatus === 'mastered';
    if (filter === 'difficult') return progress?.learningStatus === 'difficult';
    if (filter === 'learning') return progress?.learningStatus === 'learning';
    if (filter === 'due') return Boolean(progress?.nextReviewDate && progress.nextReviewDate <= now);
    return true;
  };

  const matchedWords = catalogue.filter((word) =>
    (search.length < 2 || matchesHinglish(word, search)) &&
    matchesFilter(word.id) &&
    (letter === 'all' || word.word.trim().toUpperCase().startsWith(letter)),
  );
  const resultCount = matchedWords.length;
  const resultWords = matchedWords
    .sort((left, right) => left.word.localeCompare(right.word))
    .slice(0, limit)
    .map((word) => {
      const progress = progressByWord.get(word.id);
      return {
        id: word.id, word: word.word, meaning: word.meaning, hindiMeaning: word.hindiMeaning,
        pronunciation: word.pronunciation, partOfSpeech: word.partOfSpeech, simpleExplanation: word.simpleExplanation,
        example: word.example, officeExample: word.officeExample, register: word.register,
        phrasePatterns: word.phrasePatterns ?? [], conversationExamples: word.conversationExamples,
        contentSource: word.contentSource, audioUrl: word.audioUrl, synonyms: word.synonyms ?? [], antonyms: word.antonyms ?? [],
        status: progress?.learningStatus ?? 'new', correctCount: progress?.correctCount ?? 0,
      };
    });

  return Response.json({
    categories, selectedCategory: category, level: profileRows[0]?.currentLevel ?? 'elementary', words: resultWords,
    searchQuery: search, activeFilter: filter, selectedLetter: letter, resultCount, hasMore: resultCount > resultWords.length,
    catalogCount: totalRows[0]?.value ?? catalogue.length, categoryCount: categoryRows[0]?.value ?? 0, catalogueTarget: 5000,
    stats: {
      learned: progressRows.filter((item) => item.learningStatus === 'remembered' || item.learningStatus === 'mastered').length,
      learning: progressRows.filter((item) => item.learningStatus === 'learning').length,
      difficult: progressRows.filter((item) => item.learningStatus === 'difficult').length,
      dueToday: progressRows.filter((item) => Boolean(item.nextReviewDate && item.nextReviewDate <= now)).length,
    },
  });
}
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  const input = z.object({ category: z.enum(categories) }).safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ message: 'Choose a valid vocabulary category.' }, { status: 400 });

  const [[profile], existingWords, [total]] = await Promise.all([
    db.select().from(userProfiles).where(eq(userProfiles.userId, session.user.id)).limit(1),
    db.select({ word: vocabulary.word }).from(vocabulary).where(eq(vocabulary.category, input.data.category)),
    db.select({ value: count() }).from(vocabulary),
  ]);
  const totalCount = total?.value ?? 0;
  if (totalCount >= 5000) return Response.json({ message: 'The 5,000-word catalogue target is complete.', added: 0, total: totalCount, categoryCount: existingWords.length, category: input.data.category, words: [] });

  try {
    const firstPack = await generateVocabularyPack({ category: input.data.category, level: profile?.currentLevel ?? 'intermediate', existingWords: existingWords.map((item) => item.word) });
    let secondPack: Awaited<ReturnType<typeof generateVocabularyPack>> = [];
    let secondPackLimited = false;
    try {
      secondPack = await generateVocabularyPack({ category: input.data.category, level: profile?.currentLevel ?? 'intermediate', existingWords: [...existingWords.map((item) => item.word), ...firstPack.map((item) => item.word)] });
    } catch {
      secondPackLimited = true;
    }
    const pack = [...firstPack, ...secondPack];
    const inserted = await db.insert(vocabulary).values(pack.map((item) => ({
      word: item.word.toLowerCase(), meaning: item.meaning, hindiMeaning: item.hindiMeaning,
      pronunciation: item.pronunciation, audioUrl: item.audioUrl, partOfSpeech: item.partOfSpeech,
      simpleExplanation: item.simpleExplanation, example: item.example, officeExample: item.officeExample,
      synonyms: item.synonyms, antonyms: item.antonyms, commonMistake: item.commonMistake,
      register: item.register, phrasePatterns: item.phrasePatterns, conversationExamples: item.conversationExamples,
      contentSource: item.contentSource, level: profile?.currentLevel ?? 'intermediate', category: input.data.category, status: 'published' as const,
    }))).onConflictDoNothing().returning();
    const [categoryTotal] = await db.select({ value: count() }).from(vocabulary).where(and(eq(vocabulary.category, input.data.category), eq(vocabulary.status, 'published')));
    const response = {
      added: inserted.length,
      total: totalCount + inserted.length,
      categoryCount: categoryTotal?.value ?? existingWords.length + inserted.length,
      category: input.data.category,
      message: secondPackLimited
        ? `${inserted.length} verified AI words added. Groq saved the successful pack; tap again shortly to add the next pack.`
        : `${inserted.length} verified AI words added to ${input.data.category}.`,
      words: inserted.map((word) => ({
        id: word.id, word: word.word, meaning: word.meaning, hindiMeaning: word.hindiMeaning,
        pronunciation: word.pronunciation, partOfSpeech: word.partOfSpeech, simpleExplanation: word.simpleExplanation,
        example: word.example, officeExample: word.officeExample, register: word.register,
        phrasePatterns: word.phrasePatterns ?? [], conversationExamples: word.conversationExamples,
        contentSource: word.contentSource, audioUrl: word.audioUrl, synonyms: word.synonyms ?? [], antonyms: word.antonyms ?? [],
        status: 'new' as const, correctCount: 0,
      })),
    };
    await publishVocabularyEvent(response).catch(() => undefined);
    return Response.json(response);
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : 'Could not generate vocabulary.' }, { status: 503 });
  }
}
export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: 'Invalid vocabulary review.' }, { status: 400 });

  const [existing] = await db.select().from(userVocabulary).where(and(eq(userVocabulary.userId, session.user.id), eq(userVocabulary.vocabularyId, parsed.data.vocabularyId))).limit(1);
  const isRemembered = parsed.data.action === 'remembered';
  const nextCorrect = (existing?.correctCount ?? 0) + (isRemembered ? 1 : 0);
  const nextIncorrect = (existing?.incorrectCount ?? 0) + (parsed.data.action === 'difficult' ? 1 : 0);
  const learningStatus = isRemembered && nextCorrect >= 3 ? 'mastered' : parsed.data.action;
  const reviewDays = parsed.data.action === 'difficult' ? 1 : isRemembered ? Math.min(14, 2 ** nextCorrect) : 3;
  const nextReviewDate = new Date(Date.now() + reviewDays * 86_400_000);

  if (existing) {
    await db.update(userVocabulary).set({ learningStatus, correctCount: nextCorrect, incorrectCount: nextIncorrect, lastReviewedAt: new Date(), nextReviewDate, updatedAt: new Date() }).where(eq(userVocabulary.id, existing.id));
  } else {
    await db.insert(userVocabulary).values({ userId: session.user.id, vocabularyId: parsed.data.vocabularyId, learningStatus, correctCount: nextCorrect, incorrectCount: nextIncorrect, lastReviewedAt: new Date(), nextReviewDate });
  }

  const progressDate = new Date().toISOString().slice(0, 10);
  await Promise.all([
    db.insert(learningActivityEvents).values({ userId: session.user.id, skillType: 'vocabulary', activityType: `word-${parsed.data.action}`, entityId: parsed.data.vocabularyId, durationSeconds: 20, score: isRemembered ? 100 : parsed.data.action === 'difficult' ? 25 : 60 }),
    db.insert(userProgress).values({ userId: session.user.id, progressDate, wordsLearned: isRemembered ? 1 : 0, learningMinutes: 1 }).onConflictDoUpdate({ target: [userProgress.userId, userProgress.progressDate], set: { wordsLearned: sql`${userProgress.wordsLearned} + ${isRemembered ? 1 : 0}`, learningMinutes: sql`${userProgress.learningMinutes} + 1`, updatedAt: new Date() } }),
  ]);

  return Response.json({ status: learningStatus, nextReviewDate });
}
