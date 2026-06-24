import { z } from "zod";

export const lessonFormSchema = z.object({
  lesson_name: z.string().min(1, "Lesson name is required").max(200),
  subtitle: z.string().max(500).nullable().optional(),
});

export type LessonFormValues = z.infer<typeof lessonFormSchema>;
