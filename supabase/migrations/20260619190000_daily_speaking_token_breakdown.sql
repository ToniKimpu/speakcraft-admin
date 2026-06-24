-- Store the Gemini token breakdown per session so we can see what drives cost
-- (audio input vs reasoning vs response output). `total_tokens` already exists
-- and is what the budget RPC meters on; these are siblings for analytics only.
--   prompt_tokens   = usageMetadata.promptTokenCount    (input, incl. audio)
--   output_tokens   = usageMetadata.candidatesTokenCount (response)
--   thoughts_tokens = usageMetadata.thoughtsTokenCount   (thinking, 2.5 models)

ALTER TABLE "public"."daily_speaking_sessions"
  ADD COLUMN IF NOT EXISTS "prompt_tokens"   int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "output_tokens"   int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "thoughts_tokens" int NOT NULL DEFAULT 0;
