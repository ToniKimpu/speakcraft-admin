import { z } from "zod";

const jsonText = (label: string) =>
  z.string().superRefine((val, ctx) => {
    if (!val.trim()) return;
    try {
      JSON.parse(val);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label}: not valid JSON`,
      });
    }
  });

export const writingLexiconFormSchema = z.object({
  id: z
    .string()
    .min(1, "ID is required")
    .max(120)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, underscore only"),
  kind: z.enum(["verb", "time_word", "adjective", "noun"]),
  data: jsonText("Data"),
});

export type WritingLexiconFormValues = z.output<
  typeof writingLexiconFormSchema
>;
