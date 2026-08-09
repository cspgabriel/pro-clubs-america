-- Public EA catalog import support. Country remains NULL when the source does not provide it.
ALTER TABLE public.clubs DROP CONSTRAINT IF EXISTS clubs_ea_club_id_key;
ALTER TABLE public.clubs ALTER COLUMN country_code DROP DEFAULT;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS source_payload JSONB;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS all_time_rank INT;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS seasonal_rank INT;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS current_division INT;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS goals_per_game NUMERIC(8,3);
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS clubs_platform_ea_club_id_key ON public.clubs(platform, ea_club_id);

ALTER TABLE public.players ALTER COLUMN rating TYPE NUMERIC(5,2) USING rating::NUMERIC;
ALTER TABLE public.players ALTER COLUMN rating DROP DEFAULT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS country_code VARCHAR(5);
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS source_payload JSONB;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS goals_per_game NUMERIC(8,3);
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS assists_per_game NUMERIC(8,3);
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS tackles_per_game NUMERIC(8,3);
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.catalog_import_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_commit TEXT,
  club_count INT NOT NULL,
  player_count INT NOT NULL,
  match_count INT NOT NULL DEFAULT 0,
  source_files JSONB NOT NULL DEFAULT '[]'::JSONB,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.catalog_import_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Catalog Import Runs" ON public.catalog_import_runs FOR SELECT USING (true);

COMMENT ON COLUMN public.clubs.country_code IS 'Nullable because EA public rankings do not expose a reliable country for every club.';
COMMENT ON COLUMN public.players.country_code IS 'Nullable until supplied by the player/community registration.';
