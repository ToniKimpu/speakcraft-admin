import { z } from "zod";

export const listeningFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  youtube_id: z.string().min(1, "YouTube ID is required").max(100),
  listening_category_id: z.coerce.number().int().nullable().optional(),
  order_number: z.coerce.number().int().min(0, "Must be >= 0"),
  start: z.coerce.number().int().min(0, "Must be >= 0"),
  end: z.coerce.number().int().min(0, "Must be >= 0"),
  subtitle_path: z.string().min(1, "Subtitle path is required"),
  shadowing_path: z.string().min(1, "Shadowing path is required"),
  multiple_choice_path: z.string().min(1, "Multiple choice path is required"),
  record_subtitle_path: z.string().min(1, "Record subtitle path is required"),
  sentence_explanation_path: z.string().default(""),
  vocabulary_path: z.string().default(""),
  sentence_count: z.coerce.number().int().min(0, "Must be >= 0").default(0),
  vocab_count: z.coerce.number().int().min(0, "Must be >= 0").default(0),
  pattern_count: z.coerce.number().int().min(0, "Must be >= 0").default(0),
  mm_subtitle: z.boolean(),
  has_vocabularies: z.boolean(),
  is_published: z.boolean(),
  thumbnail: z.string().nullable().optional(),
});

export type ListeningFormValues = z.output<typeof listeningFormSchema>;
