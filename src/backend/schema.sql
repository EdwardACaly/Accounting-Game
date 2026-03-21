
--SERVER CONFIGURATION

-- might throw a "role already exists" error
-- thats fine just ignore it, makes sure things are running smoothly on the first launch easier
CREATE ROLE game_app LOGIN PASSWORD 'Turmoil4-Mouse8-Attic8-Shorthand4-Catsup8' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE DATABASE leaderboard OWNER game_app;

-- 
-- THE OLD ARCADE SYSTEM (Archived)
-- We want to keep the old data for now, in case sponsor wants it or we need to revert 
CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  game TEXT NOT NULL CHECK (game IN ('game1', 'game2', 'game3-1', 'game3-2', 'game3-3')),
  username VARCHAR(3) NOT NULL CHECK (username ~ '^[a-zA-Z]{3}$'),
  score INTEGER NOT NULL CHECK (score >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scores_sort ON scores (id, game, score DESC, created_at ASC, username ASC);

DROP FUNCTION IF EXISTS prune_topN() CASCADE;

CREATE OR REPLACE FUNCTION prune_topN()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    N integer := 100;
BEGIN
    WITH to_drop AS (
        SELECT id
        FROM scores
        WHERE game = NEW.game
        ORDER BY score DESC, created_at ASC, username ASC
        OFFSET N
    )
    DELETE FROM scores s
    USING to_drop d
    WHERE s.id = d.id;

    RETURN NULL;
END;
$$;

-- Note: We use "CREATE OR REPLACE TRIGGER" in case you run this file multiple times
DROP TRIGGER IF EXISTS scores_keep_topN ON scores;
CREATE TRIGGER scores_keep_topN
AFTER INSERT OR UPDATE OF score ON scores
FOR EACH ROW EXECUTE FUNCTION prune_topN();


--  NEW ANALYTICS LEDGER

-- Permanent Student/User Info
CREATE TABLE IF NOT EXISTS public.player_profiles (
    username VARCHAR(100) PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    section VARCHAR(50),
    first_login_at TIMESTAMPTZ DEFAULT NOW()
);

-- The Analytics Ledger (Every single game played)
-- NO pruning trigger since we want to save every game (for now)
CREATE TABLE IF NOT EXISTS public.game_analytics (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) REFERENCES public.player_profiles(username),
    game TEXT NOT NULL CHECK (game IN ('game1', 'game2', 'game3-1', 'game3-2', 'game3-3')),
    score INTEGER NOT NULL CHECK (score >= 0),
    time_played_seconds INTEGER DEFAULT 0,
    played_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_game_analytics_game_score ON public.game_analytics(game, score DESC);

-- PERMISSIONS & GRANTS 
-- updated for the new table set ups 

GRANT CONNECT ON DATABASE leaderboard TO game_app;
GRANT USAGE ON SCHEMA public TO game_app;

-- Grants for the old table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE scores TO game_app;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.scores_id_seq TO game_app;

-- Grants for the NEW tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE player_profiles TO game_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE game_analytics TO game_app;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.game_analytics_id_seq TO game_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO game_app;