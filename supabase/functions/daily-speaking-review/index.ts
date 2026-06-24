// Daily Speaking — AI feedback edge function.
//
// Flow: auth → quota gate (free 1/day, premium = daily token grant) → audio
// size guard → ONE Gemini 2.5-flash multimodal call (audio is transcribed AND
// analysed together; thinking off) → record the session server-side → return a
// DailySpeakingFeedback payload the app deserializes as-is.
//
// Deploy:  supabase functions deploy daily-speaking-review
// Secret:  supabase secrets set GEMINI_API_KEY=...   (SUPABASE_URL +
//          SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Primary = flash. Lite was cheaper/faster but too general & unreliable on the
// structured judgment (categorisation, consistent corrections). Flip MODEL to
// "gemini-2.5-flash-lite" only to A/B cost.
const MODEL = "gemini-2.5-flash";
// When the primary model is overloaded (503 UNAVAILABLE) even after retries,
// fall back to flash-lite for availability — overload of both at once is rare.
const FALLBACK_MODEL = "gemini-2.5-flash-lite";
// Per-model attempts for transient (overload / 5xx / network) failures.
const MAX_GEMINI_ATTEMPTS = 3;
// Soft deadline for the WHOLE Gemini retry budget. A 5-min-audio call is slow,
// so stacking retries can blow the hosted function's wall-clock limit (which
// surfaces to the client as WORKER_RESOURCE_LIMIT / 546). Don't start a new
// attempt past this — return the last error gracefully instead.
const GEMINI_DEADLINE_MS = 90_000;
// TODO(ship): reset to 1 before launch — raised for testing.
const FREE_DAILY_SESSIONS = 50;
const PREMIUM_DAILY_TOKENS = 72000; // mirrors subscription_plans.daily_token_grant
// The per-tier LENGTH cap (free 2 min / premium 5 min) is enforced client-side
// by auto-stopping the recorder. Here we only keep a generous technical backstop
// just under Gemini's ~20MB inline-audio limit — bitrate varies too much to
// infer duration from bytes reliably.
const MAX_INLINE_BYTES = 18 * 1024 * 1024;

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

// Overloaded / server-side / network failures worth retrying. 429 here is
// Gemini rate-limiting (NOT our quota gate, which returns earlier); 503 is the
// "high demand / UNAVAILABLE" spike the learner was hitting.
function isTransient(status: number): boolean {
  return status === 429 || status === 500 || status === 503;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Exponential backoff with jitter: ~0.5s, 1s, 2s (+ up to 250ms).
function backoffMs(attempt: number): number {
  return 500 * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
}

async function callGemini(model: string, geminiBody: unknown): Promise<Response> {
  return await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    },
  );
}

type GeminiResult =
  | { ok: true; json: unknown; model: string }
  | { ok: false; status: number; detail: string };

// Retry transient overloads with backoff on the primary model, then escalate to
// the fallback model. A non-transient failure (4xx other than 429) short-circuits
// immediately — retrying a malformed request just wastes latency.
async function generateWithRetry(geminiBody: unknown): Promise<GeminiResult> {
  const startedAt = Date.now();
  let lastStatus = 502;
  let lastDetail = "";
  for (const model of [MODEL, FALLBACK_MODEL]) {
    for (let attempt = 0; attempt < MAX_GEMINI_ATTEMPTS; attempt++) {
      if (Date.now() - startedAt > GEMINI_DEADLINE_MS) {
        console.error(
          `DSR_RETRY deadline reached after ${Date.now() - startedAt}ms; ` +
            `giving up at model=${model} attempt=${attempt} lastStatus=${lastStatus}`,
        );
        return { ok: false, status: lastStatus, detail: "retry deadline exceeded" };
      }
      let gr: Response;
      try {
        gr = await callGemini(model, geminiBody);
      } catch (e) {
        // Network-level failure (DNS/connection) — treat as transient.
        lastStatus = 503;
        lastDetail = String(e);
        console.error(`DSR_RETRY model=${model} attempt=${attempt} network ${lastDetail.slice(0, 120)}`);
        if (attempt < MAX_GEMINI_ATTEMPTS - 1) await sleep(backoffMs(attempt));
        continue;
      }
      if (gr.ok) return { ok: true, json: await gr.json(), model };
      lastStatus = gr.status;
      lastDetail = (await gr.text()).slice(0, 400);
      console.error(
        `DSR_RETRY model=${model} attempt=${attempt} status=${gr.status} ${lastDetail.slice(0, 160)}`,
      );
      if (!isTransient(gr.status)) {
        return { ok: false, status: gr.status, detail: lastDetail };
      }
      if (attempt < MAX_GEMINI_ATTEMPTS - 1) await sleep(backoffMs(attempt));
    }
    // Primary exhausted its retries on transient errors — fall through to the
    // fallback model.
  }
  return { ok: false, status: lastStatus, detail: lastDetail };
}

