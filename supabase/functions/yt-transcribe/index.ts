// yt-transcribe — turn an uploaded audio file into a Listening & Shadowing lesson.
//
// The CLIENT downloads the audio (its own residential IP — no bot-block) and
// uploads it here as multipart form-data. This function:
//   1. authenticates the user
//   2. enforces the free LIFETIME import quota + duration cap (admin-editable
//      via youtube_import_config). Premium = users.premium_until > now.
//   3. transcribes via OpenAI Whisper (whisper-1, verbose_json, word+segment
//      timestamps — word level is needed for shadowing).
//   4. translates each line to Burmese via Gemini (free baseline includes MM).
//   5. builds main_subtitle.json + shadowing.json, stores them in the PUBLIC
//      'user-imports' bucket, and inserts a user_imports_listening row. The
//      enriched steps (record / key takeaways / explanations) are generated
//      lazily later by yt-enrich.
//
// Quota is a TOTAL minutes budget: SUM(duration_sec) over the user's rows
// (incl soft-deleted) must stay under their free/premium cap. We only insert on
// SUCCESS, so a failed transcription never costs the user any minutes.
//
// Deploy:  supabase functions deploy yt-transcribe
// Secrets: OPENAI_API_KEY (new), GEMINI_API_KEY (existing). SUPABASE_URL /
//          SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BUCKET = "user-imports";
const WHISPER_MAX_BYTES = 25 * 1024 * 1024; // OpenAI hard limit
const GEMINI_MODEL = "gemini-2.5-flash-lite";

interface Usage { input: number; output: number }
const ZERO_USAGE: Usage = { input: 0, output: 0 };
// deno-lint-ignore no-explicit-any
function usageOf(gj: any): Usage {
  const um = gj?.usageMetadata ?? {};
  return {
    input: Number(um.promptTokenCount) || 0,
    output: Number(um.candidatesTokenCount) || 0,
  };
}

// Robust Gemini caller: retries transient overload (503/429/500) with backoff
// and falls back to a newer lite model. Without this, a "high demand" spike
// silently drops the refine/translate passes — losing the MM translation AND
// the token counts (the import still succeeds on Whisper alone).
// deno-lint-ignore no-explicit-any
async function callGemini(body: unknown): Promise<any> {
  const models = [GEMINI_MODEL, "gemini-3.1-flash-lite"];
  // deno-lint-ignore no-explicit-any
  let gj: any = null;
  let lastStatus = 0;
  outer:
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 700 * 2 ** (attempt - 1)));
      }
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (resp.ok) {
        gj = await resp.json();
        break outer;
      }
      lastStatus = resp.status;
      if (resp.status === 503 || resp.status === 429 || resp.status === 500) {
        console.warn(`gemini ${model} ${resp.status}; retry ${attempt + 1}/3`);
        continue;
      }
      throw new Error(`gemini_http_${resp.status}`);
    }
  }
  if (!gj) throw new Error(`gemini_overloaded_${lastStatus}`);
  return gj;
}

const DEFAULTS = {
  free_total_sec: 600, // 10 min, lifetime budget
  premium_total_sec: 18000, // 300 min
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

const pad3 = (n: number) => `#${String(n).padStart(3, "0")}`;

// ── Whisper ──────────────────────────────────────────────────────────────────

interface WhisperWord { word: string; start: number; end: number }
interface WhisperSegment { id: number; start: number; end: number; text: string }

async function transcribe(
  file: File,
): Promise<{ segments: WhisperSegment[]; words: WhisperWord[] }> {
  const form = new FormData();
  form.append("file", file, file.name || "audio.m4a");
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  form.append("timestamp_granularities[]", "word");

  const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });
  if (!resp.ok) {
    const detail = (await resp.text()).slice(0, 400);
    throw new Error(`whisper_${resp.status}: ${detail}`);
  }
  // deno-lint-ignore no-explicit-any
  const data = await resp.json() as any;
  const segments: WhisperSegment[] = (data.segments ?? []).map((
    // deno-lint-ignore no-explicit-any
    s: any,
    i: number,
  ) => ({
    id: typeof s.id === "number" ? s.id : i,
    start: Number(s.start) || 0,
    end: Number(s.end) || 0,
    text: String(s.text ?? "").trim(),
  })).filter((s: WhisperSegment) => s.text);
  // deno-lint-ignore no-explicit-any
  const words: WhisperWord[] = (data.words ?? []).map((w: any) => ({
    word: String(w.word ?? ""),
    start: Number(w.start) || 0,
    end: Number(w.end) || 0,
  }));
  return { segments, words };
}

