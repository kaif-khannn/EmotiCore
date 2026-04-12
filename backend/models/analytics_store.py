import json
import os
from datetime import datetime, timedelta
from collections import defaultdict
import threading

import logging
logger = logging.getLogger("emoticore.analytics")

_lock = threading.Lock()
_DB_PATH = os.path.join(os.path.dirname(__file__), "analytics_history.json")

# Core storage — list of inference records
_history = []

def _load_history():
    global _history
    if os.path.exists(_DB_PATH):
        try:
            with open(_DB_PATH, "r") as f:
                raw_data = json.load(f)
                # Ensure confidence is float and other types are correct
                _history = []
                for entry in raw_data:
                    _history.append({
                        "modality": str(entry.get("modality", "unknown")),
                        "emotion": str(entry.get("emotion", "Unknown")),
                        "confidence": float(entry.get("confidence", 0.0)),
                        "timestamp": str(entry.get("timestamp", datetime.now().isoformat()))
                    })
        except Exception as e:
            logger.error(f"Failed to load analytics history: {e}")
            _history = []

def _save_history():
    try:
        with open(_DB_PATH, "w") as f:
            json.dump(_history, f)
    except Exception as e:
        logger.error(f"Failed to save analytics history: {e}")

# Initial load
_load_history()


def log_inference(modality: str, emotion: str, confidence: float):
    """Log a single inference result and persist to JSON."""
    with _lock:
        _history.append({
            "modality": modality,
            "emotion": emotion,
            "confidence": confidence,
            "timestamp": datetime.now().isoformat()
        })
        _save_history()


def get_analytics():
    """Return computed analytics from real inference history."""
    with _lock:
        total = len(_history)
        if total == 0:
            return {
                "total_inferences": 0,
                "avg_confidence": 0,
                "emotion_timeseries": [],
                "activity_by_day": [],
                "confidence_history": [],
                "inference_history": []
            }

        # Average confidence
        avg_conf = sum(float(r["confidence"]) for r in _history) / total

        # Emotion counts bucketed by date for time-series chart
        emotion_by_date = defaultdict(lambda: defaultdict(int))
        activity_by_weekday = defaultdict(int)
        confidence_over_time = []

        for rec in _history:
            ts = datetime.fromisoformat(rec["timestamp"])
            day_label = ts.strftime("%d %b")
            emotion_by_date[day_label][rec["emotion"]] += 1
            
            weekday_label = ts.strftime("%a")  # Mon, Tue, etc.
            activity_by_weekday[weekday_label] += 1

            confidence_over_time.append({
                "val": round(rec["confidence"] * 100, 1)
            })

        # Build time-series array (each entry = one day with emotion counts)
        timeseries = []
        for day, emotions in emotion_by_date.items():
            entry = {"day": day}
            entry.update(emotions)
            timeseries.append(entry)

        # Build activity array ordered by weekday
        weekday_order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        activity = [{"day": wd, "v": activity_by_weekday.get(wd, 0)} for wd in weekday_order]

        # Last 10 confidence values for sparkline
        recent_conf = confidence_over_time[-10:] if len(confidence_over_time) >= 10 else confidence_over_time

        # Last 10 total-inference sparkline (cumulative count snapshots)
        inference_spark = []
        for i, rec in enumerate(_history[-10:], 1):
            inference_spark.append({"val": total - len(_history[-10:]) + i})

        return {
            "total_inferences": total,
            "avg_confidence": round(avg_conf * 100, 1),
            "emotion_timeseries": timeseries,
            "activity_by_day": activity,
            "confidence_history": recent_conf,
            "inference_history": inference_spark
        }
