from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from utils.feedback_db import save_feedback

router = APIRouter()

class FeedbackRequest(BaseModel):
    modality: str
    predicted: str
    corrected: str
    input_path: Optional[str] = None
    raw_input: Optional[str] = None

@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    try:
        save_feedback(
            modality=request.modality,
            predicted=request.predicted,
            corrected=request.corrected,
            input_path=request.input_path,
            raw_input=request.raw_input
        )
        return {"status": "success", "message": "Feedback recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
