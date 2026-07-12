// Speak Your Mind — AI feedback + daily token budget (server-side).
//
// Moves the feedback call OFF the client (no bundled key) and enforces a real
// per-day token budget that the client cannot tamper with:
//   - Premium  (users.premium_until > now)        → premium_daily    (default 15k)
//   - Free, within the trial window (first N days) → free_trial_daily (default 10k)
//   - Free, after the trial                        → free_daily       (default 5k)
// Free users are never fully blocked — after the trial they keep a smaller daily
// allowance. All four numbers are admin-editable via the sym_budget_config table
// (cached ≤60s). "Day" is the Asia/Yangon (UTC+6:30) calendar day; reset is
// implicit (a new day is a new sym_usage row), so no cron is needed.
//
// auth → premium/trial → budget gate → ONE Gemini call (3.1-flash-lite, thinking)
//      → record tokens in sym_usage → return feedback + budget.
//
// Deploy:  supabase functions deploy speak-your-mind-review
// Secret:  GEMINI_API_KEY (already set for writing-review). SUPABASE_URL,
//          SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MODEL = "gemini-3.1-flash-lite"; // thinking model: best correction judgment
const FALLBACK_MODEL = "gemini-2.5-flash";
const MAX_GEMINI_ATTEMPTS = 3;
const GEMINI_DEADLINE_MS = 45_000;

// Budget defaults — overridden by the admin-editable sym_budget_config row.
const DEFAULTS = {
  free_trial_daily: 10_000, // free tokens/day during the trial
  free_daily: 5_000, //        free tokens/day after the trial
  trial_days: 3, //            length of the full-rate free trial
  premium_daily: 15_000, //    premium tokens/day
};
const TZ_OFFSET_MIN = 390; // Asia/Yangon = UTC+6:30
const AVG_CALL_TOKENS = 1_800; // for the "checks left" estimate

