#!/usr/bin/env python3
"""Leaderboard API server for Elevator Action GB."""
import sqlite3
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DB_PATH = "/home/user/workspace/elevator-action-gb/leaderboard.db"

def get_db():
    db = sqlite3.connect(DB_PATH, check_same_thread=False)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("""CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        score INTEGER NOT NULL,
        level INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    db.commit()
    return db

db = get_db()

@asynccontextmanager
async def lifespan(app):
    yield
    db.close()

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class ScoreSubmission(BaseModel):
    name: str
    score: int
    level: int = 0

@app.get("/api/leaderboard")
def get_leaderboard():
    """Get top 20 scores."""
    rows = db.execute(
        "SELECT id, name, score, level, created_at FROM scores ORDER BY score DESC LIMIT 20"
    ).fetchall()
    return [
        {"id": r[0], "name": r[1], "score": r[2], "level": r[3], "created_at": r[4]}
        for r in rows
    ]

@app.post("/api/leaderboard", status_code=201)
def submit_score(entry: ScoreSubmission):
    """Submit a new score."""
    # Sanitize name: max 8 chars, alphanumeric + some symbols
    clean_name = entry.name[:8].strip().upper()
    if not clean_name:
        clean_name = "ANON"
    
    cur = db.execute(
        "INSERT INTO scores (name, score, level) VALUES (?, ?, ?)",
        [clean_name, max(0, entry.score), max(0, entry.level)]
    )
    db.commit()
    
    # Return the new entry's rank
    rank = db.execute(
        "SELECT COUNT(*) FROM scores WHERE score > ?", [entry.score]
    ).fetchone()[0] + 1
    
    return {"id": cur.lastrowid, "name": clean_name, "score": entry.score, "rank": rank}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
