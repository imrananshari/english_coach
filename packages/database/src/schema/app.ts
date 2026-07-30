import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { user } from './auth';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const englishLevelEnum = pgEnum('english_level', [
  'beginner',
  'elementary',
  'intermediate',
  'upper-intermediate',
  'advanced',
]);
export const learningSkillEnum = pgEnum('learning_skill', [
  'grammar',
  'vocabulary',
  'speaking',
  'listening',
  'writing',
  'pronunciation',
]);
export const publicationStatusEnum = pgEnum('publication_status', [
  'draft',
  'published',
  'archived',
]);
export const lessonTypeEnum = pgEnum('lesson_type', [
  'grammar',
  'vocabulary',
  'office-phrase',
  'listening',
  'writing',
  'speaking',
  'review',
]);
export const vocabularyStatusEnum = pgEnum('vocabulary_status', [
  'new',
  'learning',
  'difficult',
  'remembered',
  'mastered',
]);
export const activityStatusEnum = pgEnum('activity_status', [
  'pending',
  'in-progress',
  'completed',
  'skipped',
  'dismissed',
]);

export const userProfiles = pgTable('user_profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  nativeLanguage: text('native_language'),
  currentLevel: englishLevelEnum('current_level'),
  selectedGoal: text('selected_goal'),
  dailyLearningMinutes: integer('daily_learning_minutes').default(15).notNull(),
  streak: integer('streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  totalXp: integer('total_xp').default(0).notNull(),
  timezone: text('timezone'),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  ...timestamps,
});

export const userAssessments = pgTable(
  'user_assessments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    grammarScore: integer('grammar_score'),
    vocabularyScore: integer('vocabulary_score'),
    speakingScore: integer('speaking_score'),
    listeningScore: integer('listening_score'),
    writingScore: integer('writing_score'),
    assignedLevel: englishLevelEnum('assigned_level').notNull(),
    answers: jsonb('answers').$type<Record<string, unknown>>(),
    completedAt: timestamp('completed_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('user_assessments_user_id_idx').on(table.userId)],
);

export const assessmentSessions = pgTable(
  'assessment_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    questions: jsonb('questions')
      .$type<
        Array<{
          id: string;
          skill: 'grammar' | 'vocabulary' | 'workplace' | 'listening';
          prompt: string;
          options: Array<{ id: string; text: string }>;
          answer: string;
          explanation: string;
          spokenText: string | null;
        }>
      >()
      .notNull(),
    selectedGoal: text('selected_goal').notNull(),
    dailyLearningMinutes: integer('daily_learning_minutes').notNull(),
    status: activityStatusEnum('status').default('in-progress').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index('assessment_sessions_user_status_idx').on(table.userId, table.status),
    index('assessment_sessions_expires_at_idx').on(table.expiresAt),
  ],
);

export const courses = pgTable(
  'courses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    level: englishLevelEnum('level').notNull(),
    category: text('category').notNull(),
    status: publicationStatusEnum('status').default('draft').notNull(),
    sequenceNumber: integer('sequence_number').default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index('courses_level_category_idx').on(table.level, table.category),
  ],
);

