import { z } from "zod";

// A payment method is now just a DESTINATION (where money is sent). Price + tier
// live on the subscription_plans (edited in the Tier pricing card), so amount /
// currency / plan_code are no longer part of a method.
export const paymentMethodFormSchema = z.object({
  type: z.string().min(1, "Type is required").max(50),
  display_name: z.string().min(1, "Display name is required").max(100),
  account_name: z.string().min(1, "Account name is required").max(120),
  account_number: z.string().min(1, "Account number is required").max(120),
  qr_object_path: z.string().nullable().optional(),
  instructions: z.string().trim().optional(),
  is_active: z.boolean(),
  sort_order: z.coerce.number().int().min(0, "Must be >= 0"),
});

export type PaymentMethodFormValues = z.output<typeof paymentMethodFormSchema>;

export const rejectSubmissionSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required").max(500),
});

export type RejectSubmissionValues = z.output<typeof rejectSubmissionSchema>;
