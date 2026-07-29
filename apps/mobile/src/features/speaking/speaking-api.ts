import { Platform } from 'react-native';

import { API_BASE_URL, ApiError, apiClient } from '@/lib/api-client';
import { getAuthenticatedHeaders } from '@/lib/auth-client';

export interface SpeakingScenario{id:string;title:string;description:string|null;category:string;level:string;}
export interface SpeakingData{scenarios:SpeakingScenario[];stats:{sessions:number;totalMinutes:number;averageScore:number};recent:Array<{id:string;durationSeconds:number;grammarScore:number|null;vocabularyScore:number|null;fluencyScore:number|null;feedback:Record<string,unknown>|null;createdAt:string}>;}
export interface SpeakingPractice{sessionId:string;scenario:{id:string;title:string;category:string};prompt:string;coachRole:string;task:string;targetPhrases:Array<{phrase:string;meaning:string}>;sampleAnswer:string;preparationTips:string[];}
export interface SpeakingResult{transcript:string;durationSeconds:number;overallScore:number;grammarScore:number;vocabularyScore:number;fluencyScore:number;relevanceScore:number;feedback:string;correctedAnswer:string;strengths:string[];improvements:string[];nextTip:string;}
export const speakingQueryKey=['speaking'] as const;
export function fetchSpeaking():Promise<SpeakingData>{return apiClient.get('/api/speaking',{headers:getAuthenticatedHeaders()});}
export function generateSpeakingPractice(scenarioId:string):Promise<SpeakingPractice>{return apiClient.post('/api/speaking',{scenarioId},{headers:getAuthenticatedHeaders(),timeoutMs:30_000});}
export async function evaluateSpeakingRecording(input:{sessionId:string;uri:string;durationSeconds:number}):Promise<SpeakingResult>{
  const form=new FormData();form.append('sessionId',input.sessionId);form.append('durationSeconds',String(input.durationSeconds));
  if(Platform.OS==='web'){const blob=await fetch(input.uri).then((response)=>response.blob());form.append('audio',blob,'speaking.webm');}
  else form.append('audio',{uri:input.uri,name:input.uri.toLowerCase().endsWith('.m4a')?'speaking.m4a':'speaking-recording',type:input.uri.toLowerCase().endsWith('.m4a')?'audio/m4a':'audio/*'} as unknown as Blob);
  const response=await fetch(`${API_BASE_URL}/api/speaking/evaluate`,{method:'POST',headers:{Accept:'application/json',...getAuthenticatedHeaders()},body:form,credentials:'include'});
  const body=await response.json().catch(()=>({})) as SpeakingResult&{message?:string};
  if(!response.ok)throw new ApiError(body.message??'Could not evaluate the recording.',response.status);
  return body;
}