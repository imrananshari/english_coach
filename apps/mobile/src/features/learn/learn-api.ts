import { apiClient } from '@/lib/api-client';
import { getAuthenticatedHeaders } from '@/lib/auth-client';

export interface LearnData {
  profile: { level:string;goal:string;dailyGoal:number;streak:number;longestStreak:number };
  goal: { currentStreak:number;longestStreak:number;todayMinutes:number;remainingMinutes:number;goalPercentage:number;goalReached:boolean;activeDaysThisWeek:number;week:Array<{date:string;dayLabel:string;minutes:number;active:boolean;goalReached:boolean;isToday:boolean}> };
  today: { learningMinutes:number;lessonsCompleted:number;wordsLearned:number;speakingMinutes:number };
  modules: Array<{id:'grammar'|'vocabulary'|'speaking';title:string;description:string;completed:number;total:number;color:string}>;
  recommended: {skill:'grammar'|'vocabulary'|'speaking';title:string;subtitle:string};
  recent: Array<{skillType:string;activityType:string;score:number|null;occurredAt:string}>;
}
export const learnQueryKey=['learn'] as const;
export function fetchLearn():Promise<LearnData>{return apiClient.get('/api/learn',{headers:getAuthenticatedHeaders()});}