export const grammarTopics = pgTable(
  'grammar_topics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    summary: text('summary').default('').notNull(),
    explanation: text('explanation').notNull(),
    category: text('category').default('Foundations').notNull(),
    level: englishLevelEnum('level').notNull(),
    sequenceNumber: integer('sequence_number').default(0).notNull(),
    estimatedMinutes: integer('estimated_minutes').default(12).notNull(),
    structures: jsonb('structures').$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    rules: jsonb('rules').$type<Array<{ title: string; description: string }>>().default(sql`'[]'::jsonb`).notNull(),
    examples: jsonb('examples').$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    exceptions: jsonb('exceptions').$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    tips: jsonb('tips').$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    commonMistakes: jsonb('common_mistakes').$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    keyVocabulary: jsonb('key_vocabulary').$type<Array<{ term: string; meaning: string }>>().default(sql`'[]'::jsonb`).notNull(),
    practiceQuestions: jsonb('practice_questions').$type<Array<{ id: string; question: string; options: string[]; answer: number; explanation: string }>>().default(sql`'[]'::jsonb`).notNull(),
    aiDeepDive: jsonb('ai_deep_dive').$type<{
      simpleEnglish: string;
      hindiExplanation: string;
      learningGoals: string[];
      whenToUse: Array<{ situation: string; explanation: string }>;
      formulaCards: Array<{ label: string; formula: string; example: string; hindi: string }>;
      guidedExamples: Array<{ english: string; hindi: string; why: string; context: string }>;
      comparisons: Array<{ left: string; right: string; difference: string; example: string }>;
      mistakes: Array<{ wrong: string; correct: string; why: string }>;
      memoryTips: string[];
      miniTasks: Array<{ id: string; type: string; prompt: string; hint: string; modelAnswer: string; explanation: string }>;
      generatedAt: string;
    } | null>(),
    status: publicationStatusEnum('status').default('draft').notNull(),
    ...timestamps,
  },
  (table) => [
    index('grammar_topics_level_idx').on(table.level),
    index('grammar_topics_category_sequence_idx').on(table.category, table.sequenceNumber),
  ],
);

export const userGrammarProgress = pgTable(
  'user_grammar_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    grammarTopicId: uuid('grammar_topic_id').notNull().references(() => grammarTopics.id, { onDelete: 'cascade' }),
    status: activityStatusEnum('status').default('in-progress').notNull(),
    completionPercentage: integer('completion_percentage').default(0).notNull(),
    bestScore: integer('best_score'),
    attempts: integer('attempts').default(0).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('user_grammar_progress_user_topic_uidx').on(table.userId, table.grammarTopicId),
    index('user_grammar_progress_user_status_idx').on(table.userId, table.status),
  ],
);
export const grammarPracticeSessions = pgTable(
  'grammar_practice_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    grammarTopicId: uuid('grammar_topic_id').notNull().references(() => grammarTopics.id, { onDelete: 'cascade' }),
    examples: jsonb('examples').$type<Array<{ sentence: string; context: string; explanation: string; vocabulary: Array<{ word: string; meaning: string }> }>>().default(sql`'[]'::jsonb`).notNull(),
    questions: jsonb('questions').$type<Array<{ id: string; question: string; options: string[]; answer: number; explanation: string }>>().notNull(),
    status: activityStatusEnum('status').default('in-progress').notNull(),
    score: integer('score'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index('grammar_practice_sessions_user_topic_idx').on(table.userId, table.grammarTopicId),
    index('grammar_practice_sessions_expires_idx').on(table.expiresAt),
  ],
);
export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    grammarTopicId: uuid('grammar_topic_id').references(
      () => grammarTopics.id,
      { onDelete: 'set null' },
    ),
    title: text('title').notNull(),
    lessonType: lessonTypeEnum('lesson_type').notNull(),
    content: jsonb('content')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    difficulty: englishLevelEnum('difficulty').notNull(),
    estimatedMinutes: integer('estimated_minutes').default(10).notNull(),
    sequenceNumber: integer('sequence_number').notNull(),
    status: publicationStatusEnum('status').default('draft').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('lessons_course_sequence_uidx').on(
      table.courseId,
      table.sequenceNumber,
    ),
    index('lessons_type_difficulty_idx').on(table.lessonType, table.difficulty),
  ],
);

export const vocabulary = pgTable(
  'vocabulary',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    word: text('word').notNull(),
    meaning: text('meaning').notNull(),
    hindiMeaning: text('hindi_meaning').notNull(),
    pronunciation: text('pronunciation'),
    audioUrl: text('audio_url'),
    partOfSpeech: text('part_of_speech'),
    simpleExplanation: text('simple_explanation'),
    example: text('example'),
    officeExample: text('office_example'),
    synonyms: text('synonyms').array(),
    antonyms: text('antonyms').array(),
    commonMistake: text('common_mistake'),
    register: text('register').default('neutral').notNull(),
    phrasePatterns: text('phrase_patterns').array(),
    conversationExamples: jsonb('conversation_examples')
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    contentSource: text('content_source').default('curated').notNull(),
    level: englishLevelEnum('level').notNull(),
    category: text('category').notNull(),
    status: publicationStatusEnum('status').default('draft').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('vocabulary_word_level_uidx').on(table.word, table.level),
    index('vocabulary_category_level_idx').on(table.category, table.level),
  ],
);

