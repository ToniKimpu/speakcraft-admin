// Writing — AI grading edge function (Phase 3).
//
// One GENERIC grader for EVERY writing unit. The app sends the unit's per-
// exercise rubric (grammar point, rule, must-check, common Burmese-learner
// errors, ignore list) + the model answer + the learner's text. The prompt is
// the same for all units — the rubric DATA is what tells the model what's being
// practised — so a new unit needs zero backend changes.
//
// Synchronous + text-only (fast), so no job/poll pipeline like daily-speaking:
// auth → ONE Gemini flash-lite call (structured JSON, thinking off) → sanitise →
// return a WritingReview the app deserialises as-is.
//
// Deploy:  supabase functions deploy writing-review
// Secret:  supabase secrets set GEMINI_API_KEY=...   (SUPABASE_URL +
//          SUPABASE_ANON_KEY are injected automatically.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Flash-lite: cheap + fast, plenty for grading a few short sentences on ONE
// grammar point. Flip to "gemini-2.5-flash" if quality on the structured
// judgment proves weak.
const MODEL = "gemini-2.5-flash-lite";
const FALLBACK_MODEL = "gemini-2.5-flash";
const MAX_GEMINI_ATTEMPTS = 3;
const GEMINI_DEADLINE_MS = 45_000;

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
      console.error(`WR_RETRY model=${model} attempt=${attempt} status=${gr.status} ${lastDetail.slice(0, 160)}`);
      if (!isTransient(gr.status)) {
        return { ok: false, status: gr.status, detail: lastDetail };
      }
      if (attempt < MAX_GEMINI_ATTEMPTS - 1) await sleep(backoffMs(attempt));
    }
  }
  return { ok: false, status: lastStatus, detail: lastDetail };
}

// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `
You are a warm, encouraging English WRITING tutor for BURMESE (Myanmar) beginners.
You grade ONE short writing task that practises a SINGLE grammar point. You are
told exactly which grammar point, the rule, what to check, and the common
Burmese-learner mistakes — judge the writing ONLY against that one grammar point.

Be kind and specific; encourage first. Every message TO the learner (praise_mm,
why_mm, tip_mm) is in natural, warm SPOKEN Burmese (Myanmar) — the way a friendly
Myanmar teacher really talks, NOT stiff/textbook Burmese. Keep grammar terms
(subject, verb, plural, article…) in English. The English the learner should
write (the fixes and corrected_text) stays in ENGLISH.

Return JSON:
- "verdict": "great" = no real errors on THIS grammar point; "good" = a few small
  errors; "needs_work" = several errors or the writing is off-task.
- "praise_mm": one warm Burmese line.
- "issues": one entry per real mistake ON THIS GRAMMAR POINT. Each:
  - "wrong": the EXACT wrong span copied VERBATIM from the learner's text (the
    smallest span, usually 1–3 words, e.g. "She are"). It MUST be a substring of
    their text.
  - "fix": the corrected English for that span (e.g. "She is").
  - "why_mm": a SHORT Burmese reason (e.g. "She → is").
- "corrected_text": the learner's writing rewritten correctly — keep their words
  and meaning, fix ONLY what's needed for this grammar point (plus obvious errors
  that block meaning). You MAY wrap the corrected key words in {v}…{/v}. Empty
  string if there was nothing to fix.
- "tip_mm": one short Burmese takeaway.

ON-TASK CHECK (do this FIRST):
- Decide whether this is a GENUINE attempt at the task — real English sentences
  that actually try to use the grammar point above. If the text is gibberish,
  empty, in another language, random characters, or clearly off-task (it does NOT
  attempt the target structure at all), then return: "verdict": "needs_work",
  "issues": [], "corrected_text": "", "praise_mm" a gentle Burmese line, and put a
  warm Burmese redirect to the task in "tip_mm". In this case DO NOT invent any
  corrections — never put junk or unrelated text in "issues".
- Only if it IS a genuine attempt, grade it with the rules below.

HARD RULES:
- Judge ONLY the given grammar point. NEVER mark the "ignore" issues (e.g.
  punctuation, capitalization, spelling) as errors.
