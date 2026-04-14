import os
import joblib
# from transformers import pipeline # Moved inside get_classifier for lazy loading
import logging

logger = logging.getLogger("emoticore.text")

# Global variables for caching model
_classifier = None
_model_format = None

def get_classifier():
    global _classifier, _model_format
    if _classifier is None:
        local_model_path = os.path.join(os.path.dirname(__file__), "assets", "text_model.joblib")
        if os.path.exists(local_model_path):
            try:
                _classifier = joblib.load(local_model_path)
                _model_format = "local"
                logger.info("Custom local text model loaded successfully.")
                return _classifier, _model_format
            except Exception as e:
                logger.warning(f"Found local text model but failed to load ({e}). Falling back.")

        try:
            # Use a lighter DistilBERT model instead of RoBERTa for limited RAM environments like Render Free Tier
            logger.info("Loading Lightweight text model (distilbert)...")
            from transformers import pipeline
            _classifier = pipeline(
                "text-classification", 
                model="bhadresh-savani/distilbert-base-uncased-emotion", 
                top_k=None,
                low_cpu_mem_usage=True
            )
            _model_format = "huggingface"
            logger.info("Lightweight text model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load text model: {e}")
            _classifier = None
            _model_format = None
            
    return _classifier, _model_format

EMOTION_MAP = {
    "anger": "Angry",
    "disgust": "Disgust",
    "fear": "Fear",
    "joy": "Happy",
    "neutral": "Neutral",
    "sadness": "Sad",
    "surprise": "Surprise"
}

def predict_text_emotion(text: str) -> dict:
    if not text.strip():
         return {"error": "Empty text provided", "modality": "text", "emotion": "Unknown", "confidence": 0}
         
    classifier, fmt = get_classifier()
    if classifier is None:
        return {"error": "Model not loaded", "modality": "text", "emotion": "Unknown", "confidence": 0}
        
    try:
        breakdown = {}
        if fmt == "local":
            clf = classifier["pipeline"]
            classes = classifier["classes"]
            probs = clf.predict_proba([text])[0]
            for cls_name, prob in zip(classes, probs):
                clean_label = EMOTION_MAP.get(cls_name, str(cls_name).capitalize())
                breakdown[clean_label] = float(prob)
        else:
            raw_results = classifier(text)
            if isinstance(raw_results, list) and len(raw_results) > 0:
                results = raw_results[0] if isinstance(raw_results[0], list) else raw_results
            else:
                results = [raw_results]
            
            for res in results:
                if isinstance(res, dict) and 'label' in res:
                    clean_label = EMOTION_MAP.get(res['label'], res['label'].capitalize())
                    breakdown[clean_label] = res['score']
            
        if not breakdown:
           raise ValueError("No valid emotions found in output")
           
        winner = max(breakdown.items(), key=lambda x: x[1])[0]
        confidence = breakdown[winner]
        
        return {
            "modality": "text",
            "emotion": winner,
            "confidence": round(confidence, 3),
            "breakdown": breakdown
        }
    except Exception as e:
        return {"error": str(e), "modality": "text", "emotion": "Unknown", "confidence": 0}
