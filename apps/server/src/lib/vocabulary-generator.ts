import { z } from 'zod';

import { serverEnv } from './env';

const aiWordSchema = z.object({
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
const packSchema = z.object({ words: z.array(aiWordSchema).length(10) });
export type GeneratedVocabularyWord = z.infer<typeof aiWordSchema> & {
  audioUrl: string | null;
  contentSource: string;
};

const wordJsonSchema = {
  name: 'vocabulary_pack', strict: true,
  schema: {
    type: 'object', additionalProperties: false,
    properties: { words: { type: 'array', minItems: 10, maxItems: 10, items: {
      type: 'object', additionalProperties: false,
      properties: {
        word: { type: 'string' }, meaning: { type: 'string' }, hindiMeaning: { type: 'string' },
        pronunciation: { type: 'string' }, partOfSpeech: { type: 'string' }, simpleExplanation: { type: 'string' },
        example: { type: 'string' }, officeExample: { type: 'string' },
        register: { type: 'string', enum: ['formal', 'neutral', 'informal', 'slang'] },
        phrasePatterns: { type: 'array', items: { type: 'string' } },
        conversationExamples: { type: 'array', items: { type: 'string' } },
        synonyms: { type: 'array', items: { type: 'string' } }, antonyms: { type: 'array', items: { type: 'string' } },
        commonMistake: { type: 'string' },
      },
      required: ['word','meaning','hindiMeaning','pronunciation','partOfSpeech','simpleExplanation','example','officeExample','register','phrasePatterns','conversationExamples','synonyms','antonyms','commonMistake'],
    } } }, required: ['words'],
  },
} as const;

interface DictionaryEntry {
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: Array<{ partOfSpeech?: string; synonyms?: string[]; antonyms?: string[]; definitions?: Array<{ definition?: string; example?: string; synonyms?: string[]; antonyms?: string[] }> }>;
}
interface GroqBody { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}

async function candidatesFor(category: string) {
  const seed = category.replace(/&/g, 'and');
  const data = await fetchJson(`https://api.datamuse.com/words?topics=${encodeURIComponent(seed)}&max=35&md=p`);
  return Array.isArray(data) ? data.map((item) => typeof item === 'object' && item && 'word' in item ? String(item.word) : '').filter(Boolean).slice(0, 25) : [];
}

async function enrich(word: z.infer<typeof aiWordSchema>): Promise<GeneratedVocabularyWord> {
  const encoded = encodeURIComponent(word.word.toLowerCase());
  const [dictionaryData, relatedData] = await Promise.all([
    fetchJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encoded}`),
    fetchJson(`https://api.datamuse.com/words?rel_syn=${encoded}&max=8`),
  ]);
  const entry = Array.isArray(dictionaryData) ? dictionaryData[0] as DictionaryEntry | undefined : undefined;
  const meaning = entry?.meanings?.[0];
  const definition = meaning?.definitions?.[0];
  const dictionarySynonyms = [...(meaning?.synonyms ?? []), ...(definition?.synonyms ?? [])];
  const datamuseSynonyms = Array.isArray(relatedData) ? relatedData.map((item) => typeof item === 'object' && item && 'word' in item ? String(item.word) : '').filter(Boolean) : [];
  const audio = entry?.phonetics?.find((item) => item.audio)?.audio;
  return {
    ...word,
    meaning: definition?.definition?.slice(0, 240) || word.meaning,
    example: definition?.example?.slice(0, 220) || word.example,
    pronunciation: entry?.phonetic || entry?.phonetics?.find((item) => item.text)?.text || word.pronunciation,
    partOfSpeech: meaning?.partOfSpeech || word.partOfSpeech,
    audioUrl: audio ? (audio.startsWith('//') ? `https:${audio}` : audio) : null,
    synonyms: [...new Set([...dictionarySynonyms, ...datamuseSynonyms, ...word.synonyms])].slice(0, 6),
    antonyms: [...new Set([...(meaning?.antonyms ?? []), ...(definition?.antonyms ?? []), ...word.antonyms])].slice(0, 4),
    contentSource: 'groq+dictionaryapi+datamuse',
  };
}

function retryDelay(response: Response) {
  const seconds = Number(response.headers.get('retry-after'));
  return Number.isFinite(seconds) && seconds > 0
    ? Math.min(6_000, Math.ceil(seconds * 1_000) + 150)
    : 1_200;
}

export async function generateVocabularyPack(input: { category: string; level: string; existingWords: string[] }) {
  if (!serverEnv.GROQ_API_KEY) throw new Error('Add GROQ_API_KEY to apps/server/.env.local to generate new vocabulary packs.');
  const candidates = await candidatesFor(input.category);
  const existing = input.existingWords.slice(0, 120).join(', ');
  const prompt = `Create exactly 10 useful English vocabulary items for category "${input.category}" at CEFR ${input.level} level.
Use practical modern English that people genuinely use. For Gen Z & Slang, include only mainstream current expressions, label them slang, explain when they are appropriate, and avoid offensive or short-lived nonsense. For Office categories, prioritize meetings, email, negotiation, teamwork, customer service and workplace conversations. Phrasal Verbs may contain multiple words.
Candidate ideas from Datamuse (use only if relevant): ${candidates.join(', ')}
Never repeat these catalogue items: ${existing || 'none'}.
Return one JSON object with a words array of exactly 10 items. Use these exact item keys: word, meaning, hindiMeaning, pronunciation, partOfSpeech, simpleExplanation, example, officeExample, register, phrasePatterns, conversationExamples, synonyms, antonyms, commonMistake. For every item give accurate English and natural Hindi meanings, pronunciation, part of speech, simple explanation, general example, office example, register, 2-4 useful phrase patterns, 2-3 realistic mini-conversation lines, synonyms, antonyms, and a common learner mistake. Random seed: ${crypto.randomUUID()}`;

  const models = [
    { id: serverEnv.GROQ_TEXT_MODEL, strict: serverEnv.GROQ_TEXT_MODEL.startsWith('openai/gpt-oss-') },
    ...(serverEnv.GROQ_TEXT_MODEL === 'llama-3.1-8b-instant'
      ? []
      : [{ id: 'llama-3.1-8b-instant', strict: false }]),
  ];
  let lastError = 'AI vocabulary generation failed.';
  let waitMs = 1_200;

  for (let round = 0; round < 2; round += 1) {
    for (const model of models) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serverEnv.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(25_000),
          body: JSON.stringify({
            model: model.id,
            temperature: 0.65,
            max_completion_tokens: 4_000,
            messages: [
              {
                role: 'system',
                content: 'You are an expert bilingual English-Hindi vocabulary curriculum designer. Return only valid JSON. Be accurate, concise, practical, culturally neutral, and follow the requested structure exactly.',
              },
              { role: 'user', content: prompt },
            ],
            response_format: model.strict
              ? { type: 'json_schema', json_schema: wordJsonSchema }
              : { type: 'json_object' },
          }),
        });
        const body = await response.json() as GroqBody;
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error('The Groq API key is invalid or does not allow the selected models.');
          }
          lastError = response.status === 429
            ? 'Groq free-tier capacity is temporarily full.'
            : body.error?.message || 'AI vocabulary generation failed.';
          if (response.status === 429) waitMs = Math.max(waitMs, retryDelay(response));
          if (response.status === 429 || response.status === 498 || response.status >= 500) continue;
          throw new Error(lastError);
        }
        const content = body.choices?.[0]?.message?.content;
        const parsedJson = content ? JSON.parse(content) : null;
        const parsed = packSchema.safeParse(parsedJson);
        if (parsed.success) return Promise.all(parsed.data.words.map(enrich));
        lastError = `${model.id} returned an invalid vocabulary pack.`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
    if (round === 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  throw new Error(lastError === 'Groq free-tier capacity is temporarily full.'
    ? 'The free Groq limit is busy. One pack may still be saved; try again shortly for more words.'
    : lastError);
}