- Do NOT suggest style or completeness improvements (e.g. "add years old", "make
  it longer", word variety). ONLY flag actual errors on the grammar point.
- Every "wrong" MUST be a verbatim substring of the learner's text. If you cannot
  copy it exactly, omit that issue.
- Do NOT invent errors. If the writing is correct on this point, "issues" = [] and
  "verdict" = "great".
- Be sparing and precise — a short task has only a few issues; cover each distinct
  mistake once. At most 6 issues.
`.trim();

function buildUserPrompt(p: {
  grammarPoint: string;
  rule: string;
  mustCheck: string[];
  commonErrors: string[];
  ignore: string[];
  modelAnswer: string;
  learnerText: string;
}): string {
  const lines: string[] = [];
  lines.push(`GRAMMAR POINT: ${p.grammarPoint}`);
  if (p.rule) lines.push(`THE RULE: ${p.rule}`);
  if (p.mustCheck.length) {
    lines.push("MUST CHECK:");
    for (const m of p.mustCheck) lines.push(`- ${m}`);
  }
  if (p.commonErrors.length) {
    lines.push("COMMON BURMESE-LEARNER MISTAKES TO WATCH FOR:");
    for (const e of p.commonErrors) lines.push(`- ${e}`);
  }
  lines.push(`IGNORE (never mark these wrong): ${p.ignore.join(", ") || "none"}`);
  if (p.modelAnswer) {
    lines.push(`MODEL ANSWER (one acceptable example, NOT the only correct answer):\n${p.modelAnswer}`);
  }
  lines.push(`\nTHE LEARNER WROTE:\n"""${p.learnerText}"""`);
  return lines.join("\n");
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    verdict: { type: "STRING", enum: ["great", "good", "needs_work"] },
    praise_mm: { type: "STRING" },
    issues: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          wrong: { type: "STRING" },
          fix: { type: "STRING" },
          why_mm: { type: "STRING" },
        },
        required: ["wrong", "fix"],
      },
    },
    corrected_text: { type: "STRING" },
    tip_mm: { type: "STRING" },
  },
  required: ["verdict", "praise_mm", "issues"],
};

// Drop hallucinated corrections: an "issue" whose "wrong" span isn't actually in
// the learner's text (the model invented a word that isn't there), and no-op
// fixes. Mirrors daily-speaking's sanitizeFixes, scaled down.
function sanitizeReview(review: Record<string, unknown>, learnerText: string): void {
  const hay = learnerText.toLowerCase();
  const issues = Array.isArray(review.issues) ? review.issues : [];
  const seen = new Set<string>();
  review.issues = issues.filter((it) => {
    const g = it as Record<string, unknown>;
    const wrong = typeof g.wrong === "string" ? g.wrong.trim() : "";
    const fix = typeof g.fix === "string" ? g.fix.trim() : "";
    if (wrong === "" || fix === "") return false;
    if (!hay.includes(wrong.toLowerCase())) return false; // not in their text
    if (wrong.toLowerCase() === fix.toLowerCase()) return false; // no-op
    const key = `${wrong.toLowerCase()}|${fix.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Obvious non-attempt: symbols/numbers only, or barely any letters. Deliberately
// conservative — letter-gibberish ("djaskfsa") is left for the model's on-task
// gate, which is the only thing that can tell letters apart from words.
function looksLikeJunk(text: string): boolean {
  const letters = (text.match(/[a-zA-Z]/g) ?? []).length;
  if (letters < 3) return true; // "...", "123", "??", "a"
  const wordish = text.split(/\s+/).filter((w) => /[a-zA-Z]{2,}/.test(w));
  return wordish.length < 2; // a single token isn't a sentence attempt
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // Authenticated learners only (the app attaches the user JWT).
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
  } catch (_) {
    return json({ error: "unauthorized" }, 401);
  }

  // deno-lint-ignore no-explicit-any
  let payload: any = {};
  try { payload = await req.json(); } catch (_) { /* empty body */ }

  const learnerText = String(payload.learner_text ?? "").trim();
  if (learnerText === "") return json({ error: "empty answer" }, 400);

  // Cheap pre-check: skip the Gemini call on obvious non-attempts (symbols /
  // numbers only, or barely any letters). Gibberish made of letters still goes
  // to the model's on-task gate — it's the only thing that can judge that.
  if (looksLikeJunk(learnerText)) {
    return json({
      verdict: "needs_work",
      praise_mm: "ကြိုးစားပြီး စရေးတာ ကောင်းပါတယ်! 🙂",
      issues: [],
      corrected_text: "",
      tip_mm:
        "ဒီလေ့ကျင့်ခန်းအတွက် English စာကြောင်းလေးတွေ ရေးပြီး ပြန်ကြိုးစားကြည့်ပါ။",
    });
  }

  const userPrompt = buildUserPrompt({
    grammarPoint: String(payload.grammar_point ?? ""),
    rule: String(payload.rule ?? ""),
    mustCheck: Array.isArray(payload.must_check) ? payload.must_check.map(String) : [],
    commonErrors: Array.isArray(payload.common_mm_errors) ? payload.common_mm_errors.map(String) : [],
    ignore: Array.isArray(payload.ignore) ? payload.ignore.map(String) : ["punctuation", "capitalization"],
    modelAnswer: String(payload.model_answer ?? ""),
    learnerText,
  });

  const geminiBody = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const t0 = Date.now();
  const gr = await generateWithRetry(geminiBody);
  console.log(`WR_DONE geminiMs=${Date.now() - t0} ok=${gr.ok}`);
  if (!gr.ok) {
    return json({ error: "grader_failed", status: gr.status, detail: gr.detail }, 502);
  }

  // deno-lint-ignore no-explicit-any
  const gj = gr.json as any;
  const out: string | undefined = gj?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!out) return json({ error: "grader_empty" }, 502);

  let review: Record<string, unknown>;
  try {
    review = JSON.parse(out);
  } catch (_) {
    return json({ error: "grader_bad_json" }, 502);
  }
  sanitizeReview(review, learnerText);

  // deno-lint-ignore no-explicit-any
  const usage = (gj?.usageMetadata ?? {}) as any;
  console.log(`WR_TOKENS total=${usage.totalTokenCount ?? 0} model=${gr.model}`);

  // Surface token usage to the app (cost meter). Spliced in after parsing so it
  // doesn't have to live in the model's responseSchema.
  review.total_tokens = usage.totalTokenCount ?? 0;
  review.prompt_tokens = usage.promptTokenCount ?? 0;
  review.output_tokens = usage.candidatesTokenCount ?? 0;

  return json(review);
});
