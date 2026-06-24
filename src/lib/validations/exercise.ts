import { z } from "zod";

export const exerciseFormSchema = z.object({
  exercise_name: z.string().min(1, "Exercise name is required").max(200),
});

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;
