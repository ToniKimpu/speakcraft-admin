import { z } from "zod";

export const patternExerciseFormSchema = z.object({
  burmese_text: z.string().min(1, "Burmese text is required"),
  english_text: z.string().min(1, "English text (correct answer) is required"),
  words: z.string().nullable().optional(),
  audio_path: z.string().nullable().optional(),
});

export type PatternExerciseFormValues = z.infer<
  typeof patternExerciseFormSchema
>;
