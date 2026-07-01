// Seed the Speak Your Mind content table from the mobile app's bundled JSON.
//
// Re-runnable: upserts every topic into `sym_topics` (scalar index columns + the
// full topic as `data` JSONB, including toolbox/produce/guide/audio paths).
// Idempotent via upsert on the primary key. published=true.
//
//   node scripts/seed-sym.mjs
//
// Reads SUPABASE url + SUPABASE_SERVICE_ROLE_KEY from .env.local (service role
// bypasses RLS so rows seed regardless of publish state).

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ASSETS = 'D:/PMP_Projects/speakcraft-lite/assets/speak_your_mind';

// Curriculum order — MUST match symTopicIds in the Flutter sym_loader.dart.
// order_in_level is derived from position within each level.
const ORDER = [
  // Level 1 — Everyday life
  'about_me', 'my_family', 'my_friends', 'where_i_live', 'my_hometown',
  'my_daily_routine', 'my_weekend', 'my_work_and_studies', 'food_i_eat', 'my_free_time',
  // Level 2 — Stories & opinions
  'a_memorable_trip', 'an_unforgettable_day', 'my_first_day', 'a_problem_i_solved',
  'a_festival_i_celebrated', 'phones_and_social_media', 'city_vs_countryside',
  'online_vs_classroom', 'money_and_happiness', 'keeping_traditions',
  // Level 3 — Issues & current topics
  'climate_and_environment', 'technology_and_ai', 'education_today',
  'health_and_modern_life', 'the_future_of_work', 'news_and_misinformation',
  'rich_and_poor', 'english_in_our_lives', 'young_people_today', 'life_in_the_future',
];

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

// --- topics -----------------------------------------------------------------
const perLevel = {};
const rows = ORDER.map((id) => {
  const g = readJson(join(ASSETS, `${id}.json`));
  const level = g.level ?? 1;
  perLevel[level] = perLevel[level] ?? 0;
  const order_in_level = perLevel[level]++;
  const phrase_count = (g.toolbox ?? []).reduce((s, m) => s + (m.items?.length ?? 0), 0);
  return {
    id,
    level,
    domain_en: g.domain_en ?? '',
    domain_mm: g.domain_mm ?? '',
    title_en: g.title_en ?? '',
    title_mm: g.title_mm ?? '',
    order_in_level,
    move_count: (g.toolbox ?? []).length,
    phrase_count,
    // Freemium gate: Level 1 free; Level 2/3 premium. Deterministic from level,
    // so it's rewritten on every seed. To free a premium topic as a promo,
    // override is_free in the DB/admin AFTER seeding (a re-seed resets it).
    is_free: level === 1,
    published: true,
    data: g,
  };
});

// --- push -------------------------------------------------------------------
async function upsert(table, rows) {
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const { error } = await db.from(table).upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

await upsert('sym_topics', rows);

const byLevel = rows.reduce((m, r) => ((m[r.level] = (m[r.level] ?? 0) + 1), m), {});
console.log(`Seeded sym_topics: ${rows.length} topics`, byLevel);
