import { z } from "zod";

export const patternFormSchema = z.object({
  pattern: z.string().min(1, "Pattern text is required").max(500),
  title: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  file_path: z.string().max(500).nullable().optional(),
  self_practicable: z.boolean(),
});

export type PatternFormValues = z.infer<typeof patternFormSchema>;
