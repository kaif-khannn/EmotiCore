from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any

class EmotionBreakdown(BaseModel):
    Happy: float = 0
    Sad: float = 0
    Angry: float = 0
    Fear: float = 0
    Neutral: float = 0
    Surprise: float = 0
    Disgust: float = 0

class PredictionResponse(BaseModel):
    modality: str
    emotion: str
    confidence: float
    breakdown: Dict[str, float]
    region: Optional[Dict[str, int]] = None
    faces: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None

class HealthCheckResponse(BaseModel):
    audio: Dict[str, Any]
    image: Dict[str, Any]
    system: str = "Operational"

class AnalyticsResponse(BaseModel):
    total_inferences: int
    avg_confidence: float
    emotion_timeseries: List[Dict[str, Any]]
    activity_by_day: List[Dict[str, Any]]
    confidence_history: List[Dict[str, float]]
    inference_history: List[Dict[str, int]]
