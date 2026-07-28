import { z } from 'zod';

import { serverEnv } from '@/lib/env';

const exampleSchema = z.object({
  sentence: z.string().min(4).max(240),
  context: z.enum(['daily-life', 'meeting', 'office']),
  explanation: z.string().min(8).max(320),
  vocabulary: z.array(z.object({ word: z.string().min(1).max(50), meaning: z.string().min(2).max(160) })).min(1).max(2),
});
const questionSchema = z.object({
  id: z.string().min(1).max(40),
  question: z.string().min(5).max(280),
  options: z.array(z.string().min(1).max(180)).length(4),
  answer: z.number().int().min(0).max(3),
  explanation: z.string().min(8).max(360),
});
const practiceSchema = z.object({ examples: z.array(exampleSchema).length(6), questions: z.array(questionSchema).length(5) });
export type GeneratedGrammarPractice = z.infer<typeof practiceSchema>;

const jsonSchema = {
  name: 'grammar_practice', strict: true,
  schema: {
    type: 'object', additionalProperties: false, required: ['examples', 'questions'],
    properties: {
      examples: { type: 'array', minItems: 6, maxItems: 6, items: { type: 'object', additionalProperties: false, required: ['sentence', 'context', 'explanation', 'vocabulary'], properties: {
        sentence: { type: 'string' }, context: { type: 'string', enum: ['daily-life', 'meeting', 'office'] }, explanation: { type: 'string' },
        vocabulary: { type: 'array', minItems: 1, maxItems: 2, items: { type: 'object', additionalProperties: false, required: ['word', 'meaning'], properties: { word: { type: 'string' }, meaning: { type: 'string' } } } },
      } } },
      questions: { type: 'array', minItems: 5, maxItems: 5, items: { type: 'object', additionalProperties: false, required: ['id', 'question', 'options', 'answer', 'explanation'], properties: {
        id: { type: 'string' }, question: { type: 'string' }, options: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } }, answer: { type: 'integer', minimum: 0, maximum: 3 }, explanation: { type: 'string' },
      } } },
    },
  },
} as const;

type GroqResponse = { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function generateGrammarPractice(input: {
  title: string; level: string; summary: string; structures: string[];
  rules: Array<{ title: string; description: string }>;
  previousPrompts: string[];
}): Promise<GeneratedGrammarPractice> {
  if (!serverEnv.GROQ_API_KEY) throw new Error('AI grammar practice is not configured. Add GROQ_API_KEY to apps/server/.env.local.');
  const lesson = JSON.stringify({ title: input.title, level: input.level, summary: input.summary, structures: input.structures, rules: input.rules });
  let lastMessage = 'The AI teacher is temporarily unavailable. Please try again.';

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const avoid = input.previousPrompts.slice(0, Math.max(0, 10 - attempt * 4)).map((item) => `- ${item.slice(0, 180)}`).join('\n') || '- None';
    const prompt = `Create a fresh practice set for this English grammar lesson:\n${lesson}\nRandom seed: ${crypto.randomUUID()}\n\nReturn exactly 6 concise teaching examples and 5 multiple-choice questions. Use the target grammar accurately. Across the examples, include daily-life, meeting, and office contexts, with useful modern vocabulary and a plain-English meaning. Questions must have four plausible options, one unambiguous correct answer, and a teaching explanation. Match the lesson level. Do not ask trivia. Do not repeat these recent questions:\n${avoid}`;
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${serverEnv.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: serverEnv.GROQ_TEXT_MODEL, temperature: 0.78, max_completion_tokens: 3200,
          messages: [
            { role: 'system', content: 'You are an expert CEFR English teacher. Produce concise, accurate, practical grammar material and obey the JSON schema exactly.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_schema', json_schema: jsonSchema },
        }),
      });
      const body = (await response.json()) as GroqResponse;
      if (response.ok) {
        const raw = body.choices?.[0]?.message?.content;
        if (raw) {
          const parsed = practiceSchema.safeParse(JSON.parse(raw));
          if (parsed.success) return parsed.data;
        }
        lastMessage = 'The AI created an incomplete practice set. Please generate again.';
      } else {
        lastMessage = response.status === 429 ? 'The AI is busy right now. Please wait a moment and try again.' : body.error?.message ?? lastMessage;
        if (response.status < 500 && response.status !== 429 && response.status !== 422) break;
      }
    } catch {
      lastMessage = 'The AI teacher could not be reached. Check the connection and try again.';
    }
    if (attempt < 2) await delay(700 * 2 ** attempt);
  }
  throw new Error(lastMessage);
}