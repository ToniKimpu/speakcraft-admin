-- Per-video "Key Takeaways" deck path.
--
-- Holds the Bunny path/key to the video's key_takeaways.json (the curated
-- ~20 takeaways the mobile app shows as step 2 of the lesson). Optional and
-- mirrors sentence_explanation_path: default '' so existing rows stay valid
-- and admins fill it in per video once the deck is uploaded.
alter table "public"."listenings"
  add column if not exists "key_takeaways_path" text not null default ''::text;
