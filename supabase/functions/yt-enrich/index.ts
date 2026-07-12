// yt-enrich — lazily generate the premium lesson steps for an imported video.
//
// The base import (yt-transcribe) ships only Watch + MM translation + shadowing.
// The richer steps are generated ON FIRST OPEN, one at a time, and cached:
//
//   step = "record"          → "Speak on your own": Gemini groups sentences into
//                              smooth recording passages (whole-transcript pass).
//   step = "key_takeaways"   → vocabulary / phrase / grammar takeaways deck.
//   step = "explanation"     → ONE sentence's deep explanation (per-sentence file).
//                              Requires { line_id }. Generated as the learner
//                              navigates the explanation pager, so we never
//                              block on N calls or hit the function time limit.
//
// Gemini NEVER sees or invents timestamps. It returns sentence-id groupings /
// references; we rebuild every start/end from the stored main_subtitle.json, so
// timings stay exactly what Whisper produced.
//
// All steps are PREMIUM. Token usage (Gemini in/out) is accumulated onto the
// user_imports_listening row via increment_import_tokens for cost monitoring.
//
// Deploy:  supabase functions deploy yt-enrich
// Secrets: GEMINI_API_KEY (existing). SUPABASE_URL / ANON / SERVICE_ROLE injected.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BUCKET = "user-imports";
const GEMINI_MODEL = "gemini-2.5-flash-lite";

// Appended to every prompt that produces Burmese, so it reads like a person
// talking, not a textbook.
const BURMESE_TONE =
  " Write ALL Burmese in a warm, natural, conversational tone — the way a " +
  "friendly Myanmar teacher would SPEAK to a student in everyday spoken " +
  "Burmese. Avoid stiff, formal, literary or textbook-style wording and bookish " +
  "words; keep it relaxed, clear and easy to read aloud.";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

const pad3 = (n: number) => `#${String(n).padStart(3, "0")}`;
const pad4 = (n: number) => String(n).padStart(4, "0");

// Coerce a `highlight` value to a string array — Gemini sometimes returns a
// bare string instead of the requested [string].
// deno-lint-ignore no-explicit-any
function asStrArray(v: any): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter((s) => s.length);
  if (typeof v === "string" && v) return [v];
  return [];
}

// ── Subtitle (the refined lines produced at import) ──────────────────────────

interface SubLine {
  id: number; // 1-based
  start: number;
  end: number;
  english: string;
  burmese: string;
  explanation_url: string;
}

async function loadSubtitle(url: string): Promise<SubLine[]> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`subtitle_fetch_${r.status}`);
  const arr = await r.json();
  if (!Array.isArray(arr) || arr.length === 0) throw new Error("subtitle_empty");
  return arr as SubLine[];
}

// ── Gemini (returns parsed JSON + token usage) ───────────────────────────────

interface Usage { input: number; output: number }
const ZERO: Usage = { input: 0, output: 0 };

// deno-lint-ignore no-explicit-any
async function gemini(
  systemText: string,
  userText: string,
  // deno-lint-ignore no-explicit-any
  responseSchema?: any,
  maxTokens = 8192,
): Promise<{ data: unknown; usage: Usage }> {
  const body = {
    systemInstruction: { parts: [{ text: systemText }] },
    contents: [{ role: "user", parts: [{ text: userText }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
      ...(responseSchema ? { responseSchema } : {}),
    },
  };
  // Try the cheap lite model first; only if it's overloaded (503/429) fall back
  // to a newer lite model. Each model gets a few retries with exponential
  // backoff for transient "high demand" spikes (Google says they're temporary).
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
      // Transient: retry / fall back. Anything else (e.g. 400/401) is a real
      // error — fail fast.
      if (resp.status === 503 || resp.status === 429 || resp.status === 500) {
        console.warn(`gemini ${model} ${resp.status}; retry ${attempt + 1}/3`);
        continue;
      }
      const detail = (await resp.text()).slice(0, 200);
      throw new Error(`gemini_http_${resp.status}: ${detail}`);
    }
    console.warn(`gemini ${model} exhausted; trying fallback model`);
  }
  if (!gj) throw new Error(`gemini_overloaded_${lastStatus}`);
  const cand = gj?.candidates?.[0];
  const finish = cand?.finishReason;
  const um = gj?.usageMetadata ?? {};
  const usage: Usage = {
    input: Number(um.promptTokenCount) || 0,
    output: Number(um.candidatesTokenCount) || 0,
  };
  let text = (cand?.content?.parts ?? [])
    .map((p: { text?: string }) => p?.text).filter(Boolean).join("").trim();
  if (!text) {
    const block = gj?.promptFeedback?.blockReason ?? "none";
    throw new Error(`gemini_empty(finish=${finish ?? "?"},block=${block})`);
  }
  // Some responses wrap JSON in a ```json fence despite the mime type.
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  try {
    return { data: JSON.parse(text), usage };
  } catch (_) {
    // MAX_TOKENS here means the JSON was cut off mid-output.
    throw new Error(`gemini_bad_json(finish=${finish ?? "?"},len=${text.length})`);
  }
}

