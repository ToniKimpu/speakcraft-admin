// Seed the Grammar (writing) content tables from the mobile app's bundled JSON.
//
// One-off / re-runnable: upserts every unit in the Flutter assets index into
// `writing_lessons` (published ones with full teach/toolkit/exercises, the rest
// as coming-soon metadata) and the shared verb/time-word/adjective/noun banks
// into `writing_lexicon`. Idempotent via upsert on the primary key.
//
//   node scripts/seed-writing.mjs
//
// Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local (service role
// bypasses RLS so unpublished rows seed too).

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ASSETS = 'D:/PMP_Projects/speakcraft-lite/assets/writing';
const UNITS = join(ASSETS, 'units');
const LEXICON = join(ASSETS, 'lexicon');

// --- env (.env.local) -------------------------------------------------------
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing SUPABASE url / service role key in .env.local');

const db = createClient(url, key, { auth: { persistSession: false } });
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

// --- lessons ----------------------------------------------------------------
const index = readJson(join(UNITS, 'index.json'));
const lessons = index.map((idx) => {
  const assetFile = join(UNITS, `${idx.id}.json`);
  const u = idx.published && existsSync(assetFile) ? readJson(assetFile) : {};
  return {
    id: idx.id,
    level: u.level ?? idx.level ?? 1,
    section_id: idx.section_id ?? '',
    section: u.section ?? idx.section ?? '',
    order_in_level: u.order ?? idx.order ?? 0,
    type: u.type ?? 'grammar_unit',
    title: u.title ?? idx.title ?? '',
    subtitle_mm: u.subtitle_mm ?? idx.subtitle_mm ?? '',
    teach: u.teach ?? {},
    toolkit: u.toolkit ?? {},
    exercises: u.exercises ?? [],
    practice_recap_en: u.practice_recap_en ?? '',
    practice_recap_mm: u.practice_recap_mm ?? '',
    tags: u.tags ?? [],
    is_published: idx.published === true,
  };
});

// --- lexicon ----------------------------------------------------------------
const KINDS = [
  ['verbs.json', 'verb'],
  ['time_words.json', 'time_word'],
  ['adjectives.json', 'adjective'],
  ['nouns.json', 'noun'],
];
const lexicon = KINDS.flatMap(([file, kind]) => {
  const p = join(LEXICON, file);
  if (!existsSync(p)) return [];
  return readJson(p).map((e) => ({ id: e.id, kind, data: e }));
});

// --- push -------------------------------------------------------------------
async function upsert(table, rows) {
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await db.from(table).upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

await upsert('writing_lessons', lessons);
await upsert('writing_lexicon', lexicon);

const pub = lessons.filter((l) => l.is_published).length;
console.log(
  `Seeded writing_lessons: ${lessons.length} (${pub} published, ${lessons.length - pub} coming-soon)`,
);
console.log(`Seeded writing_lexicon: ${lexicon.length}`);
