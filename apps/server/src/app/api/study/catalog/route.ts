import { conversationScenarios, db, grammarTopics, vocabulary } from '@english-coach/database';
import { asc, eq, sql } from 'drizzle-orm';

import { auth } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  const [grammar, vocabularyCategories, discussions] = await Promise.all([
    db.select({
      id: grammarTopics.id,
      title: grammarTopics.title,
      summary: grammarTopics.summary,
      category: grammarTopics.category,
      level: grammarTopics.level,
      estimatedMinutes: grammarTopics.estimatedMinutes,
    }).from(grammarTopics).where(eq(grammarTopics.status, 'published')).orderBy(asc(grammarTopics.sequenceNumber)),
    db.select({
      category: vocabulary.category,
      level: vocabulary.level,
      count: sql<number>`count(*)::int`,
    }).from(vocabulary).where(eq(vocabulary.status, 'published')).groupBy(vocabulary.category, vocabulary.level).orderBy(asc(vocabulary.category)),
    db.select({
      id: conversationScenarios.id,
      title: conversationScenarios.title,
      description: conversationScenarios.description,
      category: conversationScenarios.category,
      level: conversationScenarios.level,
    }).from(conversationScenarios).where(eq(conversationScenarios.status, 'published')).orderBy(asc(conversationScenarios.title)),
  ]);
  return Response.json({ grammar, vocabulary: vocabularyCategories, discussions });
}