// ── Step: record (group sentences into recording passages) ───────────────────

async function buildRecord(
  lines: SubLine[],
): Promise<{ value: unknown; usage: Usage }> {
  const numbered = lines.map((l) => ({ id: l.id, text: l.english }));
  const sys =
    "You group subtitle sentences into smooth 'speak on your own' recording " +
    "passages for English learners. Bundle 1-4 CONSECUTIVE sentences that form " +
    "one coherent thought, so reading the group aloud feels natural. Rules: " +
    "(1) only group consecutive ids; (2) cover every id exactly once, in order; " +
    "(3) a single long sentence may stand alone. Return a JSON array of arrays " +
    "of sentence ids, e.g. [[1],[2,3,4],[5,6]].";
  let groups: number[][] | null = null;
  let usage = ZERO;
  try {
    const out = await gemini(sys, JSON.stringify(numbered), {
      type: "ARRAY",
      items: { type: "ARRAY", items: { type: "INTEGER" } },
    });
    usage = out.usage;
    groups = validateGroups(out.data, lines.length);
  } catch (e) {
    console.error("buildRecord gemini failed, using 1:1 fallback:", e);
  }
  // Fallback: each sentence is its own passage.
  groups ??= lines.map((l) => [l.id]);

  const byId = new Map(lines.map((l) => [l.id, l]));
  const record = groups.map((ids, i) => {
    const members = ids.map((id) => byId.get(id)!).filter(Boolean);
    const first = members[0];
    const last = members[members.length - 1];
    return {
      id: pad3(i + 1),
      start: first.start,
      end: last.end,
      data: members.map((m) => ({
        start: m.start,
        end: m.end,
        text: m.english,
      })),
    };
  });
  return { value: record, usage };
}

// Validate that groups cover ids 1..n exactly once, consecutive & ascending.
// deno-lint-ignore no-explicit-any
function validateGroups(raw: any, n: number): number[][] | null {
  if (!Array.isArray(raw)) return null;
  const groups: number[][] = [];
  let expected = 1;
  for (const g of raw) {
    if (!Array.isArray(g) || g.length === 0) return null;
    const ids = g.map((x) => Number(x));
    for (const id of ids) {
      if (!Number.isInteger(id) || id !== expected) return null;
      expected++;
    }
    groups.push(ids);
  }
  return expected === n + 1 ? groups : null;
}

// ── Step: key takeaways ──────────────────────────────────────────────────────

