import numpy as np
import cv2
from deepface import DeepFace
import io

def predict_image_emotion(image_bytes: bytes) -> dict:
    """
    Takes image bytes, decodes using OpenCV, and detects emotion using DeepFace.
    """
    try:
        # Decode the bytes directly to a numpy array (cv2 image)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"error": "Could not decode image", "modality": "image", "emotion": "Unknown", "confidence": 0}

        raw_results = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False, detector_backend='opencv')
        
        # DeepFace returned dict or list; normalize to list for multiple face tracking
        if not isinstance(raw_results, list):
            raw_results = [raw_results]
            
        faces_output = []
        for face_res in raw_results:
            region = face_res.get('region', {'x': 0, 'y': 0, 'w': 0, 'h': 0})
            
            # DeepFace explicitly returns the entire original frame as a "Face" if detection fails
            # We must aggressively filter out 100% full-frame boxes to prevent ghost-tracking
            if region.get('w') >= img.shape[1] - 5 and region.get('h') >= img.shape[0] - 5:
                continue

            raw_emotions = face_res.get('emotion', {})
            breakdown = {key.capitalize(): val / 100.0 for key, val in raw_emotions.items()}
            winner = face_res.get('dominant_emotion', 'neutral').capitalize()
            confidence = breakdown.get(winner, 0.0)
            
            faces_output.append({
                "emotion": winner,
                "confidence": round(confidence, 3),
                "breakdown": breakdown,
                "region": region
            })

        return {
            "modality": "image",
            "faces": faces_output,
            "emotion": faces_output[0]["emotion"] if faces_output else "Unknown",
            "confidence": faces_output[0]["confidence"] if faces_output else 0,
            "breakdown": faces_output[0]["breakdown"] if faces_output else {}
        }
    except Exception as e:
        return {"error": str(e), "modality": "image", "emotion": "Unknown", "confidence": 0}
