import { z } from "zod";

/** A textarea holding JSON — allowed empty, otherwise must parse. */
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

export const writingLessonFormSchema = z.object({
  id: z
    .string()
    .min(1, "ID is required")
    .max(120)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, underscore only"),
  level: z.coerce.number().int().min(1, "1–3").max(3, "1–3"),
  section_id: z.string().default(""),
  section: z.string().default(""),
  order_in_level: z.coerce.number().int().min(0, "Must be >= 0"),
  type: z.string().default("grammar_unit"),
  title: z.string().min(1, "Title is required").max(300),
  subtitle_mm: z.string().default(""),
  teach: jsonText("Teach"),
  toolkit: jsonText("Toolkit"),
  exercises: jsonText("Exercises"),
  practice_recap_en: z.string().default(""),
  practice_recap_mm: z.string().default(""),
  tags: z.string().default(""),
  is_published: z.boolean(),
});

export type WritingLessonFormValues = z.output<typeof writingLessonFormSchema>;
