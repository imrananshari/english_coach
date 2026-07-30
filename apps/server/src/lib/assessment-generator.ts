import { z } from 'zod';

import { serverEnv } from './env';

const optionSchema = z.object({
  id: z.enum(['a', 'b', 'c', 'd']),
  text: z.string().trim().min(1).max(160),
});
const questionSchema = z.object({
  id: z.string().trim().min(1).max(30),
  skill: z.enum(['grammar', 'vocabulary', 'workplace', 'listening']),
  prompt: z.string().trim().min(5).max(280),
  options: z.array(optionSchema).length(4),
  answer: z.enum(['a', 'b', 'c', 'd']),
  explanation: z.string().trim().min(5).max(320),
  spokenText: z.string().trim().max(200).nullable(),
});
const generatedAssessmentSchema = z
  .object({ questions: z.array(questionSchema).length(10) })
  .superRefine((value, context) => {
    const expected = { grammar: 4, vocabulary: 3, workplace: 2, listening: 1 };
    for (const [skill, count] of Object.entries(expected)) {
      const actual = value.questions.filter(
        (question) => question.skill === skill,
      ).length;
      if (actual !== count)
        context.addIssue({
          code: 'custom',
          message: `Expected ${count} ${skill} questions, received ${actual}.`,
        });
    }
    const ids = new Set(value.questions.map((question) => question.id));
    if (ids.size !== value.questions.length)
      context.addIssue({
        code: 'custom',
        message: 'Question IDs must be unique.',
      });
    for (const question of value.questions) {
      const optionIds = question.options.map((option) => option.id);
      if (new Set(optionIds).size !== 4 || !optionIds.includes(question.answer))
        context.addIssue({
          code: 'custom',
          message: `Question ${question.id} has invalid options.`,
        });
      if (question.skill === 'listening' && !question.spokenText)
        context.addIssue({
          code: 'custom',
          message: 'Listening questions require spokenText.',
        });
      if (question.skill !== 'listening' && question.spokenText !== null)
        context.addIssue({
          code: 'custom',
          message: 'Only listening questions may include spokenText.',
        });
    }
  });

export type GeneratedAssessmentQuestion = z.infer<typeof questionSchema>;

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

const responseJsonSchema = {
  name: 'english_assessment',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      questions: {
        type: 'array',
        minItems: 10,
        maxItems: 10,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string' },
            skill: {
              type: 'string',
              enum: ['grammar', 'vocabulary', 'workplace', 'listening'],
            },
            prompt: { type: 'string', maxLength: 280 },
            options: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: { type: 'string', enum: ['a', 'b', 'c', 'd'] },
                  text: { type: 'string', maxLength: 160 },
                },
                required: ['id', 'text'],
              },
            },
            answer: { type: 'string', enum: ['a', 'b', 'c', 'd'] },
            explanation: { type: 'string', maxLength: 320 },
            spokenText: { type: ['string', 'null'], maxLength: 200 },
          },
          required: [
            'id',
            'skill',
            'prompt',
            'options',
            'answer',
            'explanation',
            'spokenText',
          ],
        },
      },
    },
    required: ['questions'],
  },
} as const;

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function friendlyGroqError(status: number, retryAfter?: string | null): string {
  if (status === 401 || status === 403)
    return 'The Groq API key is invalid or does not have permission. Check GROQ_API_KEY.';
  if (status === 429)
    return `The free AI limit is temporarily busy. Please wait ${retryAfter ?? 'a short time'} and try again.`;
  if (status === 413)
    return 'The AI request was too large. The app shortened it, but Groq still rejected it. Please try again.';
  if (status === 422)
    return 'The AI produced an invalid question set. Please tap generate again.';
  return 'The AI teacher is temporarily unavailable. Please try again in a moment.';
}

export async function generateAssessmentQuestions(input: {
  currentLevel?: string | null;
  selectedGoal: string;
  previousPrompts: string[];
}): Promise<GeneratedAssessmentQuestion[]> {
  if (!serverEnv.GROQ_API_KEY) {
    throw new Error(
      'Dynamic AI assessments are not configured. Add GROQ_API_KEY to apps/server/.env.local.',
    );
  }

  const recentPrompts = input.previousPrompts
    .slice(0, 8)
    .map((prompt) => prompt.slice(0, 180));
  let lastStatus = 503;
  let lastRetryAfter: string | null = null;

  const maxAttempts = 2;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const promptsToAvoid = recentPrompts.slice(0, Math.max(0, 8 - attempt * 4));
    const previous = promptsToAvoid.length
      ? promptsToAvoid.map((prompt) => `- ${prompt}`).join('\n')
      : '- Create a completely new set.';
    const prompt = `Create a fresh English placement assessment for an adult professional.
Random seed: ${crypto.randomUUID()}
Current level: ${input.currentLevel ?? 'unknown'}
Learning goal: ${input.selectedGoal.slice(0, 100)}

Return exactly 10 concise multiple-choice questions: 4 grammar, 3 vocabulary, 2 workplace communication, and 1 listening comprehension. Difficulty must progress from beginner to advanced. Each question needs options a-d, one unambiguous answer, and a short teaching explanation. Use practical English. The listening spokenText must be under 200 characters and hidden from the prompt. Non-listening spokenText must be null. Keep prompts under 280 characters, options under 160, and explanations under 320.

Avoid these recent prompts:
${previous}`;

    let response: Response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(12_000),
        headers: {
          Authorization: `Bearer ${serverEnv.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: serverEnv.GROQ_TEXT_MODEL,
          temperature: 0.85,
          max_completion_tokens: 2600,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert CEFR English teacher. Create accurate, varied, concise assessment questions and follow the JSON schema exactly.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: responseJsonSchema,
          },
        }),
      });
    } catch {
      if (attempt < maxAttempts - 1) {
        await delay(800 * (attempt + 1));
        continue;
      }
      throw new Error('The AI teacher could not be reached. Check the connection and try again.');
    }

    lastStatus = response.status;
    lastRetryAfter = response.headers.get('retry-after');
    const body = (await response.json()) as GroqResponse;
    if (response.ok) {
      const content = body.choices?.[0]?.message?.content;
      if (content) {
        try {
          const parsed = generatedAssessmentSchema.safeParse(JSON.parse(content));
          if (parsed.success) return parsed.data.questions;
        } catch {
          // Retry a malformed model response with a shorter avoidance list.
        }
      }
      if (attempt === maxAttempts - 1)
        throw new Error('The AI produced an invalid question set. Please try again.');
      await delay(700 * 2 ** attempt);
      continue;
    }

    const retryable =
      response.status === 413 ||
      response.status === 422 ||
      response.status === 429 ||
      response.status === 498 ||
      response.status >= 500;
    if (!retryable || attempt === maxAttempts - 1)
      throw new Error(friendlyGroqError(response.status, lastRetryAfter));

    const retrySeconds = Number.parseInt(lastRetryAfter ?? '', 10);
    const waitMs = Number.isFinite(retrySeconds)
      ? Math.min(retrySeconds * 1000, 10_000)
      : 700 * 2 ** attempt;
    await delay(waitMs);
  }

  throw new Error(friendlyGroqError(lastStatus, lastRetryAfter));
}