// ── Gemini batch translation (English[] → Burmese[]) ─────────────────────────

async function translateToBurmese(
  lines: string[],
): Promise<{ values: string[]; usage: Usage }> {
  if (lines.length === 0) return { values: [], usage: ZERO_USAGE };
  try {
    const body = {
      systemInstruction: {
        parts: [{
          text:
            "You are a translator for Myanmar (Burmese) English learners. " +
            "Translate each English string into warm, natural, CONVERSATIONAL " +
            "Burmese — the way a friendly Myanmar teacher would speak in " +
            "everyday spoken Burmese, not stiff or textbook-style writing. " +
            "Return a JSON array of strings, SAME length and SAME order as the " +
            "input. Do not add, merge, or drop items.",
        }],
      },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(lines) }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: { type: "ARRAY", items: { type: "STRING" } },
      },
    };
    // deno-lint-ignore no-explicit-any
    const gj = await callGemini(body) as any;
    const out = (gj?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p?.text).filter(Boolean).join("");
    const arr = JSON.parse(out) as string[];
    // Pad/truncate to match — never let a translation hiccup break the import.
    return { values: lines.map((_, i) => String(arr[i] ?? "")), usage: usageOf(gj) };
  } catch (e) {
    console.error("YT_TRANSCRIBE translate failed (non-fatal):", e);
    // ship English-only; MM can be regenerated later
    return { values: lines.map(() => ""), usage: ZERO_USAGE };
  }
}

// ── Gemini refine pass (merge Whisper fragments into clean sentences) ─────────
//
// Whisper often splits one sentence across several segments ("I want to go" /
// "to school"), which reads badly and is hard to translate. We ask Gemini to
// MERGE consecutive segments into complete sentences — returning only groupings
// of segment indices + lightly-cleaned text. Gemini never sees or invents
// timestamps: we rebuild each line's start/end from the original segments, and
// shadowing words still come from Whisper, so karaoke timing stays exact.
//
// Constraint enforced by validation: the returned groups must cover every input
// index exactly once, in ascending contiguous order. If Gemini returns anything
// that fails that check (or the call errors), we fall back to the raw segments
// unchanged — refinement is a nicety, never a point of failure.

interface RefinedLine { start: number; end: number; text: string }

function rebuildFromGroups(
  // deno-lint-ignore no-explicit-any
  groups: any[],
  segments: WhisperSegment[],
): RefinedLine[] | null {
  if (!Array.isArray(groups) || groups.length === 0) return null;
  const lines: RefinedLine[] = [];
  let expected = 0;
  for (const g of groups) {
    const ids: number[] = Array.isArray(g?.ids)
      ? g.ids.map((n: unknown) => Number(n)).filter((n: number) => Number.isInteger(n))
      : [];
    const text = String(g?.text ?? "").trim();
    if (ids.length === 0 || !text) return null;
    // Must be contiguous and start exactly where the previous group ended.
    for (let k = 0; k < ids.length; k++) {
      if (ids[k] !== expected) return null;
      expected++;
    }
    const first = segments[ids[0]];
    const last = segments[ids[ids.length - 1]];
    if (!first || !last) return null;
    lines.push({ start: first.start, end: last.end, text });
  }
  // Every original segment must be accounted for.
  if (expected !== segments.length) return null;
  return lines;
}