export const officePhrases = pgTable(
  'office_phrases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    phrase: text('phrase').notNull(),
    explanation: text('explanation').notNull(),
    category: text('category').notNull(),
    example: text('example'),
    audioUrl: text('audio_url'),
    level: englishLevelEnum('level').notNull(),
    status: publicationStatusEnum('status').default('draft').notNull(),
    ...timestamps,
  },
  (table) => [
    index('office_phrases_category_level_idx').on(table.category, table.level),
  ],
);

export const exercises = pgTable(
  'exercises',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    exerciseType: text('exercise_type').notNull(),
    question: text('question').notNull(),
    options: jsonb('options').$type<unknown[]>(),
    correctAnswer: jsonb('correct_answer').$type<unknown>().notNull(),
    explanation: text('explanation'),
    points: integer('points').default(1).notNull(),
    sequenceNumber: integer('sequence_number').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('exercises_lesson_sequence_uidx').on(
      table.lessonId,
      table.sequenceNumber,
    ),
  ],
);

export const userLessonProgress = pgTable(
  'user_lesson_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    status: activityStatusEnum('status').default('pending').notNull(),
    completionPercentage: integer('completion_percentage').default(0).notNull(),
    score: integer('score'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('user_lesson_progress_user_lesson_uidx').on(
      table.userId,
      table.lessonId,
    ),
    index('user_lesson_progress_user_status_idx').on(
      table.userId,
      table.status,
    ),
  ],
);

export const userExerciseResults = pgTable(
  'user_exercise_results',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    userAnswer: jsonb('user_answer').$type<unknown>(),
    isCorrect: boolean('is_correct').notNull(),
    score: integer('score').default(0).notNull(),
    hintsUsed: integer('hints_used').default(0).notNull(),
    timeSpentSeconds: integer('time_spent_seconds'),
    completedAt: timestamp('completed_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('user_exercise_results_user_id_idx').on(table.userId),
    index('user_exercise_results_exercise_id_idx').on(table.exerciseId),
  ],
);

export const userVocabulary = pgTable(
  'user_vocabulary',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    vocabularyId: uuid('vocabulary_id')
      .notNull()
      .references(() => vocabulary.id, { onDelete: 'cascade' }),
    learningStatus: vocabularyStatusEnum('learning_status')
      .default('new')
      .notNull(),
    correctCount: integer('correct_count').default(0).notNull(),
    incorrectCount: integer('incorrect_count').default(0).notNull(),
    nextReviewDate: timestamp('next_review_date', { withTimezone: true }),
    lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),
    userSentence: text('user_sentence'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('user_vocabulary_user_word_uidx').on(
      table.userId,
      table.vocabularyId,
    ),
    index('user_vocabulary_review_idx').on(table.userId, table.nextReviewDate),
  ],
);

export const savedPhrases = pgTable(
  'saved_phrases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    officePhraseId: uuid('office_phrase_id').references(
      () => officePhrases.id,
      { onDelete: 'cascade' },
    ),
    phrase: text('phrase').notNull(),
    source: text('source').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('saved_phrases_user_id_idx').on(table.userId)],
);

export const conversationScenarios = pgTable(
  'conversation_scenarios',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    category: text('category').notNull(),
    level: englishLevelEnum('level').notNull(),
    systemPrompt: text('system_prompt').notNull(),
    status: publicationStatusEnum('status').default('draft').notNull(),
    ...timestamps,
  },
  (table) => [
    index('conversation_scenarios_category_level_idx').on(
      table.category,
      table.level,
    ),
  ],
);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    scenarioId: uuid('scenario_id').references(() => conversationScenarios.id, {
      onDelete: 'set null',
    }),
    level: englishLevelEnum('level').notNull(),
    transcript: jsonb('transcript')
      .$type<unknown[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    durationSeconds: integer('duration_seconds').default(0).notNull(),
    grammarScore: integer('grammar_score'),
    vocabularyScore: integer('vocabulary_score'),
    fluencyScore: integer('fluency_score'),
    pronunciationScore: integer('pronunciation_score'),
    feedback: jsonb('feedback').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('conversations_user_created_idx').on(table.userId, table.createdAt),
  ],
);

