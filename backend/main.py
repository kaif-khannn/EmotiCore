from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import sys

# In python < 3.10 we don't have to worry about this much, but it's good practice
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from routes.api import router as api_router
from utils.serialization import to_python_types
from fastapi.responses import JSONResponse

class NumPyJSONResponse(JSONResponse):
    def render(self, content: any) -> bytes:
        return super().render(to_python_types(content))

app = FastAPI(
    title="Multi-Modal Emotion Detection API",
    description="API for detecting emotions from Text, Speech, and Facial Expressions",
    version="1.0.0",
    default_response_class=NumPyJSONResponse
)

# Configure CORS for the frontend React application
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/api/direct-check")
def direct_check():
    return {"status": "ok"}

@app.get("/")
def read_root():
    return {"message": "Welcome to the Multi-Modal Emotion Detection API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)

