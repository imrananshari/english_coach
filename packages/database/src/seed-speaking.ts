import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '../../apps/server/.env.local' });

const [{ db }, { conversationScenarios }] = await Promise.all([import('./db'), import('./schema')]);

const scenarios = [
  { title: 'Introduce Yourself Naturally', description: 'Build a confident personal introduction for new people.', category: 'Daily Life', level: 'beginner', systemPrompt: 'Ask the learner to introduce themselves, their city, interests, and one current goal. Keep it warm and practical.' },
  { title: 'Everyday Small Talk', description: 'Continue a friendly conversation without awkward pauses.', category: 'Daily Life', level: 'elementary', systemPrompt: 'Create a small-talk situation about the weekend, weather, local area, or hobbies. Require a follow-up question.' },
  { title: 'Travel Help', description: 'Ask for directions, clarify details, and solve a travel problem.', category: 'Travel', level: 'elementary', systemPrompt: 'Create a realistic airport, hotel, taxi, or directions problem. The learner must ask politely and confirm information.' },
  { title: 'Team Stand-up Update', description: 'Explain yesterday, today, and blockers clearly.', category: 'Office', level: 'intermediate', systemPrompt: 'Act as a team lead in a stand-up. Ask for progress, next action, and one blocker using concise workplace English.' },
  { title: 'Lead a Meeting Point', description: 'Share an opinion, agree or disagree, and propose an action.', category: 'Meetings', level: 'intermediate', systemPrompt: 'Create a meeting decision about timeline, budget, priority, or process. Require an opinion, reason, and next step.' },
  { title: 'Client Conversation', description: 'Respond professionally to a request or concern.', category: 'Office', level: 'upper-intermediate', systemPrompt: 'Create a client request, delay, or concern. The learner must acknowledge it, explain clearly, and offer a solution.' },
  { title: 'Job Interview Answer', description: 'Practice concise, evidence-based interview responses.', category: 'Career', level: 'intermediate', systemPrompt: 'Ask one behavioral interview question. Encourage a Situation-Task-Action-Result answer with specific evidence.' },
  { title: 'Presentation Q&A', description: 'Answer a challenging audience question with confidence.', category: 'Meetings', level: 'upper-intermediate', systemPrompt: 'Create a presentation Q&A about a proposal or result. The learner should acknowledge, answer, and bridge to a key point.' },
] as const;

for (const scenario of scenarios) {
  const [existing] = await db.select({ id: conversationScenarios.id }).from(conversationScenarios).where(eq(conversationScenarios.title, scenario.title)).limit(1);
  if (existing) await db.update(conversationScenarios).set({ ...scenario, status: 'published', updatedAt: new Date() }).where(eq(conversationScenarios.id, existing.id));
  else await db.insert(conversationScenarios).values({ ...scenario, status: 'published' });
}
console.log(`Seeded ${scenarios.length} speaking scenarios.`);