export const studyRooms = pgTable(
  'study_rooms',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull().unique(),
    hostUserId: text('host_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    visibility: text('visibility').default('public').notNull(),
    status: activityStatusEnum('status').default('in-progress').notNull(),
    maxMembers: integer('max_members').default(12).notNull(),
    currentActivityId: uuid('current_activity_id'),
    ...timestamps,
  },
  (table) => [
    index('study_rooms_status_created_idx').on(table.status, table.createdAt),
    index('study_rooms_host_idx').on(table.hostUserId),
  ],
);

export const studyRoomMembers = pgTable(
  'study_room_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roomId: uuid('room_id').notNull().references(() => studyRooms.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').default('member').notNull(),
    status: text('status').default('joined').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('study_room_members_room_user_uidx').on(table.roomId, table.userId),
    index('study_room_members_user_status_idx').on(table.userId, table.status),
  ],
);

export const studyRoomMessages = pgTable(
  'study_room_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roomId: uuid('room_id').notNull().references(() => studyRooms.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    message: text('message').notNull(),
    messageType: text('message_type').default('chat').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('study_room_messages_room_created_idx').on(table.roomId, table.createdAt)],
);

export const studyRoomActivities = pgTable(
  'study_room_activities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roomId: uuid('room_id').notNull().references(() => studyRooms.id, { onDelete: 'cascade' }),
    createdBy: text('created_by').notNull().references(() => user.id, { onDelete: 'cascade' }),
    activityType: text('activity_type').notNull(),
    title: text('title').notNull(),
    content: jsonb('content').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
    answerKey: jsonb('answer_key').$type<Record<string, unknown>>(),
    status: activityStatusEnum('status').default('in-progress').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index('study_room_activities_room_started_idx').on(table.roomId, table.startedAt)],
);

export const studyRoomAnswers = pgTable(
  'study_room_answers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    activityId: uuid('activity_id').notNull().references(() => studyRoomActivities.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    answer: jsonb('answer').$type<unknown>().notNull(),
    isCorrect: boolean('is_correct').notNull(),
    score: integer('score').default(0).notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('study_room_answers_activity_user_uidx').on(table.activityId, table.userId),
    index('study_room_answers_user_idx').on(table.userId),
  ],
);
export const writingSubmissions = pgTable(
  'writing_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id').references(() => lessons.id, {
      onDelete: 'set null',
    }),
    writingType: text('writing_type').notNull(),
    prompt: text('prompt').notNull(),
    content: text('content').notNull(),
    correctedContent: text('corrected_content'),
    feedback: jsonb('feedback').$type<Record<string, unknown>>(),
    score: integer('score'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('writing_submissions_user_created_idx').on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export const dailyLearningPlans = pgTable(
  'daily_learning_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    planDate: date('plan_date').notNull(),
    grammarTask: jsonb('grammar_task').$type<Record<string, unknown>>(),
    vocabularyTask: jsonb('vocabulary_task').$type<Record<string, unknown>>(),
    speakingTask: jsonb('speaking_task').$type<Record<string, unknown>>(),
    listeningTask: jsonb('listening_task').$type<Record<string, unknown>>(),
    writingTask: jsonb('writing_task').$type<Record<string, unknown>>(),
    completionPercentage: integer('completion_percentage').default(0).notNull(),
    status: activityStatusEnum('status').default('pending').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('daily_learning_plans_user_date_uidx').on(
      table.userId,
      table.planDate,
    ),
  ],
);

