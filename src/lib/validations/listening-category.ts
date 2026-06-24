import { z } from "zod";

export const listeningCategoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required").max(200),
});

export type ListeningCategoryFormValues = z.infer<
  typeof listeningCategoryFormSchema
>;
