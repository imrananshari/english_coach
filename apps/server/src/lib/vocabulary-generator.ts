import { z } from 'zod';

import { getCuratedVocabularySeeds, type CuratedVocabularySeed } from './vocabulary-catalog';

const vocabularyWordSchema = z.object({
  word: z.string().trim().min(1).max(60),
  meaning: z.string().trim().min(5).max(240),
  hindiMeaning: z.string().trim().min(1).max(120),
  pronunciation: z.string().trim().max(80),
  partOfSpeech: z.string().trim().max(40),
  simpleExplanation: z.string().trim().min(5).max(240),
  example: z.string().trim().min(5).max(220),
  officeExample: z.string().trim().min(5).max(220),
  register: z.enum(['formal', 'neutral', 'informal', 'slang']),
  phrasePatterns: z.array(z.string().trim().min(2).max(100)).min(2).max(4),
  conversationExamples: z.array(z.string().trim().min(5).max(220)).min(2).max(3),
  synonyms: z.array(z.string().trim().min(1).max(60)).max(6),
  antonyms: z.array(z.string().trim().min(1).max(60)).max(4),
  commonMistake: z.string().trim().min(3).max(220),
});

export type GeneratedVocabularyWord = z.infer<typeof vocabularyWordSchema> & {
  audioUrl: string | null;
  contentSource: string;
};

interface DictionaryEntry {
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: Array<{
    partOfSpeech?: string;
    synonyms?: string[];
    antonyms?: string[];
    definitions?: Array<{ definition?: string; example?: string; synonyms?: string[]; antonyms?: string[] }>;
  }>;
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6_000) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

function curatedUsage(seed: CuratedVocabularySeed, category: string): z.infer<typeof vocabularyWordSchema> {
  const meaning = seed.meaning ?? `A useful English word commonly used in ${category.toLowerCase()} contexts.`;
  const isExpression = seed.word.includes(' ') || category === 'Idioms' || category === 'Phrasal Verbs';
  const register = seed.register ?? (category === 'Gen Z & Slang' ? 'slang' : category === 'Idioms' ? 'informal' : 'neutral');
  return {
    word: seed.word,
    meaning,
    hindiMeaning: seed.hindiMeaning,
    pronunciation: seed.word,
    partOfSpeech: isExpression ? 'expression' : 'word',
    simpleExplanation: meaning,
    example: `A: Which word fits this situation? B: “${seed.word}” expresses it clearly.`,
    officeExample: `At work, understand “${seed.word}” from the sentence and situation before using it.`,
    register,
    phrasePatterns: [`“${seed.word}” in context`, `use “${seed.word}” naturally`, `an example of “${seed.word}”`],
    conversationExamples: [
      `A: What does “${seed.word}” mean? B: ${meaning}`,
      `A: Can I use “${seed.word}” here? B: Yes, if it matches the situation.`,
      `A: Which new expression did you learn? B: I learned “${seed.word}”.`,
    ],
    synonyms: [],
    antonyms: [],
    commonMistake: `Do not use “${seed.word}” without checking its meaning, grammar, and level of formality.`,
  };
}

async function enrich(word: z.infer<typeof vocabularyWordSchema>): Promise<GeneratedVocabularyWord> {
  const encoded = encodeURIComponent(word.word.toLowerCase());
  const [dictionaryData, relatedData] = await Promise.all([
    fetchJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encoded}`),
    fetchJson(`https://api.datamuse.com/words?rel_syn=${encoded}&max=8`),
  ]);
  const entry = Array.isArray(dictionaryData) ? dictionaryData[0] as DictionaryEntry | undefined : undefined;
  const dictionaryMeaning = entry?.meanings?.[0];
  const definition = dictionaryMeaning?.definitions?.[0];
  const preserveCuratedMeaning = word.register === 'slang' || word.word.includes(' ');
  const verifiedMeaning = preserveCuratedMeaning ? word.meaning : definition?.definition?.slice(0, 240) || word.meaning;
  const dictionarySynonyms = [...(dictionaryMeaning?.synonyms ?? []), ...(definition?.synonyms ?? [])];
  const datamuseSynonyms = Array.isArray(relatedData)
    ? relatedData.map((item) => typeof item === 'object' && item && 'word' in item ? String(item.word) : '').filter(Boolean)
    : [];
  const audio = entry?.phonetics?.find((item) => item.audio)?.audio;

  const verifiedWord = vocabularyWordSchema.parse({
    ...word,
    meaning: verifiedMeaning,
    simpleExplanation: preserveCuratedMeaning ? word.simpleExplanation : verifiedMeaning,
    example: definition?.example?.slice(0, 220) || word.example,
    pronunciation: entry?.phonetic || entry?.phonetics?.find((item) => item.text)?.text || word.pronunciation,
    partOfSpeech: preserveCuratedMeaning ? word.partOfSpeech : dictionaryMeaning?.partOfSpeech || word.partOfSpeech,
    synonyms: [...new Set([...dictionarySynonyms, ...datamuseSynonyms, ...word.synonyms])].slice(0, 6),
    antonyms: [...new Set([...(dictionaryMeaning?.antonyms ?? []), ...(definition?.antonyms ?? []), ...word.antonyms])].slice(0, 4),
  });
  return {
    ...verifiedWord,
    audioUrl: audio ? (audio.startsWith('//') ? `https:${audio}` : audio) : null,
    contentSource: 'curated+dictionaryapi+datamuse',
  };
}

export async function generateVocabularyPack(input: { category: string; level: string; existingWords: string[] }) {
  const seeds = getCuratedVocabularySeeds(input.category, input.existingWords, 10);
  return Promise.all(seeds.map((seed) => enrich(curatedUsage(seed, input.category))));
}