// Async job pipeline (job + poll). See DAILY_SPEAKING_ASYNC_PLAN.md.
const MAX_PROCESS_ATTEMPTS = 6;
// A 'processing' row whose worker hasn't finished in this long is presumed dead
// (wall-clock kill) and may be taken over by a re-kick / sweep. Must be LONGER
// than a legit slow call so we don't double-run a still-alive worker — tune from
// Phase 0 timing (DSR_DONE geminiMs) once known; ~ the worker wall-clock limit.
const STALE_SECONDS = 150;

// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: any;
// Run work that must outlive the HTTP response. EdgeRuntime.waitUntil hands the
// promise to Supabase's runtime so the Gemini call continues after we've already
// returned the session id.
function runBackground(p: Promise<unknown>): void {
  const done = p.catch((e) => console.error(`DSR bg error ${String(e)}`));
  try {
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(done);
    }
  } catch (_) { /* local dev: the promise still runs, just not guaranteed */ }
}

// deno-lint-ignore no-explicit-any
type Admin = any;

async function failJob(
  admin: Admin,
  sessionId: number,
  reason: string,
  detail: string,
): Promise<void> {
  console.error(`DSR_FAIL ${sessionId} reason=${reason} ${detail}`);
  await admin.from("daily_speaking_sessions")
    .update({ status: "error", error_message: reason })
    .eq("id", sessionId);
}

