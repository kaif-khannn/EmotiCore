from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import sys
import logging

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import HOST, PORT, DEBUG, CORS_ORIGINS
from routes.api import router as api_router
from utils.serialization import to_python_types

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("emoticore")

# ── Custom JSON response that handles numpy types ───────────────────────────────
class NumPyJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return super().render(to_python_types(content))

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="EmotiCore — Multi-Modal Emotion Detection API",
    description="Detect emotions from Text, Speech, and Facial Expressions",
    version="1.0.0",
    default_response_class=NumPyJSONResponse,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("CORS origins: %s", CORS_ORIGINS)

# ── Global exception handler ───────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "detail": "Internal server error"},
    )

# ── Startup event ──────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    """Run once when the server starts. Initialise the feedback DB."""
    try:
        from utils.feedback_db import init_db
        init_db()
        logger.info("Feedback database initialised successfully.")
        
        # Pre-load models in background to avoid initial request timeouts
        import asyncio
        from models.text_model import get_classifier
        from models.audio_model import get_status as get_audio_status
        from models.image_model import get_status as get_image_status

        async def preload_models():
            logger.info("Background model pre-loading started...")
            await asyncio.to_thread(get_classifier)
            await asyncio.to_thread(get_audio_status)
            await asyncio.to_thread(get_image_status)
            logger.info("Background model pre-loading complete.")

        asyncio.create_task(preload_models())
    except Exception as exc:
        logger.warning("Could not initialise startup tasks: %s", exc)

# ── Routers ─────────────────────────────────────────────────────────────────────
app.include_router(api_router, prefix="/api")

# ── Health endpoints ────────────────────────────────────────────────────────────
@app.get("/api/direct-check", tags=["health"])
def direct_check():
    return {"status": "ok"}

@app.get("/", tags=["health"])
def read_root():
    return {"message": "EmotiCore API is running", "docs": "/docs"}

# ── Entrypoint ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    logger.info("Starting EmotiCore backend on %s:%s (debug=%s)", HOST, PORT, DEBUG)
    # Enable reload by default for better dev experience
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
