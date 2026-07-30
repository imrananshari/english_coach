import { z } from 'zod';

import { serverEnv } from '@/lib/env';

const deepDiveSchema = z.object({
  simpleEnglish: z.string().trim().min(30).max(700),
  hindiExplanation: z.string().trim().min(20).max(700),
  learningGoals: z.array(z.string().trim().min(8).max(180)).min(3).max(4),
  whenToUse: z.array(z.object({
    situation: z.string().trim().min(3).max(90),
    explanation: z.string().trim().min(10).max(240),
  })).min(3).max(5),
  formulaCards: z.array(z.object({
    label: z.string().trim().min(2).max(60),
    formula: z.string().trim().min(2).max(180),
    example: z.string().trim().min(4).max(220),
    hindi: z.string().trim().min(2).max(220),
  })).min(2).max(5),
  guidedExamples: z.array(z.object({
    english: z.string().trim().min(4).max(220),
    hindi: z.string().trim().min(2).max(220),
    why: z.string().trim().min(10).max(260),
    context: z.enum(['daily life', 'office', 'meeting', 'formal writing']),
  })).min(6).max(8),
  comparisons: z.array(z.object({
    left: z.string().trim().min(2).max(90),
    right: z.string().trim().min(2).max(90),
    difference: z.string().trim().min(10).max(260),
    example: z.string().trim().min(4).max(240),
  })).min(2).max(4),
  mistakes: z.array(z.object({
    wrong: z.string().trim().min(2).max(220),
    correct: z.string().trim().min(2).max(220),
    why: z.string().trim().min(8).max(260),
  })).min(4).max(6),
  memoryTips: z.array(z.string().trim().min(8).max(200)).min(3).max(5),
  miniTasks: z.array(z.object({
    id: z.string().trim().min(1).max(30),
    type: z.enum(['choose', 'correct', 'translate', 'create']),
    prompt: z.string().trim().min(5).max(300),
    hint: z.string().trim().min(3).max(180),
    modelAnswer: z.string().trim().min(2).max(300),
    explanation: z.string().trim().min(8).max(300),
  })).length(4),
});

export type GrammarDeepDive = z.infer<typeof deepDiveSchema> & { generatedAt: string };

const jsonSchema = {
  name: 'grammar_deep_dive',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['simpleEnglish', 'hindiExplanation', 'learningGoals', 'whenToUse', 'formulaCards', 'guidedExamples', 'comparisons', 'mistakes', 'memoryTips', 'miniTasks'],
    properties: {
      simpleEnglish: { type: 'string' },
      hindiExplanation: { type: 'string' },
      learningGoals: { type: 'array', minItems: 3, maxItems: 4, items: { type: 'string' } },
      whenToUse: { type: 'array', minItems: 3, maxItems: 5, items: {
        type: 'object', additionalProperties: false, required: ['situation', 'explanation'],
        properties: { situation: { type: 'string' }, explanation: { type: 'string' } },
      } },
      formulaCards: { type: 'array', minItems: 2, maxItems: 5, items: {
        type: 'object', additionalProperties: false, required: ['label', 'formula', 'example', 'hindi'],
        properties: { label: { type: 'string' }, formula: { type: 'string' }, example: { type: 'string' }, hindi: { type: 'string' } },
      } },
      guidedExamples: { type: 'array', minItems: 6, maxItems: 8, items: {
        type: 'object', additionalProperties: false, required: ['english', 'hindi', 'why', 'context'],
        properties: {
          english: { type: 'string' }, hindi: { type: 'string' }, why: { type: 'string' },
          context: { type: 'string', enum: ['daily life', 'office', 'meeting', 'formal writing'] },
        },
      } },
      comparisons: { type: 'array', minItems: 2, maxItems: 4, items: {
        type: 'object', additionalProperties: false, required: ['left', 'right', 'difference', 'example'],
        properties: { left: { type: 'string' }, right: { type: 'string' }, difference: { type: 'string' }, example: { type: 'string' } },
      } },
      mistakes: { type: 'array', minItems: 4, maxItems: 6, items: {
        type: 'object', additionalProperties: false, required: ['wrong', 'correct', 'why'],
        properties: { wrong: { type: 'string' }, correct: { type: 'string' }, why: { type: 'string' } },
      } },
      memoryTips: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'string' } },
      miniTasks: { type: 'array', minItems: 4, maxItems: 4, items: {
        type: 'object', additionalProperties: false, required: ['id', 'type', 'prompt', 'hint', 'modelAnswer', 'explanation'],
        properties: {
          id: { type: 'string' }, type: { type: 'string', enum: ['choose', 'correct', 'translate', 'create'] },
          prompt: { type: 'string' }, hint: { type: 'string' }, modelAnswer: { type: 'string' }, explanation: { type: 'string' },
        },
      } },
    },
  },
} as const;

