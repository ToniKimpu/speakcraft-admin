// Database types matching Supabase schema
// These can be auto-generated later with: npx supabase gen types typescript

export type Day = {
  id: number;
  order_number: number;
  created_at: string;
  is_deleted: boolean;
};

export type DayInsert = Omit<Day, "id" | "created_at" | "is_deleted">;
export type DayUpdate = Partial<DayInsert> & { is_deleted?: boolean };

export type Lesson = {
  id: number;
  lesson_name: string;
  subtitle: string | null;
  day_id: number;
  is_deleted: boolean;
  created_at: string;
};

export type LessonInsert = Omit<Lesson, "id" | "created_at" | "is_deleted">;
export type LessonUpdate = Partial<LessonInsert> & { is_deleted?: boolean };

export type Exercise = {
  id: number;
  exercise_name: string;
  day_id: number;
  is_deleted: boolean;
  created_at: string;
};

export type ExerciseInsert = Omit<Exercise, "id" | "created_at" | "is_deleted">;
export type ExerciseUpdate = Partial<ExerciseInsert> & { is_deleted?: boolean };

export type Pattern = {
  id: number;
  pattern: string;
  title: string | null;
  description: string | null;
  audio_path: string | null;
  file_path: string | null;
  lesson_id: number;
  order_number: number;
  self_practicable: boolean;
  is_deleted: boolean;
  created_at: string;
};

export type PatternInsert = Omit<Pattern, "id" | "created_at" | "is_deleted">;
export type PatternUpdate = Partial<PatternInsert> & { is_deleted?: boolean };

export type PatternExample = {
  id: number;
  english_text: string;
  burmese_text: string | null;
  audio_url: string | null;
  start_at: number;
  pattern_id: number;
  practicable: boolean;
  explanation: string | null;
  words: string | null;
  is_deleted: boolean;
  created_at: string;
};

export type PatternExampleInsert = Omit<
  PatternExample,
  "id" | "created_at" | "is_deleted"
>;
export type PatternExampleUpdate = Partial<PatternExampleInsert> & {
  is_deleted?: boolean;
};

export type PatternExercise = {
  id: number;
  burmese_text: string;
  english_text: string;
  words: string | null;
  audio_path: string | null;
  exercise_id: number;
  pattern_id: number | null;
  is_deleted: boolean;
  created_at: string;
};

export type PatternExerciseInsert = Omit<
  PatternExercise,
  "id" | "created_at" | "is_deleted"
>;
export type PatternExerciseUpdate = Partial<PatternExerciseInsert> & {
  is_deleted?: boolean;
};

export type PatternVocabulary = {
  id: number;
  english_text: string;
  burmese_text: string;
  audio_path: string | null;
  created_at: string;
};

export type PatternVocabularyInsert = Omit<
  PatternVocabulary,
  "id" | "created_at"
>;

export type DayWithCounts = Day & {
  lessons_count: number;
  exercises_count: number;
};

// Listening Categories
export type ListeningCategory = {
  id: number;
  name: string;
  is_deleted: boolean;
  created_at: string;
};

export type ListeningCategoryInsert = Omit<
  ListeningCategory,
  "id" | "created_at" | "is_deleted"
>;
export type ListeningCategoryUpdate = Partial<ListeningCategoryInsert> & {
  is_deleted?: boolean;
};

// Listenings
export type Listening = {
  id: number;
  title: string;
  thumbnail: string | null;
  youtube_id: string;
  subtitle_path: string;
  is_deleted: boolean;
  created_at: string;
  listening_category_id: number | null;
  start: number;
  end: number;
  mm_subtitle: boolean;
  has_vocabularies: boolean;
  shadowing_path: string;
  multiple_choice_path: string;
  record_subtitle_path: string;
  sentence_explanation_path: string;
  order_number: number;
  vocabulary_path: string;
  is_published: boolean;
  sentence_count: number;
  vocab_count: number;
  pattern_count: number;
};

export type ListeningInsert = Omit<
  Listening,
  "id" | "created_at" | "is_deleted"
>;
export type ListeningUpdate = Partial<ListeningInsert> & {
  is_deleted?: boolean;
};

export type ListeningWithCategory = Listening & {
  listening_categories: { name: string } | null;
};

// Users & subscriptions
export type User = {
  id: number;
  name: string | null;
  email: string;
  profile_path: string | null;
  is_active: boolean;
  account_id: string;
  user_id: string; // auth.users uuid
  user_type: string;
  device_id: string | null;
  premium_until: string | null; // null/past = Free, future = Premium
  total_token_used: number;
  created_at: string;
};

export type SubscriptionPlan = {
  id: number;
  code: string; // 'monthly' | '6_month' | '12_month'
  name: string;
  duration_days: number;
  price_cents: number;
  currency: string;
  daily_token_grant: number;
  max_recording_seconds: number;
  is_active: boolean;
  created_at: string;
};

export type Subscription = {
  id: number;
  user_id: number;
  plan_id: number;
  status: string; // active | expired | refunded | trialing
  started_at: string;
  current_period_end: string;
  provider: string;
  payment_ref: string | null;
  payment_proof_path: string | null;
  granted_by: string | null;
  note: string | null;
  created_at: string;
};

export type SubscriptionWithPlan = Subscription & {
  subscription_plans: Pick<SubscriptionPlan, "code" | "name"> | null;
};

// Daily Speaking — suggested-topic bank (read by the mobile app)
export type TopicDifficulty = "beginner" | "intermediate" | "advanced";

export type TopicVocabItem = {
  term: string;
  definition_mm: string;
  example_en: string;
};

export type TopicTargetPhrase = {
  phrase_en: string;
  translation_mm: string;
};

export type DailySpeakingTopic = {
  id: string; // text PK (uuid string by default)
  title: string;
  prompt_en: string;
  prompt_mm: string;
  difficulty: TopicDifficulty;
  duration_target_seconds: number;
  vocabulary: TopicVocabItem[];
  target_phrases: TopicTargetPhrase[];
  warmup_questions: string[];
  tags: string[];
  sort_order: number;
  is_published: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type DailySpeakingTopicInsert = Omit<
  DailySpeakingTopic,
  "id" | "created_at" | "updated_at" | "is_deleted"
> & { id?: string };

export type DailySpeakingTopicUpdate = Partial<DailySpeakingTopicInsert> & {
  is_deleted?: boolean;
};