async function refineSegments(
  segments: WhisperSegment[],
): Promise<{ lines: RefinedLine[]; usage: Usage }> {
  const raw = segments.map((s) => ({ start: s.start, end: s.end, text: s.text }));
  if (segments.length <= 1) return { lines: raw, usage: ZERO_USAGE };
  try {
    const numbered = segments.map((s, i) => ({ i, text: s.text }));
    const body = {
      systemInstruction: {
        parts: [{
          text:
            "You clean raw speech-to-text segments for English learners. Input " +
            "is a JSON array of {i, text} in spoken order. Whisper often splits " +
            "one sentence across several segments. Merge CONSECUTIVE segments " +
            "that belong to the same sentence so each output item is one " +
            "complete, natural sentence. Rules: (1) only merge consecutive " +
            "indices — never reorder or split across non-adjacent indices; " +
            "(2) cover every input index exactly once, in ascending order; " +
            "(3) keep the original words — you may ONLY fix capitalization, " +
            "spacing and punctuation; do NOT add, drop, paraphrase or translate " +
            "words. Return a JSON array of {ids:[int], text:string}.",
        }],
      },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(numbered) }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              ids: { type: "ARRAY", items: { type: "INTEGER" } },
              text: { type: "STRING" },
            },
            required: ["ids", "text"],
          },
        },
      },
    };
    // deno-lint-ignore no-explicit-any
    const gj = await callGemini(body) as any;
    const usage = usageOf(gj);
    const out = (gj?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p?.text).filter(Boolean).join("");
    const rebuilt = rebuildFromGroups(JSON.parse(out), segments);
    if (rebuilt) {
      console.log(`YT_TRANSCRIBE refine: ${segments.length} -> ${rebuilt.length} lines`);
      return { lines: rebuilt, usage };
    }
    console.error("YT_TRANSCRIBE refine: validation failed, using raw segments");
    return { lines: raw, usage };
  } catch (e) {
    console.error("YT_TRANSCRIBE refine failed (non-fatal):", e);
    return { lines: raw, usage: ZERO_USAGE };
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // 1. Authenticate.
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

  // 2. Parse multipart input.
  let form: FormData;
  try {
    form = await req.formData();
  } catch (_) {
    return json({ error: "invalid_form" }, 400);
  }
  const file = form.get("audio");
  if (!(file instanceof File)) return json({ error: "missing_audio" }, 400);
  if (file.size > WHISPER_MAX_BYTES) {
    return json({ error: "audio_too_large", max_bytes: WHISPER_MAX_BYTES }, 413);
  }
  const youtubeId = String(form.get("youtube_id") ?? "").trim();
  if (!youtubeId) return json({ error: "missing_youtube_id" }, 400);
  const title = String(form.get("title") ?? "").trim();
  const thumbnailUrl = String(form.get("thumbnail_url") ?? "").trim();
  const durationSec = Math.round(Number(form.get("duration_sec") ?? 0)) || 0;
  // Client-measured length of the uploaded audio (best-effort; 0 if the device
  // couldn't read it). Used to gate Whisper cost on the real audio, not just
  // the URL's duration.
  const audioDurationSec =
    Math.round(Number(form.get("audio_duration_sec") ?? 0)) || 0;
  const sourceUrl = String(form.get("source_url") ?? "").trim() ||
    `https://www.youtube.com/watch?v=${youtubeId}`;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date();

  // 3. Premium + minutes-budget gate. Whisper is the only metered cost; each
  // user has a TOTAL number of audio-minutes they may import. Used minutes =
  // SUM(duration_sec) over ALL their rows INCLUDING soft-deleted ones, so a
  // delete can't refund minutes.
  const { data: urow } = await admin
    .from("users").select("premium_until").eq("user_id", userId).maybeSingle();
  const isPremium = !!urow?.premium_until &&
    new Date(urow.premium_until as string).getTime() > now.getTime();

  let cfg = { ...DEFAULTS };
  try {
    const { data } = await admin.from("youtube_import_config")
      .select("free_total_sec, premium_total_sec")
      .eq("id", 1).maybeSingle();
    if (data) {
      cfg = {
        free_total_sec: Number(data.free_total_sec) || DEFAULTS.free_total_sec,
        premium_total_sec: Number(data.premium_total_sec) || DEFAULTS.premium_total_sec,
      };
    }
  } catch (_) { /* defaults */ }

  const budgetSec = isPremium ? cfg.premium_total_sec : cfg.free_total_sec;

  // Sum only the pool matching the user's CURRENT tier, so the free trial and
  // the premium allotment are independent (upgrading gives a full premium pool).
  let usedSec = 0;
  {
    const { data: rows } = await admin
      .from("user_imports_listening")
      .select("duration_sec")
      .eq("user_id", userId)
      .eq("imported_free", !isPremium);
    for (const r of (rows ?? [])) usedSec += Number(r.duration_sec) || 0;
  }

  // This import's cost = the LONGER of the YouTube duration and the client-
  // measured audio (a short URL + long audio upload would still cost Whisper for
  // the real audio). The 25 MB cap above is the hard backstop. One gate covers
  // both "out of minutes" and "this video is longer than what's left".
  const thisSec = Math.max(durationSec, audioDurationSec);
  if (thisSec > 0 && usedSec + thisSec > budgetSec) {
    return json({
      error: "import_quota_exceeded",
      used_sec: usedSec,
      this_sec: thisSec,
      budget_sec: budgetSec,
      remaining_sec: Math.max(0, budgetSec - usedSec),
      is_premium: isPremium,
    }, 402);
  }

  // 4. Transcribe.
  let segments: WhisperSegment[];
  let words: WhisperWord[];
  try {
    ({ segments, words } = await transcribe(file));
  } catch (e) {
    console.error("YT_TRANSCRIBE whisper failed:", e);
    return json(
      { error: "transcription_failed", message: String(e).slice(0, 200) },
      502,
    );
  }
  if (segments.length === 0) {
    return json({ error: "empty_transcript" }, 422);
  }

  // Cross-check: the real audio length is the last segment's end. If it's far
  // from the video duration the user likely uploaded the wrong file — surface a
  // (non-fatal) flag so the client can note it. The lesson is still built.
  const actualAudioSec = Math.round(segments[segments.length - 1]?.end ?? 0);
  const refDuration = durationSec || audioDurationSec;
  const durationMismatch = refDuration > 0 &&
    Math.abs(actualAudioSec - refDuration) > Math.max(30, refDuration * 0.15);

  // 5. Refine: merge Whisper fragments into clean sentences (better reading +
  // translation). Falls back to raw segments on any failure.
  const refine = await refineSegments(segments);
  const lines = refine.lines;

  // 6. Translate the refined lines to Burmese (free baseline). Best-effort.
  const translation = await translateToBurmese(lines.map((l) => l.text));
  const burmese = translation.values;

  // Accumulate Gemini token usage (refine + translate) for cost monitoring.
  const geminiIn = refine.usage.input + translation.usage.input;
  const geminiOut = refine.usage.output + translation.usage.output;

  // 7. Build the three feature JSONs from the refined lines. Shadowing words
  // still come from Whisper, filtered by each line's span, so karaoke timing is
  // unchanged by the merge.
  const subtitle = lines.map((l, i) => ({
    id: i + 1,
    start: l.start,
    end: l.end,
    english: l.text,
    burmese: burmese[i] ?? "",
    explanation_url: "", // populated lazily when explanations are generated
  }));

  const shadowing = lines.map((l, i) => ({
    id: pad3(i + 1),
    start: l.start,
    end: l.end,
    text: l.text,
    words: words
      .filter((w) => w.start >= l.start && w.start < l.end)
      .map((w) => ({ word: w.word, start: w.start, end: w.end, score: 1.0 })),
  }));

  // NOTE: "Speak on your own" (record_subtitle) is NOT built here. It needs a
  // whole-transcript Gemini grouping pass (sentences → smooth recording
  // passages), so it's generated lazily by yt-enrich on first open. Leaving
  // record_path empty keeps that step hidden until then.

  // 8. Store JSON in the public bucket under {uid}/{importId}/.
  const importId = crypto.randomUUID();
  const base = `${userId}/${importId}`;
  const publicUrl = (name: string) =>
    `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${base}/${name}`;

  async function put(name: string, value: unknown): Promise<string> {
    const { error } = await admin.storage.from(BUCKET).upload(
      `${base}/${name}`,
      new Blob([JSON.stringify(value)], { type: "application/json" }),
      { contentType: "application/json", upsert: true },
    );
    if (error) throw new Error(`upload_${name}: ${error.message}`);
    return publicUrl(name);
  }

  let subtitlePath: string, shadowingPath: string;
  try {
    subtitlePath = await put("main_subtitle.json", subtitle);
    shadowingPath = await put("shadowing.json", shadowing);
  } catch (e) {
    console.error("YT_TRANSCRIBE storage failed:", e);
    return json(
      { error: "storage_failed", message: String(e).slice(0, 200) },
      500,
    );
  }

  // 9. Insert the row (counts as one used import).
  const { data: row, error: insErr } = await admin
    .from("user_imports_listening")
    .insert({
      id: importId,
      user_id: userId,
      youtube_id: youtubeId,
      title: title || "YouTube import",
      thumbnail_url: thumbnailUrl ||
        `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
      duration_sec: durationSec ||
        Math.round(lines[lines.length - 1]?.end ?? 0),
      source_url: sourceUrl,
      subtitle_path: subtitlePath,
      shadowing_path: shadowingPath,
      imported_free: !isPremium,
      gemini_input_tokens: geminiIn,
      gemini_output_tokens: geminiOut,
      whisper_audio_sec: actualAudioSec,
    })
    .select()
    .single();

  if (insErr || !row) {
    console.error("YT_TRANSCRIBE insert failed:", insErr);
    return json(
      { error: "save_failed", message: insErr?.message ?? "insert returned no row" },
      500,
    );
  }

  console.log(
    `YT_IMPORT ok user=${userId} import=${importId} yt=${youtubeId} segs=${segments.length} lines=${lines.length}`,
  );

  return json({
    import: row,
    sentenceCount: lines.length,
    durationMismatch,
    audioDurationSec: actualAudioSec,
  });
});
