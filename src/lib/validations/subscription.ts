import { z } from "zod";

export const grantSubscriptionSchema = z.object({
  plan_code: z.string().min(1, "Select a plan"),
  payment_ref: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type GrantSubscriptionValues = z.output<typeof grantSubscriptionSchema>;
