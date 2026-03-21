# main.py
import os
from datetime import datetime
from typing import List, Literal, TypedDict, Optional
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, Body, Query, Path, Request
from fastapi.responses import RedirectResponse, Response
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import re
from onelogin.saml2.auth import OneLogin_Saml2_Auth
from onelogin.saml2.utils import OneLogin_Saml2_Utils

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
ALLOWED_GAMES = {"game1", "game2", "game3-1", "game3-2", "game3-3"}
TOP_N = 100

GAME_ALIASES = {
    "game1": "game1",
    "game2": "game2",
    "gm3-level1": "game3-1",
    "gm3-level2": "game3-2",
    "gm3-level3": "game3-3"
}
 
@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool
    # startup
    pool = SimpleConnectionPool(minconn=1, maxconn=10, dsn=DATABASE_URL)
    yield
    # shutdown
    if pool:
        pool.closeall()
        pool = None

app = FastAPI(lifespan=lifespan, title="Arcade Leaderboard & Analytics API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # <-- allow all domains
    allow_credentials=True,
    allow_methods=["*"],        # <-- allow all methods (GET, POST, etc.)
    allow_headers=["*"],        # <-- allow all headers
)

class LeaderboardRow(BaseModel):
    rank: int
    score: int
    username: str

# --- NEW SQL QUERIES FOR ANALYTICS TABLES ---

SQL_GET_LEADERBOARD = """
WITH BestScores AS (
    SELECT username, MAX(score) as max_score
    FROM public.game_analytics
    WHERE game = %s
    GROUP BY username
)
SELECT
    RANK() OVER (ORDER BY max_score DESC) AS rank,
    max_score AS score,
    UPPER(SUBSTRING(username, 1, 3)) AS username
FROM BestScores
ORDER BY rank
LIMIT %s;
"""

SQL_UPSERT_USER = """
INSERT INTO public.player_profiles (username, first_name, last_name, section)
VALUES (%s, %s, %s, %s)
ON CONFLICT (username) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, public.player_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.player_profiles.last_name),
    section = COALESCE(EXCLUDED.section, public.player_profiles.section);
"""

SQL_INSERT_SESSION = """
INSERT INTO public.game_analytics (game, username, score, time_played_seconds)
VALUES (%s, %s, %s, %s)
RETURNING id;
"""

SQL_GET_CURRENT_RANK = """
WITH BestScores AS (
    SELECT username, MAX(score) as max_score
    FROM public.game_analytics
    WHERE game = %s
    GROUP BY username
)
SELECT COUNT(*) + 1 FROM BestScores WHERE max_score > %s;
"""

SQL_PREVIEW = """
WITH BestScores AS (
    SELECT username, MAX(score) as max_score
    FROM public.game_analytics
    WHERE game = %s
    GROUP BY username
), stats AS (
  SELECT
    COUNT(*) FILTER (WHERE max_score > %s) AS cnt_gt,
    COUNT(*) FILTER (WHERE max_score = %s) AS cnt_eq,
    COUNT(*)                             AS rows_total
  FROM BestScores
)
SELECT
  1 + cnt_gt + cnt_eq AS preview_rank,
  (rows_total < %s) OR (1 + cnt_gt + cnt_eq) <= %s AS qualifies,
  rows_total AS current_rows
FROM stats;
"""


@app.get(
    "/leaderboard/{game}",
    response_model=List[LeaderboardRow],
    summary="Get leaderboard for a game",
    description="Returns rank, score, 3-letter username for the requested game based on all-time bests."
)
def get_leaderboard(
    game: str = Path(..., description="Game identifier (e.g., 'game1')"),
    limit: int = Query(TOP_N, ge=1, le=100, description="Number of rows to return (1–100)."),
):
    game = GAME_ALIASES.get(game.lower(), game.lower())

    if game not in ALLOWED_GAMES:
        raise HTTPException(status_code=404, detail="Unknown game")

    if pool is None:
        raise HTTPException(status_code=500, detail="DB not initialized")

    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(SQL_GET_LEADERBOARD, (game, limit))
            rows = cur.fetchall()
        # rows: List[tuple(rank, score, username)]
        return [{"rank": r, "score": s, "username": u.strip() if isinstance(u, str) else u} for (r, s, u) in rows]
    finally:
        pool.putconn(conn)


# --- UPDATED PAYLOAD MODELS ---
class SubmitPayload(BaseModel):
    game: str = Field(..., examples=["game1"])
    username: str = Field(..., examples=["sms0184"]) 
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    section: Optional[str] = None
    score: int = Field(..., ge=0, examples=[12345])
    time_played: int = Field(0, ge=0, examples=[120]) 

class SubmitResult(BaseModel):
    accepted: bool          
    rank: Optional[int]     
    score: int              
    username: str
    game: str

@app.post("/submit", response_model=SubmitResult, summary="Submit a score and update user profile")
def submit_score(payload: SubmitPayload = Body(...)):

    game = GAME_ALIASES.get(payload.game.lower(), payload.game.lower())

    if game not in ALLOWED_GAMES:
        raise HTTPException(status_code=400, detail="Unknown game")
    
    username = payload.username.lower()

    if pool is None:
        raise HTTPException(status_code=500, detail="DB not initialized")

    conn = pool.getconn()
    try:
        with conn:
            with conn.cursor() as cur:
                # 1) Upsert User Profile
                cur.execute(SQL_UPSERT_USER, (
                    username, 
                    payload.first_name, 
                    payload.last_name, 
                    payload.section
                ))

                # 2) Insert Game Session (Ledger)
                cur.execute(SQL_INSERT_SESSION, (
                    game, 
                    username, 
                    payload.score, 
                    payload.time_played
                ))

                # 3) Fetch current rank for this score
                cur.execute(SQL_GET_CURRENT_RANK, (game, payload.score))
                rank_row = cur.fetchone()
                rank = rank_row[0] if rank_row else 1

                return SubmitResult(
                    accepted=True,
                    rank=int(rank),
                    score=payload.score,
                    username=username,
                    game=game,
                )
    finally:
        pool.putconn(conn)


class PreviewResponse(BaseModel):
    preview_rank: int
    qualifies: bool
    current_rows: int
    top_n: int
    game: str
    score: int

@app.get("/preview", response_model=PreviewResponse, summary="Preview rank for a score (no insert)")
def preview_rank(game: str, score: int, n: int = TOP_N):

    game = GAME_ALIASES.get(game.lower(), game.lower())

    if pool is None:
        raise HTTPException(status_code=500, detail="DB not initialized")
    if game not in ALLOWED_GAMES:
        raise