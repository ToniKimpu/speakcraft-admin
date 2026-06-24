import { z } from "zod";

export const paymentMethodFormSchema = z.object({
  type: z.string().min(1, "Type is required").max(50),
  display_name: z.string().min(1, "Display name is required").max(100),
  account_name: z.string().min(1, "Account name is required").max(120),
  account_number: z.string().min(1, "Account number is required").max(120),
  qr_object_path: z.string().nullable().optional(),
  instructions: z.string().trim().optional(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  currency: z.string().min(1, "Currency is required").max(8),
  plan_code: z.string().min(1, "Select a plan"),
  is_active: z.boolean(),
  sort_order: z.coerce.number().int().min(0, "Must be >= 0"),
});

export type PaymentMethodFormValues = z.output<typeof paymentMethodFormSchema>;

export const rejectSubmissionSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required").max(500),
});

export type RejectSubmissionValues = z.output<typeof rejectSubmissionSchema>;