// Background worker, TWO phases (each its own fresh worker via self-invoke):
//   transcribe (audio → transcript + pronunciation)  → analyze (text → feedback).
// Safe to call repeatedly (atomic claim no-ops if done/already running);
// re-running a phase overwrites its own output, so retries are idempotent.
async function reprocess(admin: Admin, sessionId: number): Promise<void> {
  try {
    const { data: claimed } = await admin.rpc("claim_daily_speaking_session", {
      p_id: sessionId,
      p_stale_seconds: STALE_SECONDS,
      p_max_attempts: MAX_PROCESS_ATTEMPTS,
    });
    const row = Array.isArray(claimed) ? claimed[0] : claimed;
    if (!row) {
      console.log(`DSR reprocess ${sessionId}: not claimable (done/running/maxed)`);
      return;
    }

    const phase: string = row.phase ?? "transcribe";
    const onRamp: string = row.on_ramp ?? "just_talk";
    const inputMode: string = row.input_mode ?? "voice";
    const topic = row.topic ?? null;
    const audioStoragePath: string | null = row.audio_path ?? null;
    // deno-lint-ignore no-explicit-any
    const reqBlob = (row.request ?? {}) as any;
    const requested: string[] = reqBlob.requested_sections ?? [];
    const text: string | undefined = reqBlob.text ?? undefined;
    const clientDuration: number = reqBlob.duration_seconds ?? 0;
    // deno-lint-ignore no-explicit-any
    const partial = (row.partial ?? {}) as any;
    console.log(
      `DSR_PROC ${sessionId} phase=${phase} attempt=${row.attempts} mode=${inputMode}`,
    );

    // ===== STEP 1: TRANSCRIBE (audio → transcript + pronunciation) =====
    if (phase === "transcribe") {
      if (!audioStoragePath) {
        // No audio to transcribe (text session shouldn't reach here) — hand off.
        await admin.from("daily_speaking_sessions").update({
          phase: "analyze", status: "queued", attempts: 0, processing_started_at: null,
          partial: { transcript: text ?? "", pronunciation_notes: [] },
        }).eq("id", sessionId);
        selfInvoke(sessionId);
        return;
      }
      const dl = await admin.storage.from("user-recordings").download(audioStoragePath);
      if (dl.error || !dl.data) {
        await failJob(admin, sessionId, "download", String(dl.error?.message ?? ""));
        return;
      }
      const bytes = new Uint8Array(await dl.data.arrayBuffer());
      if (bytes.byteLength > MAX_INLINE_BYTES) {
        await failJob(admin, sessionId, "size", `${bytes.byteLength} bytes`);
        return;
      }
      const tBody = {
        systemInstruction: { parts: [{ text: TRANSCRIBE_SYSTEM }] },
        contents: [{ role: "user", parts: [
          { inline_data: { mime_type: "audio/mp4", data: encodeBase64(bytes) } },
          { text: buildTranscribePrompt(requested) },
        ] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: TRANSCRIBE_SCHEMA,
          thinkingConfig: { thinkingBudget: 0 },
        },
      };
      const t0 = Date.now();
      const tr = await generateWithRetry(tBody);
      console.log(`DSR_TRANSCRIBE ${sessionId} geminiMs=${Date.now() - t0} ok=${tr.ok}`);
      if (!tr.ok) {
        await failJob(admin, sessionId, isTransient(tr.status) ? "overloaded" : "gemini_failed", tr.detail.slice(0, 200));
        return;
      }
      // deno-lint-ignore no-explicit-any
      const tgj = tr.json as any;
      const tOut: string | undefined = tgj?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!tOut) { await failJob(admin, sessionId, "gemini_empty", "transcribe"); return; }
      const tParsed = JSON.parse(tOut);
      const transcript = typeof tParsed.transcript === "string" ? tParsed.transcript : "";
      const pron = Array.isArray(tParsed.pronunciation_notes) ? tParsed.pronunciation_notes : [];
      // deno-lint-ignore no-explicit-any
      const tUsage = (tgj?.usageMetadata ?? {}) as any;
      // Hand off to ANALYZE in a fresh worker (status='queued' + reset attempts so
      // analyze gets its own retry budget).
      await admin.from("daily_speaking_sessions").update({
        phase: "analyze", status: "queued", attempts: 0, processing_started_at: null,
        ai_model: tr.model,
        partial: {
          transcript,
          pronunciation_notes: pron,
          t_total: tUsage.totalTokenCount ?? 0,
          t_prompt: tUsage.promptTokenCount ?? 0,
          t_output: tUsage.candidatesTokenCount ?? 0,
        },
      }).eq("id", sessionId);
      selfInvoke(sessionId);
      return;
    }

    // ===== STEP 2: ANALYZE (transcript text → fixes/vocab/phrases/score) =====
    const transcript: string = typeof partial.transcript === "string"
      ? partial.transcript : (text ?? "");
    const pron: string[] = Array.isArray(partial.pronunciation_notes)
      ? partial.pronunciation_notes : [];
    // Reuse the existing analysis prompt/schema in TEXT mode — the transcript IS
    // the "learner's text", so no audio: this call is fast.
    const aPrompt = buildPrompt({ onRamp, inputMode: "text", requested, topic, text: transcript });
    const aBody = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: aPrompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
      },
    };
    const a0 = Date.now();
    const ar = await generateWithRetry(aBody);
    console.log(`DSR_ANALYZE ${sessionId} geminiMs=${Date.now() - a0} ok=${ar.ok}`);
    if (!ar.ok) {
      await failJob(admin, sessionId, isTransient(ar.status) ? "overloaded" : "gemini_failed", ar.detail.slice(0, 200));
      return;
    }
    // deno-lint-ignore no-explicit-any
    const agj = ar.json as any;
    const aOut: string | undefined = agj?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aOut) { await failJob(admin, sessionId, "gemini_empty", "analyze"); return; }

    const feedback = JSON.parse(aOut);
    // The analysis ran on text → it has neither transcript nor pronunciation;
    // splice in step-1's outputs before sanitising (the haystack uses transcript).
    feedback.transcript = transcript;
    feedback.pronunciation_notes = pron;
    sanitizeFixes(feedback);

    // deno-lint-ignore no-explicit-any
    const aUsage = (agj?.usageMetadata ?? {}) as any;
    const totalTokens = (aUsage.totalTokenCount ?? 0) + (partial.t_total ?? 0);
    feedback.total_tokens = totalTokens;
    if (clientDuration > 0) {
      feedback.duration_seconds = Math.round(clientDuration);
      const wc = feedback.word_count ?? 0;
      if (wc > 0) feedback.speaking_pace_wpm = Math.round(wc / (clientDuration / 60));
    }

    // deno-lint-ignore no-explicit-any
    let storedTopic: any = topic;
    if (!storedTopic && onRamp === "just_talk") {
      const inferred = typeof feedback.inferred_topic === "string"
        ? feedback.inferred_topic.trim() : "";
      if (inferred !== "") {
        storedTopic = { id: "inferred", title: inferred, prompt_en: inferred, prompt_mm: "" };
      }
    }
    const expiresAt = audioStoragePath
      ? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() : null;

    await admin.from("daily_speaking_sessions").update({
      status: "completed",
      error_message: null,
      partial: null,
      topic_id: storedTopic?.id ?? null,
      topic: storedTopic,
      input_text: transcript || text || "",
      feedback,
      total_tokens: totalTokens,
      prompt_tokens: (aUsage.promptTokenCount ?? 0) + (partial.t_prompt ?? 0),
      output_tokens: (aUsage.candidatesTokenCount ?? 0) + (partial.t_output ?? 0),
      thoughts_tokens: aUsage.thoughtsTokenCount ?? 0,
      ai_model: ar.model,
      expires_at: expiresAt,
    }).eq("id", sessionId);
    console.log(`DSR_COMPLETE ${sessionId}`);
  } catch (e) {
    await failJob(admin, sessionId, "exception", String(e).slice(0, 200));
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  // deno-lint-ignore no-explicit-any
  let payload: any = {};
  try { payload = await req.json(); } catch (_) { /* empty body */ }

  // ---- Internal re-process (sweep / service role) ----
  if (payload._internal && payload.session_id) {
    runBackground(reprocess(admin, Number(payload.session_id)));
    return json({ ok: true, mode: "internal" });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const { data: urow, error: uerr } = await admin
      .from("users").select("id, premium_until").eq("user_id", user.id).single();
    if (uerr || !urow) return json({ error: "no user row" }, 403);

    // ---- Kick: re-dispatch a stuck session the learner owns (client-driven
    // retry while the app is open — covers worker death without a cron) ----
    if (payload.kick) {
      const { data: krow } = await admin.from("daily_speaking_sessions")
        .select("id, user_id, status").eq("id", payload.kick).single();
      if (!krow || krow.user_id !== urow.id) return json({ error: "not found" }, 404);
      if (krow.status === "completed" || krow.status === "error") {
        return json({ ok: true, status: krow.status });
      }
      runBackground(reprocess(admin, Number(payload.kick)));
      return json({ ok: true, mode: "kick" });
    }

    // ---- Submit: quota gate → create job row → dispatch → return id ----
    const isPremium = !!urow.premium_until &&
      new Date(urow.premium_until).getTime() > Date.now();
    const { data: usageRows } = await admin.rpc("daily_speaking_usage_today", {
      p_user_id: urow.id,
    });
    const usage = (usageRows?.[0] as { session_count: number; tokens_used: number }) ??
      { session_count: 0, tokens_used: 0 };
    if (!isPremium && usage.session_count >= FREE_DAILY_SESSIONS) {
      return json({ limit_reached: true, reason: "free_daily" }, 429);
    }
    if (isPremium && usage.tokens_used >= PREMIUM_DAILY_TOKENS) {
      return json({ limit_reached: true, reason: "premium_tokens" }, 429);
    }

    const onRamp: string = payload.on_ramp ?? "just_talk";
    const inputMode: string = payload.input_mode ?? "voice";
    const topic = payload.topic ?? null;
    const audioStoragePath: string | undefined = payload.audio_path;
    if (audioStoragePath && !audioStoragePath.startsWith(`${user.id}/`)) {
      return json({ error: "forbidden audio path" }, 403);
    }

    // Voice → start at transcribe; text → skip straight to analyze with the
    // typed text as the transcript.
    const isVoice = !!audioStoragePath;
    const { data: inserted, error: insErr } = await admin
      .from("daily_speaking_sessions").insert({
        user_id: urow.id,
        on_ramp: onRamp,
        input_mode: inputMode,
        topic_id: topic?.id ?? null,
        topic: topic,
        audio_path: audioStoragePath ?? null,
        topic_attempt_id: payload.topic_attempt_id ?? null,
        revision_number: payload.revision_number ?? 1,
        status: "queued",
        phase: isVoice ? "transcribe" : "analyze",
        partial: isVoice
          ? null
          : { transcript: payload.text ?? "", pronunciation_notes: [] },
        request: {
          requested_sections: payload.requested_sections ?? [],
          duration_seconds: payload.duration_seconds ?? 0,
          text: payload.text ?? null,
        },
      }).select("id").single();
    if (insErr || !inserted) {
      console.error(`DSR submit insert failed: ${insErr?.message ?? "?"}`);
      return json({ error: "submit failed" }, 500);
    }

    console.log(`DSR_SUBMIT ${inserted.id} on_ramp=${onRamp} hasAudio=${!!audioStoragePath}`);
    runBackground(reprocess(admin, Number(inserted.id)));
    return json({ session_id: inserted.id }, 202);
  } catch (e) {
    console.error(`DSR submit exception ${String(e)}`);
    return json({ error: String(e) }, 500);
  }
});

