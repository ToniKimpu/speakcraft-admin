export const BUNNY_CDN_BASE =
  "https://pmp-english-app.b-cdn.net/spoken_patterns/";

export function resolveAudioUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return BUNNY_CDN_BASE + path.replace("bunny/", "");
}

export function normalizeAudioPath(fullUrl: string | null | undefined): string {
  if (!fullUrl) return "";
  const spokenPrefix = "/spoken_patterns/";
  const index = fullUrl.indexOf(spokenPrefix);
  if (index === -1) return fullUrl;
  return "bunny/" + fullUrl.substring(index + spokenPrefix.length);
}

// Listening content lives under /listenings/ on Bunny. Admins may paste a full
// CDN URL or the relative `bunny/...` form; we store the relative form so the
// mobile app composes the URL consistently (it strips `bunny/` and prepends the
// base from its .env). e.g.
//   https://pmp-english-app.b-cdn.net/listenings/grit/key_takeaways.json
//   -> bunny/grit/key_takeaways.json
// Idempotent: an already-relative value is returned unchanged.
export function normalizeListeningPath(value: string | null | undefined): string {
  if (!value) return "";
  const prefix = "/listenings/";
  const index = value.indexOf(prefix);
  if (index === -1) return value.trim();
  return "bunny/" + value.substring(index + prefix.length).trim();
}
