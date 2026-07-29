import { z } from 'zod';

import { serverEnv } from '@/lib/env';

const generatedSchema = z.object({
  examples: z.array(z.string().min(4).max(240)).min(2).max(4),
  question: z.string().min(5).max(280),
  options: z.array(z.string().min(1).max(180)).length(4),
  answer: z.number().int().min(0).max(3),
  explanation: z.string().min(8).max(420),
});

export type GeneratedGroupActivity = z.infer<typeof generatedSchema>;

const responseSchema = {
  name: 'group_learning_activity',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['examples', 'question', 'options', 'answer', 'explanation'],
    properties: {
      examples: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string' } },
      question: { type: 'string' },
      options: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } },
      answer: { type: 'integer', minimum: 0, maximum: 3 },
      explanation: { type: 'string' },
    },
  },
} as const;

type GroqBody = { choices?: Array<{ message?: { content?: string } }> };

export async function generateGroupActivity(input: {
  activityType: 'grammar' | 'vocabulary' | 'discussion';
  title: string;
  level: string;
  sourceMaterial: Record<string, unknown>;
}): Promise<GeneratedGroupActivity | null> {
  if (!serverEnv.GROQ_API_KEY) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18_000);
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${serverEnv.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: serverEnv.GROQ_TEXT_MODEL,
        temperature: 0.72,
        max_completion_tokens: 1300,
        messages: [
          {
            role: 'system',
            content: 'You are an accurate CEFR English teacher creating one short collaborative learning activity. Use only the supplied lesson material. Return valid JSON matching the schema.',
          },
          {
            role: 'user',
            content: `Create a fresh ${input.activityType} activity for "${input.title}" at ${input.level} level. Include practical daily-life or office examples. ${input.activityType === 'discussion' ? 'Make question an open-ended group discussion prompt; provide four short starter ideas in options.' : 'Make one unambiguous multiple-choice question.'} Random seed: ${crypto.randomUUID()}\nLesson material:\n${JSON.stringify(input.sourceMaterial).slice(0, 12_000)}`,
          },
        ],
        response_format: { type: 'json_schema', json_schema: responseSchema },
      }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as GroqBody;
    const raw = body.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = generatedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
