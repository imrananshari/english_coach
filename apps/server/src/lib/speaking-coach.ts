import { z } from 'zod';

import { serverEnv } from '@/lib/env';

const phraseSchema = z.object({ phrase: z.string().min(2).max(100), meaning: z.string().min(3).max(180) });
const promptSchema = z.object({
  prompt: z.string().min(15).max(500), coachRole: z.string().min(3).max(100), task: z.string().min(10).max(280),
  targetPhrases: z.array(phraseSchema).length(4), sampleAnswer: z.string().min(20).max(700), preparationTips: z.array(z.string().min(3).max(180)).length(3),
});
const feedbackSchema = z.object({
  overallScore: z.number().int().min(0).max(100), grammarScore: z.number().int().min(0).max(100), vocabularyScore: z.number().int().min(0).max(100),
  fluencyScore: z.number().int().min(0).max(100), relevanceScore: z.number().int().min(0).max(100),
  feedback: z.string().min(10).max(500), correctedAnswer: z.string().min(3).max(900),
  strengths: z.array(z.string().min(3).max(180)).length(2), improvements: z.array(z.string().min(3).max(220)).length(2), nextTip: z.string().min(3).max(220),
});
export type SpeakingPrompt = z.infer<typeof promptSchema>;
export type SpeakingFeedback = z.infer<typeof feedbackSchema>;

type GroqBody = { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
const promptJsonSchema = { name: 'speaking_prompt', strict: true, schema: { type: 'object', additionalProperties: false, required: ['prompt','coachRole','task','targetPhrases','sampleAnswer','preparationTips'], properties: {
  prompt:{type:'string'}, coachRole:{type:'string'}, task:{type:'string'}, targetPhrases:{type:'array',minItems:4,maxItems:4,items:{type:'object',additionalProperties:false,required:['phrase','meaning'],properties:{phrase:{type:'string'},meaning:{type:'string'}}}}, sampleAnswer:{type:'string'}, preparationTips:{type:'array',minItems:3,maxItems:3,items:{type:'string'}},
} } } as const;
const feedbackJsonSchema = { name: 'speaking_feedback', strict: true, schema: { type:'object',additionalProperties:false,required:['overallScore','grammarScore','vocabularyScore','fluencyScore','relevanceScore','feedback','correctedAnswer','strengths','improvements','nextTip'],properties:{
  overallScore:{type:'integer',minimum:0,maximum:100},grammarScore:{type:'integer',minimum:0,maximum:100},vocabularyScore:{type:'integer',minimum:0,maximum:100},fluencyScore:{type:'integer',minimum:0,maximum:100},relevanceScore:{type:'integer',minimum:0,maximum:100},feedback:{type:'string'},correctedAnswer:{type:'string'},strengths:{type:'array',minItems:2,maxItems:2,items:{type:'string'}},improvements:{type:'array',minItems:2,maxItems:2,items:{type:'string'}},nextTip:{type:'string'},
} } } as const;

async function structuredCompletion<T>(prompt: string, schema: unknown, validator: z.ZodType<T>): Promise<T> {
  if (!serverEnv.GROQ_API_KEY) throw new Error('Speaking coach is not configured. Add GROQ_API_KEY.');
  let message = 'The AI speaking coach is temporarily unavailable.';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method:'POST', headers:{ Authorization:`Bearer ${serverEnv.GROQ_API_KEY}`,'Content-Type':'application/json' }, body:JSON.stringify({
        model:serverEnv.GROQ_TEXT_MODEL,temperature:0.55,max_completion_tokens:1800,
        messages:[{role:'system',content:'You are a supportive CEFR English speaking coach for an adult learner. Be accurate, practical, concise, and follow the JSON schema exactly.'},{role:'user',content:prompt}],
        response_format:{type:'json_schema',json_schema:schema},
      }) });
      const body=(await response.json()) as GroqBody;
      if(response.ok){const raw=body.choices?.[0]?.message?.content;if(raw){const parsed=validator.safeParse(JSON.parse(raw));if(parsed.success)return parsed.data;}message='The AI produced incomplete speaking material. Please try again.';}
      else {message=response.status===429?'The AI is busy. Please wait a moment and try again.':body.error?.message??message;if(response.status<500&&response.status!==429&&response.status!==422)break;}
    } catch { message='The AI speaking coach could not be reached.'; }
    if(attempt<2) await new Promise((resolve)=>setTimeout(resolve,600*2**attempt));
  }
  throw new Error(message);
}

export function generateSpeakingPrompt(input:{title:string;description:string|null;systemPrompt:string;level:string;goal:string}):Promise<SpeakingPrompt>{
  return structuredCompletion(`Create one fresh speaking task. Scenario: ${input.title}. Description: ${input.description??''}. Teacher direction: ${input.systemPrompt}. Learner level: ${input.level}. Goal: ${input.goal}. Include four natural target phrases, a model answer, and three short preparation tips. The learner should be able to answer in 30-90 seconds. Random seed: ${crypto.randomUUID()}`,promptJsonSchema,promptSchema);
}
export function evaluateSpeaking(input:{prompt:string;task:string;transcript:string;targetPhrases:Array<{phrase:string;meaning:string}>;level:string;durationSeconds:number}):Promise<SpeakingFeedback>{
  const words=input.transcript.trim().split(/\s+/).filter(Boolean).length;const wpm=input.durationSeconds>0?Math.round(words/(input.durationSeconds/60)):0;
  return structuredCompletion(`Evaluate this transcribed spoken answer. Do not claim to measure pronunciation or accent because you only have a transcript. Fluency means organization, natural flow, connectors, repetition, completeness, and the approximate pace (${wpm} words/minute). Score fairly for ${input.level} level.\nPrompt: ${input.prompt}\nTask: ${input.task}\nTarget phrases: ${input.targetPhrases.map((item)=>item.phrase).join(', ')}\nTranscript: ${input.transcript}\nReturn constructive feedback, a corrected natural version preserving the learner meaning, exactly two strengths, exactly two improvements, and one next-practice tip.`,feedbackJsonSchema,feedbackSchema);
}