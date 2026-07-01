import { z } from "zod";

const positiveInt = (label: string) =>
  z.coerce
    .number({ message: `${label} is required` })
    .int(`${label} must be a whole number`)
    .min(1, `${label} must be at least 1`);

export const symBudgetFormSchema = z.object({
  free_trial_daily: positiveInt("Free trial daily"),
  free_daily: positiveInt("Free daily"),
  trial_days: positiveInt("Trial days"),
  premium_daily: positiveInt("Premium daily"),
});

export type SymBudgetFormValues = z.output<typeof symBudgetFormSchema>;
