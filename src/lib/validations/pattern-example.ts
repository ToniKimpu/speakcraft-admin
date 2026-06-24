import { z } from "zod";

export const patternExampleFormSchema = z.object({
  english_text: z.string().min(1, "English text is required"),
  burmese_text: z.string().nullable().optional(),
  audio_url: z.string().nullable().optional(),
  start_at: z.coerce.number().int().min(0),
  practicable: z.boolean(),
  explanation: z.string().nullable().optional(),
  words: z.string().nullable().optional(),
});

export type PatternExampleFormValues = z.output<typeof patternExampleFormSchema>;
