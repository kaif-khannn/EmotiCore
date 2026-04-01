"""
In-memory analytics store for tracking all emotion inferences.
Logs every prediction and computes aggregated stats for the dashboard.
"""
from datetime import datetime, timedelta
from collections import defaultdict
import threading

_lock = threading.Lock()

# Core storage — list of inference records
_history = []


def log_inference(modality: str, emotion: str, confidence: float):
    """Log a single inference result."""
    with _lock:
        _history.append({
            "modality": modality,
            "emotion": emotion,
            "confidence": confidence,
            "timestamp": datetime.now().isoformat()
        })


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
        avg_conf = sum(r["confidence"] for r in _history) / total

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
