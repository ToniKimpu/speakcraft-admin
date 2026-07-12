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
  // Per-video Key Takeaways deck — Bunny path/URL to key_takeaways.json.
  // Optional; empty until the admin uploads the deck.
  key_takeaways_path: string;
  is_published: boolean;
  // Per-video free flag. Subtitle play is free on every video; the other
  // features (shadowing, MCQ, recording, etc.) unlock when is_free = true OR
  // the user is premium. false = Premium-gated.
  is_free: boolean;
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
  premium_until: string | null; // null/past = Free, future = Premium (content)
  pro_until: string | null; // null/past = not Pro; future = Pro (metered AI feats)
  total_token_used: number;
  created_at: string;
};

export type PlanTier = "standard" | "pro";

export type SubscriptionPlan = {
  id: number;
  code: string; // e.g. 'standard_12_month' | '12_month'
  name: string;
  duration_days: number;
  price_cents: number;
  currency: string;
  tier: PlanTier; // 'standard' = content only, 'pro' = + metered AI features
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

// Premium payment — admin-managed pay destinations + user review queue.

// One pay destination shown to the user (KPay now, bank later). `amount` is the
// price the user pays via this method; `plan_code` is which plan it grants.
export type PaymentMethod = {
  id: number;
  type: string; // 'kpay' | 'wave' | 'bank' | ...
  display_name: string;
  account_name: string;
  account_number: string;
  qr_object_path: string | null; // filename in the public `contents` bucket (payments/qr)
  instructions: string | null;
  amount: number;
  currency: string;
  plan_code: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// A method is a destination; amount/currency/plan_code are legacy DB columns
// with defaults (price lives on the tier now), so they're optional on write.
export type PaymentMethodInsert = Omit<
  PaymentMethod,
  "id" | "created_at" | "updated_at" | "amount" | "currency" | "plan_code"
> &
  Partial<Pick<PaymentMethod, "amount" | "currency" | "plan_code">>;
export type PaymentMethodUpdate = Partial<PaymentMethodInsert>;

export type PaymentSubmissionStatus = "pending" | "approved" | "rejected";

// A user's payment proof awaiting / having gone through admin review. Amount,
// plan and method are snapshotted so history stays stable if the method changes.
export type PaymentSubmission = {
  id: number;
  user_id: number;
  payment_method_id: number | null;
  method_label: string;
  plan_code: string;
  amount: number;
  currency: string;
  proof_path: string; // path in the private `payment-proofs` bucket
  status: PaymentSubmissionStatus;
  reject_reason: string | null;
  subscription_id: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type PaymentSubmissionWithUser = PaymentSubmission & {
  users: Pick<
    User,
    "id" | "name" | "email" | "account_id" | "premium_until"
  > | null;
};

// ---------------------------------------------------------------------------
// Grammar (writing) — content tables (mirror the bundled Flutter JSON 1:1).
// ---------------------------------------------------------------------------

export type WritingLesson = {
  id: string; // text PK, e.g. 'l1_be_am_is_are'
  level: number;
  section_id: string; // e.g. '1.2'
  section: string; // display name, e.g. 'Present'
  order_in_level: number; // unit JSON `order`
  type: string; // e.g. 'grammar_unit'
  title: string;
  subtitle_mm: string;
  teach: Record<string, unknown>; // 7-part teach page (JSONB)
  toolkit: Record<string, unknown>; // verb/time-word/etc id arrays (JSONB)
  exercises: unknown[]; // ordered exercise ladder (JSONB)
  practice_recap_en: string;
  practice_recap_mm: string;
  image_path: string;
  tags: string[];
  is_published: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type WritingLessonInsert = Omit<
  WritingLesson,
  "created_at" | "updated_at" | "is_deleted"
>;
export type WritingLessonUpdate = Partial<WritingLessonInsert> & {
  is_deleted?: boolean;
};

export type WritingLexiconKind = "verb" | "time_word" | "adjective" | "noun";

export type WritingLexiconEntry = {
  id: string; // text PK, e.g. 'v_live'
  kind: WritingLexiconKind;
  data: Record<string, unknown>; // the full entry, shape per kind (JSONB)
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type WritingLexiconInsert = Omit<
  WritingLexiconEntry,
  "created_at" | "updated_at" | "is_deleted"
>;
export type WritingLexiconUpdate = Partial<WritingLexiconInsert> & {
  is_deleted?: boolean;
};

// ---------------------------------------------------------------------------
// App versions — force-update / new-version gate read by the mobile app.
// ---------------------------------------------------------------------------

export type AppVersion = {
  id: number;
  version_name: string;
  build_number: number;
  app_path: string; // APK download URL
  force_update: boolean;
  audio_path: string | null;
  telegram_path: string | null;
  release_notes: string | null; // "what's new", shown on the update screen
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type AppVersionInsert = Omit<
  AppVersion,
  "id" | "created_at" | "updated_at" | "is_deleted"
>;
export type AppVersionUpdate = Partial<AppVersionInsert> & {
  is_deleted?: boolean;
};

// ---------------------------------------------------------------------------
// Speak Your Mind — daily token budgets. Single row (id = 1), read by the
// mobile app to gate the AI feedback feature. No insert/update RLS policy, so
// writes must go through the service-role client (see actions/sym-budget.ts).
// ---------------------------------------------------------------------------

export type SymBudgetConfig = {
  id: number;
  free_trial_daily: number; // free tokens/day during the trial
  free_daily: number; // free tokens/day after the trial
  trial_days: number; // length of the full-rate free trial
  premium_daily: number; // premium tokens/day
  updated_at: string;
};

export type SymBudgetConfigUpdate = Partial<
  Omit<SymBudgetConfig, "id" | "updated_at">
> & {
  updated_at?: string;
};
