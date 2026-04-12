"""
backend/config.py
------------------
Centralised configuration for the EmotiCore backend.
All settings are read from environment variables so the app can be
configured via a .env file (loaded by python-dotenv) or from the
process environment in production.
"""

import os
from dotenv import load_dotenv

# Load .env from the project root (one level up from backend/)
_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(_root, ".env"))

# ── Server ────────────────────────────────────────────────────────────────────
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))
DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("1", "true", "yes")

# ── CORS ──────────────────────────────────────────────────────────────────────
# Comma-separated list of allowed origins, e.g.:
#   CORS_ORIGINS=http://localhost:5173,https://your-production-domain.com
_cors_raw: str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
)
CORS_ORIGINS: list[str] = [o.strip() for o in _cors_raw.split(",") if o.strip()]

# ── Dataset / model paths ─────────────────────────────────────────────────────
REPO_ROOT: str = os.getenv("REPO_ROOT", _root)
