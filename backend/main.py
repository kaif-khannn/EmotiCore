from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import sys

# In python < 3.10 we don't have to worry about this much, but it's good practice
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from routes.api import router as api_router

app = FastAPI(
    title="Multi-Modal Emotion Detection API",
    description="API for detecting emotions from Text, Speech, and Facial Expressions",
    version="1.0.0"
)

# Configure CORS for the frontend React application
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, restrict this to frontend URL e.g. ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Multi-Modal Emotion Detection API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