// Cached config (≤60s) so we don't read the DB on every call.
type BudgetCfg = typeof DEFAULTS;
// deno-lint-ignore no-explicit-any
let _cfg: { at: number; cfg: BudgetCfg } | null = null;
// deno-lint-ignore no-explicit-any
async function loadConfig(admin: any): Promise<BudgetCfg> {
  if (_cfg && Date.now() - _cfg.at < 60_000) return _cfg.cfg;
  let cfg = { ...DEFAULTS };
  try {
    const { data } = await admin
      .from("sym_budget_config")
      .select("free_trial_daily, free_daily, trial_days, premium_daily")
      .eq("id", 1).maybeSingle();
    if (data) {
      cfg = {
        free_trial_daily: Number(data.free_trial_daily) || DEFAULTS.free_trial_daily,
        free_daily: Number(data.free_daily) || DEFAULTS.free_daily,
        trial_days: Number(data.trial_days) || DEFAULTS.trial_days,
        premium_daily: Number(data.premium_daily) || DEFAULTS.premium_daily,
      };
    }
  } catch (_) { /* fall back to defaults */ }
  _cfg = { at: Date.now(), cfg };
  return cfg;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ── Local-day helpers (Asia/Yangon) ─────────────────────────────────────────

function yangonDate(d: Date): string {
  // Shift into Yangon time, then take the date portion.
  return new Date(d.getTime() + TZ_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

function nextYangonMidnightISO(d: Date): string {
  const shifted = new Date(d.getTime() + TZ_OFFSET_MIN * 60_000);
  const nextLocalMidnight = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + 1,
  );
  // Convert the local midnight back to a real UTC instant.
  return new Date(nextLocalMidnight - TZ_OFFSET_MIN * 60_000).toISOString();
}

function daysBetween(aDate: string, bDate: string): number {
  const a = Date.parse(`${aDate}T00:00:00Z`);
  const b = Date.parse(`${bDate}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

// ── Gemini (retry + fallback), copied from writing-review ────────────────────

function isTransient(status: number): boolean {
  return status === 429 || status === 500 || status === 503;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function backoffMs(attempt: number): number {
  return 400 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
}

async function callGemini(model: string, body: unknown): Promise<Response> {
  return await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

type GeminiResult =
  | { ok: true; json: unknown; model: string }
  | { ok: false; status: number; detail: string };

async function generateWithRetry(geminiBody: unknown): Promise<GeminiResult> {
  const startedAt = Date.now();
  let lastStatus = 502;
  let lastDetail = "";
  for (const model of [MODEL, FALLBACK_MODEL]) {
    for (let attempt = 0; attempt < MAX_GEMINI_ATTEMPTS; attempt++) {
      if (Date.now() - startedAt > GEMINI_DEADLINE_MS) {
        return { ok: false, status: lastStatus, detail: "retry deadline exceeded" };
      }
      let gr: Response;
      try {
        gr = await callGemini(model, geminiBody);
      } catch (e) {
        lastStatus = 503;
        lastDetail = String(e);
        if (attempt < MAX_GEMINI_ATTEMPTS - 1) await sleep(backoffMs(attempt));
        continue;
      }
      if (gr.ok) return { ok: true, json: await gr.json(), model };
      lastStatus = gr.status;
      lastDetail = (await gr.text()).slice(0, 400);
      console.error(`SYM_RETRY model=${model} attempt=${attempt} status=${gr.status}`);
      if (!isTransient(gr.status)) {
        return { ok: false, status: gr.status, detail: lastDetail };
      }
      if (attempt < MAX_GEMINI_ATTEMPTS - 1) await sleep(backoffMs(attempt));
    }
  }
  return { ok: false, status: lastStatus, detail: lastDetail };
}

// ── Prompt + schema (was the client's _systemInstruction / _responseSchema) ──

const SYSTEM_PROMPT = `
You are a warm, encouraging English-speaking coach for Myanmar (Burmese) learners.
They KNOW grammar rules but freeze when producing their own sentences, so your #1
job is to build confidence, then teach. A learner wrote a short piece about a
topic.

Rules:
1. Encourage first. Producing your own ideas is hard — be genuinely warm.
2. Correct ONLY actual errors (real grammar mistakes, wrong words, unnatural
   phrasing a native speaker would not say). IGNORE punctuation and
   capitalization. At most 5 corrections.
   - DO NOT change a sentence that is already correct and natural, even into a
     different valid style. Rephrasing correct English is NOT a correction.
   - Example: "My brother is married with three children" is correct — leave it.
     "married with two kids" is correct. Do NOT "fix" these.
   - If you are not sure something is wrong, leave it alone.
3. "natural_version_en": rewrite their whole text in natural English. CRITICAL —
   keep THEIR meaning and facts. Never invent new details about their life. Keep
   every already-correct sentence EXACTLY as they wrote it; only change the parts
   that are genuinely wrong. If the whole text is already good, return it as-is.
4. "use_more": choose 1–3 of the toolbox moves below that they did NOT already
   cover, to push them to say more next time. Give a real example sentence.
5. Every *_mm field MUST be natural, friendly Burmese. Every *_en field English.
6. Scoring: "score" 0–100 for how clearly they communicated — be generous, this
   is production practice. "band": great (>=85), good (>=65), keep_going (<65).
`.trim();

function buildUserPrompt(p: {
  title: string;
  prompt: string;
  moves: string[];
  hints: string[];
  learnerText: string;
}): string {
  const lines: string[] = [];
  lines.push(`Topic: ${p.title}`);
  if (p.prompt) lines.push(`Task given to the learner: ${p.prompt}`);
  if (p.moves.length) {
    lines.push(`Toolbox moves available for "use_more":`);
    for (const m of p.moves) lines.push(`- ${m}`);
  }
  if (p.hints.length) {
    lines.push(`A complete answer usually touches: ${p.hints.join(", ")}`);
  }
  lines.push(`\nWhat the learner wrote:\n"""\n${p.learnerText}\n"""`);
  return lines.join("\n");
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    overall_mm: { type: "STRING" },
    band: { type: "STRING", enum: ["great", "good", "keep_going"] },
    score: { type: "INTEGER" },
    strengths: { type: "ARRAY", items: { type: "STRING" } },
    corrections: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          original: { type: "STRING" },
          fixed: { type: "STRING" },
          why_mm: { type: "STRING" },
          type: {
            type: "STRING",
            enum: ["grammar", "word_choice", "spelling", "naturalness"],
          },
        },
        required: ["original", "fixed", "why_mm", "type"],
      },
    },
    natural_version_en: { type: "STRING" },
    use_more: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          move_en: { type: "STRING" },
          example_en: { type: "STRING" },
          why_mm: { type: "STRING" },
        },
        required: ["move_en", "example_en", "why_mm"],
      },
    },
    next_step_mm: { type: "STRING" },
  },
  required: [
    "overall_mm", "band", "score", "strengths", "corrections",
    "natural_version_en", "use_more", "next_step_mm",
  ],
};

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // 1. Authenticate the learner.
  let userId: string;
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    userId = user.id;
  } catch (_) {
    return json({ error: "unauthorized" }, 401);
  }

  // deno-lint-ignore no-explicit-any
  let payload: any = {};
  try { payload = await req.json(); } catch (_) { /* empty body */ }
  const learnerText = String(payload.learner_text ?? "").trim();
  if (learnerText === "") return json({ error: "empty_answer" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date();
  const today = yangonDate(now);
  const resetAt = nextYangonMidnightISO(now);

  // 2. Tier + trial. AI feedback's FULL daily budget is a Pro feature. Standard
  // and Free share the same taster (trial → free_daily); only Pro gets
  // premium_daily. (Standard is content-Premium but, for the metered features,
  // is treated as a Free user.)
  const { data: urow } = await admin
    .from("users").select("pro_until").eq("user_id", userId).maybeSingle();
  const isPro = !!urow?.pro_until &&
    new Date(urow.pro_until as string).getTime() > now.getTime();

  // Today's usage + first-ever usage day (for the trial window).
  const { data: todayRow } = await admin
    .from("sym_usage").select("tokens, calls")
    .eq("user_id", userId).eq("usage_date", today).maybeSingle();
  const usedToday = (todayRow?.tokens as number | undefined) ?? 0;
  const callsToday = (todayRow?.calls as number | undefined) ?? 0;

  const cfg = await loadConfig(admin);
  let limit = cfg.premium_daily;
  if (!isPro) {
    // Free / Standard. First-ever usage day defines the trial window. After the
    // trial, they keep a smaller daily allowance (free_daily) — never a hard
    // cut-off.
    const { data: firstRow } = await admin
      .from("sym_usage").select("usage_date")
      .eq("user_id", userId)
      .order("usage_date", { ascending: true }).limit(1).maybeSingle();
    const firstUse = (firstRow?.usage_date as string | undefined) ?? today;
    const inTrial = daysBetween(firstUse, today) < cfg.trial_days;
    limit = inTrial ? cfg.free_trial_daily : cfg.free_daily;
  }

  // 3. Budget gate (pre-call). One in-flight call may slightly exceed; that's ok.
  if (usedToday >= limit) {
    return json({
      error: "budget_exceeded",
      used: usedToday,
      limit,
      is_premium: isPro,
      reset_at: resetAt,
    });
  }

  // 4. The Gemini call.
  const userPrompt = buildUserPrompt({
    title: String(payload.topic_title ?? ""),
    prompt: String(payload.prompt ?? ""),
    moves: Array.isArray(payload.moves) ? payload.moves.map(String) : [],
    hints: Array.isArray(payload.hints) ? payload.hints.map(String) : [],
    learnerText,
  });

  const geminiBody = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const gr = await generateWithRetry(geminiBody);
  if (!gr.ok) {
    return json({ error: "review_failed", status: gr.status, detail: gr.detail }, 502);
  }

  // deno-lint-ignore no-explicit-any
  const gj = gr.json as any;
  const parts = gj?.candidates?.[0]?.content?.parts ?? [];
  // Thinking models split across parts + add thoughtSignature — join all text.
  const out = parts.map((p: { text?: string }) => p?.text).filter(Boolean).join("");
  if (!out) return json({ error: "review_empty" }, 502);

  let review: Record<string, unknown>;
  try {
    review = JSON.parse(out);
  } catch (_) {
    return json({ error: "review_bad_json" }, 502);
  }

  // 5. Record usage (service role; the only writer to sym_usage).
  const callTokens = (gj?.usageMetadata?.totalTokenCount as number | undefined) ?? 0;
  const newTotal = usedToday + callTokens;
  await admin.from("sym_usage").upsert({
    user_id: userId,
    usage_date: today,
    tokens: newTotal,
    calls: callsToday + 1,
    updated_at: now.toISOString(),
  }, { onConflict: "user_id,usage_date" });
  console.log(`SYM_TOKENS user=${userId} call=${callTokens} todayTotal=${newTotal} model=${gr.model}`);

  // 6. Return feedback + this call's tokens + the budget state.
  const remaining = Math.max(0, limit - newTotal);
  review.call_tokens = callTokens;
  review.budget = {
    used: newTotal,
    limit,
    remaining,
    checks_left: Math.max(0, Math.floor(remaining / AVG_CALL_TOKENS)),
    is_premium: isPro,
    reset_at: resetAt,
  };
  return json(review);
});
