import dotenv from 'dotenv';

dotenv.config({ path: '../../apps/server/.env.local' });

const [{ db }, { grammarTopics }, { grammarCurriculum }] = await Promise.all([
  import('./db'),
  import('./schema'),
  import('./grammar-curriculum'),
]);

for (const topic of grammarCurriculum) {
  await db.insert(grammarTopics).values(topic).onConflictDoUpdate({
    target: grammarTopics.slug,
    set: {
      title: topic.title,
      summary: topic.summary,
      explanation: topic.explanation,
      category: topic.category,
      level: topic.level,
      sequenceNumber: topic.sequenceNumber,
      estimatedMinutes: topic.estimatedMinutes,
      structures: topic.structures,
      rules: topic.rules,
      examples: topic.examples,
      exceptions: topic.exceptions,
      tips: topic.tips,
      commonMistakes: topic.commonMistakes,
      keyVocabulary: topic.keyVocabulary,
      practiceQuestions: topic.practiceQuestions,
      status: topic.status,
      updatedAt: new Date(),
    },
  });
}

console.log(`Seeded ${grammarCurriculum.length} structured grammar topics.`);