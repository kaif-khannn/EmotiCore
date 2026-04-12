from fastapi import APIRouter, File, UploadFile, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any

from models.text_model import predict_text_emotion
from models.audio_model import predict_audio_emotion, get_status as get_audio_status
from models.image_model import predict_image_emotion, get_status as get_image_status
from models.fusion import aggregate_predictions
from models.analytics_store import log_inference, get_analytics
from utils.serialization import to_python_types

from routes.schemas import PredictionResponse, HealthCheckResponse, AnalyticsResponse
from routes.feedback import router as feedback_router

import logging
logger = logging.getLogger("emoticore.api")

router = APIRouter()
router.include_router(feedback_router)

@router.get("/health-check", response_model=HealthCheckResponse)
async def get_system_status():
    """Return the status of the underlying emotion recognition models."""
    logger.debug("Health check requested")
    return {
        "audio": get_audio_status(),
        "image": get_image_status(),
        "system": "Operational"
    }

class TextInput(BaseModel):
    text: str

@router.post("/predict/text", response_model=PredictionResponse)
async def predict_text(input_data: TextInput):
    """Predict emotion from provided text."""
    result = predict_text_emotion(input_data.text)
    if "error" not in result:
        log_inference("text", result.get("emotion", "Unknown"), float(result.get("confidence", 0)))
    return to_python_types(result)

@router.post("/predict/audio", response_model=PredictionResponse)
async def predict_audio(file: UploadFile = File(...)):
    """Predict emotion from provided audio file (.wav)."""
    audio_bytes = await file.read()
    result = predict_audio_emotion(audio_bytes)
    if "error" not in result:
        log_inference("audio", result.get("emotion", "Unknown"), float(result.get("confidence", 0)))
    return to_python_types(result)

@router.post("/predict/image", response_model=PredictionResponse)
async def predict_image(file: UploadFile = File(...)):
    """Predict emotion from provided image file."""
    image_bytes = await file.read()
    result = predict_image_emotion(image_bytes)
    if "error" not in result:
        emotion = result.get("emotion", "Unknown")
        confidence = float(result.get("confidence", 0))
        log_inference("image", emotion, confidence)
    return to_python_types(result)

@router.get("/analytics", response_model=AnalyticsResponse)
async def analytics():
    """Return aggregated analytics from all inference history."""
    return get_analytics()

@router.post("/predict/fusion", response_model=PredictionResponse)
async def predict_fusion(
    text: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None)
):
    """
    Combines up to three modalities and returns a weighted prediction.
    """
    predictions = {}
    
    if text:
        predictions["text"] = predict_text_emotion(text)
        
    if audio:
        audio_bytes = await audio.read()
        predictions["audio"] = predict_audio_emotion(audio_bytes)
        
    if image:
        image_bytes = await image.read()
        predictions["image"] = predict_image_emotion(image_bytes)
    
    if not predictions:
        return {"error": "No valid input provided"}

    fused_result = aggregate_predictions(predictions)
    if "error" not in fused_result:
        log_inference("fusion", fused_result.get("emotion", "Unknown"), float(fused_result.get("confidence", 0)))
    return to_python_types(fused_result)

