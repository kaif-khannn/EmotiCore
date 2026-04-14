import os
import io
import logging

logger = logging.getLogger("emoticore.image")

_CUSTOM_MODEL = None
_CUSTOM_MODE_CHECKED = False
_IMAGE_LOAD_ERROR = None
_EMOTIONS = ["happy", "sad", "angry", "fear", "neutral", "surprise", "disgust"]
_FACE_CASCADE = None

def _load_custom_image_model():
    global _CUSTOM_MODEL, _CUSTOM_MODE_CHECKED, _FACE_CASCADE, _IMAGE_LOAD_ERROR
    if not _CUSTOM_MODE_CHECKED:
        local_path = os.path.join(os.path.dirname(__file__), "assets", "image_model.keras")
        try:
            if os.path.exists(local_path):
                import cv2
                # Attempt to load with standard keras (v3) or tf_keras (v2)
                try:
                    from tensorflow import keras
                    _CUSTOM_MODEL = keras.models.load_model(local_path)
                except Exception:
                    try:
                        import tf_keras
                        _CUSTOM_MODEL = tf_keras.models.load_model(local_path)
                    except Exception as e2:
                        raise e2
                
                _FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
                logger.info(f"Custom local image model (.keras) loaded successfully from {local_path}")
                _IMAGE_LOAD_ERROR = None
            else:
                # This is a non-fatal warning since DeepFace fallback exists
                logger.warning(f"Image model weights not found at {local_path}. Using DeepFace fallback.")
        except Exception as e:
            # We don't set _IMAGE_LOAD_ERROR if we want to avoid the frontend alert,
            # but we should still log it.
            logger.warning(f"Local .keras model load failed ({e}). System will use DeepFace fallback.")
            _IMAGE_LOAD_ERROR = f"Loading optimization failed: {str(e)[:50]}... (Using DeepFace Fallback)"
        _CUSTOM_MODE_CHECKED = True

def get_status() -> dict:
    global _CUSTOM_MODEL, _IMAGE_LOAD_ERROR
    return {
        "active": True, # Always active because DeepFace is a built-in fallback
        "type": "Neural Architecture (MobileNetV2)" if _CUSTOM_MODEL is not None else "DeepFace Standard",
        "details": "96x96 Optimization" if _CUSTOM_MODEL is not None else "Standard Inference",
        "warning": _IMAGE_LOAD_ERROR
    }

def predict_image_emotion(image_bytes: bytes) -> dict:
    import numpy as np
    import cv2
    
    try:
        # Decode the bytes directly to a numpy array (cv2 image)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"error": "Could not decode image", "modality": "image", "emotion": "Unknown", "confidence": 0}

        _load_custom_image_model()
        
        if _CUSTOM_MODEL is not None:
            import tensorflow as tf
            faces_output = []
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            raw_faces = _FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
            
            for (x, y, w, h) in raw_faces:
                # Filter out full-image false positives
                if w >= img.shape[1] - 5 and h >= img.shape[0] - 5:
                    continue
                
                face_crop = img[y:y+h, x:x+w]
                face_crop = cv2.resize(face_crop, (96, 96))
                face_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
                
                face_input = tf.keras.applications.mobilenet_v2.preprocess_input(face_crop.astype(np.float32))
                face_input = np.expand_dims(face_input, axis=0)
                
                preds = _CUSTOM_MODEL.predict(face_input, verbose=0)[0]
                breakdown = {emo.capitalize(): float(prob) for emo, prob in zip(_EMOTIONS, preds)}
                winner = max(breakdown, key=breakdown.get)
                
                faces_output.append({
                    "emotion": winner,
                    "confidence": round(breakdown[winner], 3),
                    "breakdown": breakdown,
                    "region": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}
                })
            
            if not faces_output:
                return {"modality": "image", "faces": [], "emotion": "Unknown", "confidence": 0, "breakdown": {}}
                
            return {
                "modality": "image",
                "faces": faces_output,
                "emotion": faces_output[0]["emotion"],
                "confidence": faces_output[0]["confidence"],
                "breakdown": faces_output[0]["breakdown"]
            }
        else:
            from deepface import DeepFace
            # Use OpenCV explicitly as detector backend
            raw_results = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False, detector_backend='opencv')
            if not isinstance(raw_results, list):
                raw_results = [raw_results]
                
            faces_output = []
            for face_res in raw_results:
                region = face_res.get('region', {'x': 0, 'y': 0, 'w': 0, 'h': 0})
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
                    "region": {"x": int(region.get('x',0)), "y": int(region.get('y',0)), "w": int(region.get('w',0)), "h": int(region.get('h',0))}
                })

            return {
                "modality": "image",
                "faces": faces_output,
                "emotion": faces_output[0]["emotion"] if faces_output else "Unknown",
                "confidence": faces_output[0]["confidence"] if faces_output else 0,
                "breakdown": faces_output[0]["breakdown"] if faces_output else {}
            }
    except Exception as e:
        logger.error(f"Image prediction failed: {e}")
        return {"error": str(e), "modality": "image", "emotion": "Unknown", "confidence": 0}
