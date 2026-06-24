import { z } from "zod";

export const dayFormSchema = z.object({
  order_number: z.coerce
    .number()
    .int()
    .min(1, "Order number must be at least 1"),
});

export type DayFormValues = z.output<typeof dayFormSchema>;
