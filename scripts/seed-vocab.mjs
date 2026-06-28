// Seed the Vocabulary content table from the mobile app's bundled JSON.
//
// One-off / re-runnable: upserts every group in the Flutter assets index into
// `vocab_groups` (scalar index columns + the full group as `data` JSONB).
// Idempotent via upsert on the primary key. Sets has_audio=false (audio ships
// later via the Bunny pipeline) and is_published=true (all 33 are ready).
//
//   node scripts/seed-vocab.mjs
//
// Reads SUPABASE url + SUPABASE_SERVICE_ROLE_KEY from .env.local (service role
// bypasses RLS so rows seed regardless of publish state).

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ASSETS = 'D:/PMP_Projects/speakcraft-lite/assets/vocabulary';
const GROUPS = join(ASSETS, 'groups');

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

// --- groups -----------------------------------------------------------------
const index = readJson(join(ASSETS, 'index.json'));
const groups = index.groups.map((idx) => {
  const g = readJson(join(GROUPS, `${idx.id}.json`));
  return {
    id: idx.id,
    level: g.level ?? idx.level ?? 1,
    section: idx.section ?? '',
    order_in_level: g.order ?? idx.order ?? 0,
    title: g.title ?? idx.title ?? '',
    theme: g.theme ?? idx.theme ?? '',
    unit: g.unit ?? idx.unit ?? 'word',
    style: g.style ?? 'contrast',
    word_count: idx.word_count ?? (g.words?.length ?? 0),
    data: g,
    has_audio: false,
    is_published: true,
    is_deleted: false,
  };
});

// --- push -------------------------------------------------------------------
async function upsert(table, rows) {
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await db.from(table).upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

await upsert('vocab_groups', groups);

const byLevel = groups.reduce((m, g) => ((m[g.level] = (m[g.level] ?? 0) + 1), m), {});
console.log(`Seeded vocab_groups: ${groups.length} groups`, byLevel);
