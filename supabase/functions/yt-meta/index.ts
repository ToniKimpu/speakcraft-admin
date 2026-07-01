// yt-meta — resolve a YouTube URL (or bare 11-char id) to
//   { youtubeId, title, thumbnailUrl, durationSeconds }
// via the official YouTube Data API v3. This is the STABLE path: unlike caption
// scrapers / on-device extractors, the Data API does not break when YouTube
// changes its player. Used by the import screen to preview a video and enforce
// the duration cap BEFORE the user uploads any audio.
//
// auth → extract video id → videos.list(snippet,contentDetails) → mapped meta.
//
// Deploy:  supabase functions deploy yt-meta
// Secret:  YOUTUBE_API_KEY (new — set with `supabase secrets set`).
//          SUPABASE_URL / SUPABASE_ANON_KEY are injected automatically.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

// Pull an 11-char video id out of the common URL shapes, or accept a bare id.
function extractVideoId(input: string): string | null {
  const s = (input ?? "").trim();
  if (!s) return null;
  if (ID_RE.test(s)) return s;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1, 12);
      if (ID_RE.test(id)) return id;
    }
    if (host.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && ID_RE.test(v)) return v;
      const m = u.pathname.match(/\/(?:shorts|embed|v|live)\/([A-Za-z0-9_-]{11})/);
      if (m) return m[1];
    }
  } catch (_) { /* not a URL — fall through to regex */ }
  const m = s.match(/[?&]v=([A-Za-z0-9_-]{11})/) ??
    s.match(/(?:youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[m.length - 1] : null;
}

// ISO-8601 duration (e.g. "PT1H2M30S") → seconds.
function parseISODuration(iso: string): number {
  const m = (iso ?? "").match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return Number(d || 0) * 86400 + Number(h || 0) * 3600 +
    Number(min || 0) * 60 + Number(s || 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Authenticate (so anonymous traffic can't burn our Data API quota).
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
  const raw = String(payload.url ?? payload.videoUrl ?? "").trim();
  if (!raw) return json({ error: "missing_url" }, 400);

  const youtubeId = extractVideoId(raw);
  if (!youtubeId) return json({ error: "invalid_url" }, 400);

  let yt: Response;
  try {
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      id: youtubeId,
      key: YOUTUBE_API_KEY,
    });
    yt = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`,
    );
  } catch (e) {
    console.error("YT_META fetch failed:", e);
    return json({ error: "youtube_unreachable" }, 503);
  }

  if (!yt.ok) {
    const detail = (await yt.text()).slice(0, 300);
    console.error(`YT_META upstream ${yt.status}: ${detail}`);
    // 403 here usually means a bad/over-quota API key — our config problem.
    return json({ error: "youtube_api_error", status: yt.status }, 502);
  }

  // deno-lint-ignore no-explicit-any
  const data = await yt.json() as any;
  const item = data?.items?.[0];
  if (!item) return json({ error: "video_not_found" }, 404);

  const thumbs = item.snippet?.thumbnails ?? {};
  const thumbnailUrl: string = thumbs.maxres?.url ?? thumbs.standard?.url ??
    thumbs.high?.url ?? thumbs.medium?.url ?? thumbs.default?.url ??
    `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;

  return json({
    youtubeId,
    title: String(item.snippet?.title ?? "").trim(),
    channelTitle: String(item.snippet?.channelTitle ?? "").trim(),
    thumbnailUrl,
    durationSeconds: parseISODuration(item.contentDetails?.duration ?? ""),
    sourceUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
  });
});