type GroqResponse = {
  choices?: Array<{ finish_reason?: string; message?: { content?: string } }>;
  error?: { message?: string };
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
function retryDelay(response: Response) {
  const value = response.headers.get('retry-after');
  const seconds = value ? Number(value) : Number.NaN;
  return Number.isFinite(seconds) ? Math.min(8_000, Math.max(1_000, seconds * 1_000)) : 1_500;
}

export async function generateGrammarDeepDive(input: {
  title: string;
  category: string;
  level: string;
  summary: string;
  structures: string[];
  rules: Array<{ title: string; description: string }>;
  examples: string[];
  exceptions: string[];
  mistakes: string[];
}) {
  if (!serverEnv.GROQ_API_KEY) throw new Error('AI grammar learning is not configured.');
  const lesson = JSON.stringify(input);
  const prompt = `Build a complete mobile-first deep learning guide for this English grammar lesson:
${lesson}

Teach an adult Hindi-speaking learner. Keep the English simple but technically accurate. Include natural Devanagari Hindi explanations and translations. Adapt the content to the grammar family: do not invent tense-style affirmative/negative/question formulas for topics where they do not apply. Formula cards may instead show selection rules, transformations, word order, or contrast patterns.

Create practical daily-life, office, meeting, and formal-writing examples. Comparisons must contrast the target with its most commonly confused alternatives. Mistakes must be realistic errors Hindi speakers make. Create exactly four mini tasks: one choose, one correct, one Hindi-to-English translate, and one learner-created sentence task. Every task needs a hint, model answer, and teaching explanation. Keep every field within the requested JSON schema so the complete lesson fits in one response. Return only JSON.`;
  const models = [
    { id: serverEnv.GROQ_TEXT_MODEL, strict: serverEnv.GROQ_TEXT_MODEL.startsWith('openai/gpt-oss-') },
    ...(serverEnv.GROQ_TEXT_MODEL === 'llama-3.1-8b-instant' ? [] : [{ id: 'llama-3.1-8b-instant', strict: false }]),
  ];
  let lastMessage = 'The AI teacher is temporarily busy. Please try again.';
  let delayBeforeRetry = 1_500;

  for (let round = 0; round < 2; round += 1) {
    if (round > 0) await wait(delayBeforeRetry);
    for (const model of models) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(25_000),
          headers: { Authorization: `Bearer ${serverEnv.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model.id,
            temperature: 0.35,
            max_completion_tokens: 6_000,
            messages: [
              { role: 'system', content: 'You are a senior bilingual English-Hindi curriculum designer. Be accurate, structured, practical, concise, and always finish the requested JSON object.' },
              { role: 'user', content: prompt },
            ],
            response_format: model.strict
              ? { type: 'json_schema', json_schema: jsonSchema }
              : { type: 'json_object' },
          }),
        });
        const body = await response.json() as GroqResponse;
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error('The Groq API key is invalid or does not have access to this model.');
          }
          if (response.status === 429) {
            delayBeforeRetry = Math.max(delayBeforeRetry, retryDelay(response));
            lastMessage = 'The free Groq limit is busy. The app retried available models; wait briefly and tap Create deep lesson again.';
          } else {
            lastMessage = body.error?.message ?? lastMessage;
          }
          continue;
        }
        const choice = body.choices?.[0];
        const content = choice?.message?.content;
        if (choice?.finish_reason === 'length') {
          lastMessage = 'The AI lesson was too large to finish. The app retried with another model; please tap again if needed.';
          continue;
        }
        let json: unknown = null;
        try {
          json = content ? JSON.parse(content) : null;
        } catch {
          lastMessage = 'The AI returned incomplete JSON. The app retried automatically; please tap again if needed.';
          continue;
        }
        const parsed = deepDiveSchema.safeParse(json);
        if (parsed.success) return { ...parsed.data, generatedAt: new Date().toISOString() };
        lastMessage = 'The AI returned an incomplete lesson. The app retried automatically; please tap again if needed.';
      } catch (error) {
        if (error instanceof Error && error.message.includes('Groq API key')) throw error;
        lastMessage = 'The AI teacher could not be reached. The app retried automatically; check the connection and try again.';
      }
    }
  }
  throw new Error(lastMessage);
}