async function buildKeyTakeaways(
  lines: SubLine[],
  youtubeId: string,
  title: string,
): Promise<{ value: unknown; usage: Usage }> {
  const numbered = lines.map((l) => ({ id: l.id, text: l.english }));
  // Scale the deck to the talk length (~1 item per 4 sentences) instead of a
  // fixed count, so short clips get fewer and long talks get more.
  const target = Math.min(24, Math.max(6, Math.round(lines.length / 4)));
  const sys =
    "You build a 'Key Takeaways' study deck for Myanmar (Burmese) English " +
    `learners from a talk transcript. Input is numbered sentences. Pick about ${target} ` +
    "of the MOST useful, DISTINCT items to learn — scale to the content, a few " +
    "more or fewer is fine, but never pad with weak or repetitive items: " +
    "vocabulary, phrases, idioms, phrasal verbs, " +
    "grammar patterns, and pronunciation notes. For EACH item return: " +
    "category (one of grammar_pattern|phrase|idiom|vocabulary|pronunciation), " +
    "headword, pos (or ''), phonetic (IPA or ''), gloss_my (short Burmese gloss), " +
    "explanation_my (clear Burmese explanation), examples (EXACTLY 2 distinct " +
    "{english, burmese, highlight:[string]}), source ({english: the exact source " +
    "sentence, " +
    "sentence_id: its id}), tip_my (or ''). " +
    "Return JSON: {summary_my, takeaways:[...]} — summary_my is a short " +
    "Burmese overview of the talk." + BURMESE_TONE;
  // Large Burmese output — give it plenty of room so the JSON isn't truncated.
  const out = await gemini(sys, JSON.stringify(numbered), undefined, 16384);
  // deno-lint-ignore no-explicit-any
  const d = (out.data ?? {}) as any;
  const takeaways = Array.isArray(d.takeaways) ? d.takeaways : [];
  // We own the identity + count fields so Gemini can't drift them.
  const value = {
    video_id: youtubeId,
    youtube_id: youtubeId,
    title,
    title_my: String(d.title_my ?? title),
    summary_my: String(d.summary_my ?? ""),
    takeaway_count: takeaways.length,
    // deno-lint-ignore no-explicit-any
    takeaways: takeaways.map((t: any, i: number) => ({
      id: i + 1,
      ...t,
      // deno-lint-ignore no-explicit-any
      examples: Array.isArray(t.examples)
        ? t.examples.map((e: any) => ({ ...e, highlight: asStrArray(e?.highlight) }))
        : [],
    })),
  };
  return { value, usage: out.usage };
}

// ── Step: explanation (one sentence, __template.json shape) ──────────────────

async function buildExplanation(
  lines: SubLine[],
  lineId: number,
): Promise<{ value: unknown; usage: Usage }> {
  const idx = lines.findIndex((l) => l.id === lineId);
  if (idx < 0) throw new Error("line_not_found");
  const target = lines[idx];
  const ctx = lines
    .slice(Math.max(0, idx - 2), Math.min(lines.length, idx + 3))
    .map((l) => `${l.id === lineId ? ">>" : "  "} [${l.id}] ${l.english}`)
    .join("\n");
  const sys =
    "You explain ONE sentence from a talk for Myanmar (Burmese) English learners. " +
    "Surrounding sentences are given for context (the target is marked >>). " +
    "Explain ONLY the target sentence. Return JSON with this exact shape: " +
    "{ title: short English headline, main: { english: the exact target " +
    "sentence, burmese: natural Burmese translation, highlights: [key phrases " +
    "from the sentence] }, terms: [ { number, kind (Noun|Verb|Adjective|Adverb|" +
    "Phrase|Idiom|Noun Phrase|Verb Phrase|Phrasal Verb|Grammar Pattern|" +
    "Emphatic Structure|Transition|Concept|Proper Noun|Term), term, " +
    "translation_my (or ''), definition_my (Burmese), examples: [ {english, " +
    "burmese, highlight:[string]} ] (EXACTLY 2 — highlight lists the exact " +
    "phrase(s) in that english example that use the term, so the app can bold " +
    "them; e.g. for the term 'Bernie guy', highlight ['Bernie guy']) } ], " +
    "note: { title_my, body_my } }. Pick the 2-5 most useful terms. Omit the " +
    "note field entirely if there's nothing worth adding." + BURMESE_TONE;
  const out = await gemini(
    sys,
    `Context:\n${ctx}\n\nTarget sentence [${lineId}]: ${target.english}`,
  );
  // deno-lint-ignore no-explicit-any
  const d = (out.data ?? {}) as any;
  // Guarantee main.english is the real sentence (don't trust a paraphrase).
  d.main = d.main ?? {};
  d.main.english = target.english;
  // Normalize each example's highlight to a string array.
  if (Array.isArray(d.terms)) {
    for (const term of d.terms) {
      if (Array.isArray(term?.examples)) {
        for (const ex of term.examples) ex.highlight = asStrArray(ex?.highlight);
      }
    }
  }
  return { value: d, usage: out.usage };
}

