import sqlite3
import os
import json
from datetime import datetime
import logging

logger = logging.getLogger("emoticore.feedback")

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "datasets", "feedback", "feedback.db")
ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "datasets", "feedback", "assets")

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    os.makedirs(ASSETS_DIR, exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS feedback_samples (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            modality TEXT NOT NULL,
            input_path TEXT,
            raw_input TEXT,
            predicted TEXT NOT NULL,
            corrected TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            integrated BOOLEAN DEFAULT 0
        )
    ''')
    conn.commit()
    conn.close()

def save_feedback(modality, predicted, corrected, input_path=None, raw_input=None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO feedback_samples (modality, input_path, raw_input, predicted, corrected)
        VALUES (?, ?, ?, ?, ?)
    ''', (modality, input_path, raw_input, predicted, corrected))
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    logger.info(f"Feedback database initialized at {DB_PATH}")