// ---------------------------------------------------------------------------

// Drop fixes the model couldn't back up:
//  - no "original" to locate, or (non-filler) no "correction" → empty card / a
//    highlight that shows nothing when tapped.
//  - "original" === "correction" → a no-op fix.
//  - "original" isn't anywhere in what the learner actually said → an orphaned
//    correction the model hallucinated onto a word that isn't there.
// Filler is exempt from the correction check ("drop this word" needs none).
// Rewrites feedback.fixes in place.
function sanitizeFixes(feedback: Record<string, unknown>): void {
  const fixes = feedback?.fixes;
  if (!Array.isArray(fixes)) return;

  // Haystack of everything the learner said, to verify each fix targets a real
  // word. Built from the transcript + every sentence's original.
  const sentences = Array.isArray(feedback?.sentences) ? feedback!.sentences : [];
  const haystack = [
    typeof feedback?.transcript === "string" ? feedback.transcript : "",
    ...sentences.map((s) =>
      typeof (s as Record<string, unknown>)?.original === "string"
        ? (s as Record<string, unknown>).original as string
        : ""
    ),
  ].join(" ").toLowerCase();

  const seen = new Set<string>();
  feedback.fixes = fixes.filter((f) => {
    const g = f as Record<string, unknown>;
    const original = typeof g.original === "string" ? g.original.trim() : "";
    if (original === "") return false;
    // Only enforce the "must appear" check when we actually have a haystack
    // (voice transcript / sentences); text-only payloads may leave both empty.
    if (haystack.trim() !== "" && !haystack.includes(original.toLowerCase())) {
      return false;
    }
    const correction = typeof g.correction === "string" ? g.correction.trim() : "";
    if (g.type !== "filler") {
      if (correction === "") return false;
      if (correction.toLowerCase() === original.toLowerCase()) return false;
    }
    // Dedupe identical fixes: a word said wrong many times across a long talk
    // (e.g. "grid"→"Grit" ×8) should appear ONCE, not bury everything else.
    const key = `${g.type}|${original.toLowerCase()}|${correction.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---- Step 1: transcription (audio → text + pronunciation) ----
// Kept deliberately small so the audio call is fast: it ONLY transcribes and
// (when asked) notes pronunciation — the heavy language analysis is step 2 on
// the text. pronunciation lives here because it's the one thing that needs the
// audio.
const TRANSCRIBE_SYSTEM = `
You are an English speaking coach for BURMESE (Myanmar) learners. You receive a
short spoken monologue (audio). Do TWO things, nothing else:
1. "transcript": transcribe faithfully into English — keep the learner's ACTUAL
   words, INCLUDING mistakes and wrong words (if they said "match" when they
   meant "math", write "match"). Do NOT correct, rewrite, or clean up.
2. "pronunciation_notes": for each word you ACTUALLY heard mispronounced, a
   short, SPECIFIC, actionable note in natural warm SPOKEN Burmese — name the
   word, the exact sound that was off (e.g. 'th', a final 's', a vowel), how to
   fix it, and call out confusable pairs ("math" vs "match"). Skip words that
   were fine; do not pad. If pronunciation notes weren't requested, return [].
`.trim();

const TRANSCRIBE_SCHEMA = {
  type: "OBJECT",
  properties: {
    transcript: { type: "STRING" },
    pronunciation_notes: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["transcript"],
};

function buildTranscribePrompt(requested: string[]): string {
  const lines = ["Transcribe this audio faithfully — keep every mistake."];
  if (requested.includes("pronunciation")) {
    lines.push("Fill pronunciation_notes per the system instructions.");
  } else {
    lines.push("Return pronunciation_notes as [].");
  }
  return lines.join("\n");
}

// Self-invoke for the NEXT phase in a FRESH worker (so the analyze step gets its
// own wall-clock budget, separate from transcribe). Mirrors transcribe-long's
// selfInvokeNextChunk.
function selfInvoke(sessionId: number): void {
  const url = `${SUPABASE_URL}/functions/v1/daily-speaking-review`;
  runBackground(
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ _internal: true, session_id: sessionId }),
    }).then(() => {}),
  );
}

const SYSTEM_PROMPT = `
You are a warm, encouraging English speaking coach for BURMESE (Myanmar) learners.
You receive a learner's short spoken monologue (audio) or typed text and return
structured JSON feedback. Be kind and specific. Every explanation TO the learner
(reason_mm, explanation_mm, meaning_mm) is written in BURMESE (Myanmar language).
Keep grammar terms in English. The English the learner should produce — the
corrections, suggestions, strengths — stays in ENGLISH.

BURMESE STYLE (IMPORTANT — applies to EVERY Burmese field, especially the
"things to fix" reasons (reason_mm) and the "summary" (explanation_mm)):
- Write natural, warm, SPOKEN Myanmar — the way a friendly Myanmar teacher
  actually talks to a student face to face. NOT stiff, formal, textbook, or
  literary Burmese.
- Do NOT translate English word-for-word into Burmese. Express the idea the way
  a real Myanmar person would naturally say it; rephrase freely so it flows.
- Keep it short, clear, and encouraging — like friendly spoken advice, not a
  grammar-book definition. Avoid heavy formal particles and bookish phrasing.
- Only the technical grammar terms (e.g. past tense, article, subject, plural)
  stay in English; the rest is everyday spoken Burmese.

For VOICE input: transcribe faithfully what you hear (keep their actual words,
including mistakes) into "transcript", then split it into "sentences".

SENTENCES: split the transcript into sentences; for EACH produce { "original" }
= the learner's sentence exactly as said (keep their mistakes). This is the text
the app highlights the fixes on. Do NOT produce a rewritten/"native" version —
feedback is granular (highlight what's wrong + how to fix + pronunciation), not a
wholesale rewrite.

FIXES (the heart of this): produce a flat "fixes" array — one entry per specific
issue, listing the wrong words DIRECTLY (no inline splitting). Each fix is:
{ "type", "original", "correction", "reason_mm" } where
- "original"   = the EXACT wrong word(s) the learner said — the smallest span,
                 usually 1–4 words, copied verbatim from their sentence so the
                 app can locate it. NOT the whole sentence.
- "correction" = the fixed English (for "filler" this may be empty — the fix is
                 to drop the word).
- "reason_mm"  = a short BURMESE reason.
- "type"       = grammar | vocab | interference | filler (see below).

HARD RULES for fixes — follow EXACTLY:
- "original" must be a verbatim substring of the ONE sentence where that word
  appears (copy it from that sentence's "original").
- VERIFY EVERY FIX IN CONTEXT (most important): take the sentence the word
  appears in, replace "original" with "correction", and read the whole sentence.
  Keep the fix ONLY if the result is grammatical AND preserves the speaker's
  meaning. If the replacement is wrong or nonsensical — e.g. "I went to West
  Point" → "I weren't to West Point" — DISCARD the fix. A correction that belongs
  to a DIFFERENT word or sentence is a serious error; never attach a correction
  to a word it does not fit. When unsure, leave the word alone.
- If a word is already correct in its sentence, do NOT emit any fix for it.
- A grammar/vocab/interference fix MUST have a non-empty "correction" AND a
  non-empty "reason_mm". If you can't give both, omit the fix entirely.
- Be sparing and precise. A typical short monologue has only a handful of real
  issues. Do NOT invent fixes for correct, natural English just to fill a list.
- One fix per issue; do not bundle several unrelated errors into one fix.
- Return AT MOST 12 fixes — the 12 MOST IMPORTANT. Prioritise errors that block
  or change meaning, then the clearest recurring patterns. If there are more
  issues, keep only the 12 highest-impact and omit the rest. A short, high-value
  list beats an exhaustive one. (Don't repeat the SAME word→correction; cover it
  once.)
- READ THE WHOLE TALK to understand what the learner MEANT before judging a word.
  A word can be a real English word yet wrong for their meaning.
- A wrong, misheard, or confused word (e.g. "match" when they meant "math",
  "grace" when they meant "grades") is an ERROR → type="grammar", NEVER "vocab".
  Use "vocab" ONLY to upgrade a word that is already CORRECT in context.

"type" meanings — keep them distinct:
- "grammar"      = an actual error: wrong tense, agreement, article, word form,
                   OR a wrong/misheard/confused word (the fix is the right word).
- "vocab"        = a word already CORRECT but basic; the correction UPGRADES it to
                   a more precise/advanced single word. An enrichment, NOT an
                   error. When better_vocab is requested, ACTIVELY find 2-4
                   overused/basic words (good, big, nice, very, thing, get, a lot,
                   really) and elevate them to fit THIS context.
- "interference" = a literal Burmese→English translation that sounds unnatural.
- "filler"       = um, uh, like, you know …

Score the whole monologue 0-100, assign a CEFR "level", give 1-3 short ENGLISH
"strengths" and a 1-2 sentence BURMESE "explanation_mm". Estimate word_count.
ALWAYS set "inferred_topic" to a SHORT 3–6 word ENGLISH title naming what the
learner talked about (e.g. "My first teaching job"). It seeds the practice loop
for free-talk sessions, so keep it concise and title-like, not a sentence.

WORKED EXAMPLE — for the spoken sentence "I went to teach seven graders match."
emit one sentence and two GRAMMAR fixes (both are errors):
"sentences": [
  { "original": "I went to teach seven graders match." }
]
"fixes": [
  { "type": "grammar", "original": "seven graders", "correction": "seventh graders", "reason_mm": "<burmese>" },
  { "type": "grammar", "original": "match",          "correction": "math",          "reason_mm": "<burmese>" }
]
"match" is the WRONG word (they meant "math") — an error, so type="grammar", NOT
vocab. A "vocab" fix is an UPGRADE of a correct word, e.g.
{ "type": "vocab", "original": "good", "correction": "excellent", "reason_mm": "<burmese>" }.
Each fix's "original" is the exact word(s) copied verbatim from the sentence.
A "phrases" entry looks like:
{ "phrase": "a quick learner", "kind": "collocation", "meaning_mm": "<burmese>",
  "examples": [ { "en": "She is a quick learner.", "mm": "<burmese>" } ] }
Phrases must be USEFUL ones the learner did NOT already say.

Only emit fix types and fill optional sections the learner requested (listed in
the user message). When a requested section applies, you MUST populate it — if
better_vocab is requested, find at least 1-2 vocab fixes; if collocations/idioms
are requested, suggest at least 2 phrases. Do not invent content for sections
they did not request.
`.trim();

function buildPrompt(o: {
  onRamp: string;
  inputMode: string;
  requested: string[];
  topic: unknown;
  text?: string;
}): string {
  const want = (k: string) => o.requested.includes(k);
  const lines: string[] = [];
  lines.push(`Input mode: ${o.inputMode}.`);
  if (o.inputMode === "text" && o.text) {
    lines.push(`Learner's text:\n"""${o.text}"""`);
  }
  if (o.topic) {
    lines.push(`Topic context (JSON): ${JSON.stringify(o.topic)}`);
  }
  lines.push("\nProduce fixes[] of ONLY these types where they apply:");
  if (want("sentence_fixes")) {
    lines.push("- grammar: fix actual mistakes (smallest wrong span only), incl. wrong/misheard words.");
  }
  if (want("better_vocab")) {
    lines.push(
      "- vocab: take a CORRECT but plain word they used and upgrade it to a more precise/advanced one (single word). This is an upgrade, NOT an error fix — do not list mistakes here.",
    );
  }
  if (want("burmese_interference")) {
    lines.push("- interference (Burmese-to-English literal-translation errors)");
  }
  if (
    !want("sentence_fixes") && !want("better_vocab") &&
    !want("burmese_interference")
  ) {
    lines.push("- (none of the fix types were requested — leave fixes[] empty)");
  }
  lines.push("\nAlso fill ONLY these optional sections:");
  if (want("collocations") || want("idioms") || want("phrasal_verbs")) {
    lines.push(
      "- phrases: suggest NEW phrases the learner did NOT use — natural ones useful for THIS topic that would improve their next attempt. NEVER list phrases they already said. Each has meaning_mm + 1-2 examples.",
    );
    if (want("collocations")) lines.push('  • include kind "collocation" (natural word pairings).');
    if (want("idioms")) lines.push('  • include kind "idiom" (useful idioms/expressions).');
    if (want("phrasal_verbs")) lines.push('  • include kind "phrasal_verb" (useful phrasal verbs for this topic, e.g. "follow through", "drop out", "carry on").');
  }
  if (want("pronunciation") && o.inputMode === "voice") {
    lines.push(
      "- pronunciation_notes: for each word you ACTUALLY heard mispronounced, a" +
        " short, SPECIFIC, actionable BURMESE note: name the word, the exact" +
        " sound that was off (e.g. 'th', a final 's', a vowel), and how to fix" +
        " it (tongue/mouth tip). Call out confusable pairs (e.g. \"math\" vs" +
        " \"match\", \"grades\" vs \"grace\"). Skip words that were fine — do" +
        " NOT pad the list.",
    );
  }
  if (want("sub_scores")) {
    lines.push("- sub_scores: grammar, vocabulary, fluency, pronunciation (0-100 each)");
  }
  lines.push(
    "\nIf the topic includes target phrases, fill target_phrase_results (phrase_en, used, used_correctly).",
  );
  return lines.join("\n");
}

// Gemini responseSchema (OpenAPI subset). Optional fields are simply omitted by
// the model when not requested; only the core fields are required.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    score: { type: "INTEGER" },
    level: {
      type: "STRING",
      enum: ["beginner", "elementary", "intermediate", "upper_intermediate", "advanced", "fluent"],
    },
    inferred_topic: { type: "STRING" },
    transcript: { type: "STRING" },
    duration_seconds: { type: "INTEGER" },
    word_count: { type: "INTEGER" },
    speaking_pace_wpm: { type: "INTEGER" },
    explanation_mm: { type: "STRING" },
    strengths: { type: "ARRAY", items: { type: "STRING" } },
    native_rewrite: { type: "STRING" },
    pronunciation_notes: { type: "ARRAY", items: { type: "STRING" } },
    sentences: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          original: { type: "STRING" },
        },
        required: ["original"],
      },
    },
    fixes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING", enum: ["grammar", "vocab", "interference", "filler"] },
          original: { type: "STRING" },
          correction: { type: "STRING" },
          reason_mm: { type: "STRING" },
          reason_en: { type: "STRING" },
        },
        required: ["type", "original"],
      },
    },
    phrases: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          phrase: { type: "STRING" },
          kind: { type: "STRING", enum: ["collocation", "idiom", "phrasal_verb"] },
          meaning_mm: { type: "STRING" },
          meaning_en: { type: "STRING" },
          examples: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: { en: { type: "STRING" }, mm: { type: "STRING" } },
              required: ["en"],
            },
          },
        },
        required: ["phrase", "kind"],
      },
    },
    sub_scores: {
      type: "OBJECT",
      properties: {
        grammar: { type: "INTEGER" },
        vocabulary: { type: "INTEGER" },
        fluency: { type: "INTEGER" },
        pronunciation: { type: "INTEGER" },
      },
    },
    target_phrase_results: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          phrase_en: { type: "STRING" },
          used: { type: "BOOLEAN" },
          used_correctly: { type: "BOOLEAN" },
        },
        required: ["phrase_en", "used"],
      },
    },
  },
  required: ["score", "level", "strengths", "explanation_mm", "sentences"],
};
