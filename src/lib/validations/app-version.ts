import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .or(z.literal(""))
  .default("");

export const appVersionFormSchema = z.object({
  version_name: z.string().min(1, "Version name is required").max(50),
  build_number: z.coerce.number().int().min(1, "Must be >= 1"),
  app_path: z
    .string()
    .min(1, "Download URL is required")
    .url("Must be a valid URL"),
  telegram_path: optionalUrl,
  audio_path: optionalUrl,
  release_notes: z.string().default(""),
  force_update: z.boolean(),
});

export type AppVersionFormValues = z.output<typeof appVersionFormSchema>;
