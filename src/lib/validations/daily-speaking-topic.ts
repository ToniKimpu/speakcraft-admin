import { z } from "zod";

// Vocabulary chip: an English term + a Burmese definition + an EN example.
const vocabItemSchema = z.object({
  term: z.string().min(1, "Term is required"),
  definition_mm: z.string().default(""),
  example_en: z.string().default(""),
});

// Target phrase: an EN phrase the learner should try to use + its MM gloss.
const targetPhraseSchema = z.object({
  phrase_en: z.string().min(1, "Phrase is required"),
  translation_mm: z.string().default(""),
});

// Warmup questions are plain strings in the DB; wrapped as objects here so
// react-hook-form's useFieldArray can track them.
const warmupQuestionSchema = z.object({
  value: z.string().min(1, "Question is required"),
});

export const dailySpeakingTopicFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  prompt_en: z.string().min(1, "English prompt is required"),
  prompt_mm: z.string().default(""),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  duration_target_seconds: z.coerce
    .number()
    .int()
    .min(30, "At least 30s")
    .max(1800, "At most 30 min"),
  vocabulary: z.array(vocabItemSchema).default([]),
  target_phrases: z.array(targetPhraseSchema).default([]),
  warmup_questions: z.array(warmupQuestionSchema).default([]),
  // Comma-separated in the form; split into string[] on submit.
  tags: z.string().default(""),
  sort_order: z.coerce.number().int().min(0, "Must be >= 0"),
  is_published: z.boolean(),
});

export type DailySpeakingTopicFormValues = z.output<
  typeof dailySpeakingTopicFormSchema
>;