// ── Storage helpers ──────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
async function putJson(admin: any, path: string, value: unknown): Promise<string> {
  const { error } = await admin.storage.from(BUCKET).upload(
    path,
    new Blob([JSON.stringify(value)], { type: "application/json" }),
    { contentType: "application/json", upsert: true },
  );
  if (error) throw new Error(`upload_failed: ${error.message}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
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

  // 2. Parse input.
  let payload: { import_id?: string; step?: string; line_id?: number };
  try {
    payload = await req.json();
  } catch (_) {
    return json({ error: "invalid_body" }, 400);
  }
  const importId = String(payload.import_id ?? "").trim();
  const step = String(payload.step ?? "").trim();
  const lineId = Number(payload.line_id ?? 0) || 0;
  if (!importId) return json({ error: "missing_import_id" }, 400);
  const VALID = ["record", "key_takeaways", "explanation"];
  if (!VALID.includes(step)) return json({ error: "invalid_step" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 3. Load the import row and verify ownership.
  const { data: row } = await admin
    .from("user_imports_listening").select("*").eq("id", importId).maybeSingle();
  if (!row) return json({ error: "import_not_found" }, 404);
  if (row.user_id !== userId) return json({ error: "forbidden" }, 403);

  // 4. Pro gate — enriched steps of an import are a Pro feature (Gemini cost).
  // Import itself is Pro-only, so Standard/free never reach here with content to
  // enrich anyway. Error code stays "needs_premium" for client back-compat (old
  // builds map it to an upgrade prompt); it now means "needs Pro".
  const { data: urow } = await admin
    .from("users").select("pro_until").eq("user_id", userId).maybeSingle();
  const isPro = !!urow?.pro_until &&
    new Date(urow.pro_until as string).getTime() > Date.now();
  if (!isPro) return json({ error: "needs_premium" }, 402);

  // 5. Idempotency — return the cached step if it already exists.
  const pathCol: Record<string, string> = {
    record: "record_path",
    key_takeaways: "key_takeaways_path",
  };
  if (step !== "explanation" && row[pathCol[step]]) {
    return json({ import: row, path: row[pathCol[step]], cached: true });
  }

  // 6. Load the refined subtitle (the source of truth for text + timings).
  let lines: SubLine[];
  try {
    lines = await loadSubtitle(row.subtitle_path as string);
  } catch (e) {
    console.error("YT_ENRICH subtitle load failed:", e);
    return json({ error: "subtitle_unavailable" }, 502);
  }

  const base = `${userId}/${importId}`;

  try {
    if (step === "explanation") {
      if (!lineId) return json({ error: "missing_line_id" }, 400);
      const existing = lines.find((l) => l.id === lineId);
      if (existing?.explanation_url) {
        const r = await fetch(existing.explanation_url);
        if (r.ok) {
          return json({ url: existing.explanation_url, data: await r.json(), cached: true });
        }
      }
      const { value, usage } = await buildExplanation(lines, lineId);
      const url = await putJson(admin, `${base}/explanation/${pad4(lineId)}.json`, value);
      // Point the subtitle line at its new explanation file and re-upload.
      const updated = lines.map((l) =>
        l.id === lineId ? { ...l, explanation_url: url } : l
      );
      await putJson(admin, `${base}/main_subtitle.json`, updated);
      await admin.rpc("increment_import_tokens", {
        p_id: importId, p_in: usage.input, p_out: usage.output,
      });
      return json({ url, data: value });
    }

    // Whole-transcript steps.
    let value: unknown;
    let usage: Usage;
    let filename: string;
    if (step === "record") {
      ({ value, usage } = await buildRecord(lines));
      filename = "record_subtitle.json";
    } else {
      ({ value, usage } = await buildKeyTakeaways(
        lines, row.youtube_id as string, row.title as string,
      ));
      filename = "key_takeaways.json";
    }

    const url = await putJson(admin, `${base}/${filename}`, value);
    const { data: saved } = await admin
      .from("user_imports_listening")
      .update({ [pathCol[step]]: url })
      .eq("id", importId)
      .select()
      .single();
    await admin.rpc("increment_import_tokens", {
      p_id: importId, p_in: usage.input, p_out: usage.output,
    });
    console.log(
      `YT_ENRICH ok user=${userId} import=${importId} step=${step} in=${usage.input} out=${usage.output}`,
    );
    return json({ import: saved ?? row, path: url });
  } catch (e) {
    console.error(`YT_ENRICH ${step} failed:`, e);
    return json(
      { error: "generation_failed", step, message: String(e).slice(0, 200) },
      502,
    );
  }
});