export const userProgress = pgTable(
  'user_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    progressDate: date('progress_date').notNull(),
    learningMinutes: integer('learning_minutes').default(0).notNull(),
    lessonsCompleted: integer('lessons_completed').default(0).notNull(),
    wordsLearned: integer('words_learned').default(0).notNull(),
    speakingMinutes: integer('speaking_minutes').default(0).notNull(),
    grammarScore: integer('grammar_score'),
    vocabularyScore: integer('vocabulary_score'),
    speakingScore: integer('speaking_score'),
    listeningScore: integer('listening_score'),
    writingScore: integer('writing_score'),
    pronunciationScore: integer('pronunciation_score'),
    totalScore: integer('total_score'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('user_progress_user_date_uidx').on(
      table.userId,
      table.progressDate,
    ),
  ],
);

export const aiRecommendations = pgTable(
  'ai_recommendations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    recommendationType: text('recommendation_type').notNull(),
    recommendation: text('recommendation').notNull(),
    reason: text('reason').notNull(),
    priority: integer('priority').default(0).notNull(),
    status: activityStatusEnum('status').default('pending').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('ai_recommendations_user_status_idx').on(table.userId, table.status),
  ],
);

export const userMistakes = pgTable(
  'user_mistakes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    skillType: learningSkillEnum('skill_type').notNull(),
    originalSentence: text('original_sentence').notNull(),
    correctedSentence: text('corrected_sentence').notNull(),
    explanation: text('explanation'),
    mistakeCategory: text('mistake_category').notNull(),
    repetitionCount: integer('repetition_count').default(1).notNull(),
    resolved: boolean('resolved').default(false).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    ...timestamps,
  },
  (table) => [
    index('user_mistakes_user_skill_idx').on(table.userId, table.skillType),
  ],
);

export const weeklyReports = pgTable(
  'weekly_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    weekStart: date('week_start').notNull(),
    weekEnd: date('week_end').notNull(),
    totalLearningMinutes: integer('total_learning_minutes')
      .default(0)
      .notNull(),
    lessonsCompleted: integer('lessons_completed').default(0).notNull(),
    newVocabulary: integer('new_vocabulary').default(0).notNull(),
    speakingMinutes: integer('speaking_minutes').default(0).notNull(),
    summary: text('summary'),
    strengths: jsonb('strengths').$type<string[]>(),
    focusAreas: jsonb('focus_areas').$type<string[]>(),
    generatedAt: timestamp('generated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('weekly_reports_user_week_uidx').on(
      table.userId,
      table.weekStart,
    ),
  ],
);

export const achievements = pgTable('achievements', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  icon: text('icon'),
  xpReward: integer('xp_reward').default(0).notNull(),
  criteria: jsonb('criteria')
    .$type<Record<string, unknown>>()
    .default(sql`'{}'::jsonb`)
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const userAchievements = pgTable(
  'user_achievements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    achievementId: uuid('achievement_id')
      .notNull()
      .references(() => achievements.id, { onDelete: 'cascade' }),
    earnedAt: timestamp('earned_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('user_achievements_user_achievement_uidx').on(
      table.userId,
      table.achievementId,
    ),
  ],
);

export const notificationPreferences = pgTable('notification_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').default(true).notNull(),
  dailyLesson: boolean('daily_lesson').default(true).notNull(),
  vocabularyReview: boolean('vocabulary_review').default(true).notNull(),
  streakReminder: boolean('streak_reminder').default(true).notNull(),
  weeklyReport: boolean('weekly_report').default(true).notNull(),
  speakingPractice: boolean('speaking_practice').default(false).notNull(),
  reminderTime: text('reminder_time'),
  timezone: text('timezone'),
  ...timestamps,
});

export const learningActivityEvents = pgTable(
  'learning_activity_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    skillType: learningSkillEnum('skill_type').notNull(),
    activityType: text('activity_type').notNull(),
    entityId: text('entity_id'),
    durationSeconds: integer('duration_seconds').default(0).notNull(),
    score: integer('score'),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('learning_activity_events_user_occurred_idx').on(
      table.userId,
      table.occurredAt,
    ),
  ],
);
