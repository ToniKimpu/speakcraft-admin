import { z } from "zod";

export const vocabularyFormSchema = z.object({
  english_text: z.string().min(1, "English text is required"),
  burmese_text: z.string().min(1, "Burmese text is required"),
  audio_path: z.string().nullable().optional(),
});

export type VocabularyFormValues = z.infer<typeof vocabularyFormSchema>;
