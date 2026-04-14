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

def get_fallback_emotion(text: str) -> dict:
    """A zero-dependency keyword-based fallback for emotion detection."""
    text = text.lower()
    scores = {"Happy": 0.0, "Sad": 0.0, "Angry": 0.0, "Fear": 0.0, "Surprise": 0.0, "Disgust": 0.0, "Neutral": 0.1}
    
    keywords = {
        "Happy": ["good", "great", "happy", "wonderful", "excellent", "joy", "love", "amazing"],
        "Sad": ["bad", "sad", "sorry", "unhappy", "cry", "depressed", "hurt", "lonely"],
        "Angry": ["angry", "mad", "hate", "fight", "annoyed", "furious", "kill", "stupid"],
        "Fear": ["scared", "afraid", "fear", "terror", "danger", "worry", "panic"],
        "Surprise": ["wow", "huge", "surprise", "unbelievable", "omg", "whoa"],
        "Disgust": ["gross", "eww", "disgust", "nasty", "revolt", "sick"]
    }
    
    for emotion, words in keywords.items():
        for word in words:
            if word in text:
                scores[emotion] += 1.0
                
    winner = max(scores, key=scores.get)
    # Normalize roughly
    total = sum(scores.values()) or 1.0
    breakdown = {k: round(v/total, 2) for k, v in scores.items()}
    
    return {
        "modality": "text",
        "emotion": winner,
        "confidence": 0.5 if winner != "Neutral" else 0.1,
        "breakdown": breakdown,
        "note": "Lightweight fallback mode active"
    }

def predict_text_emotion(text: str) -> dict:
    if not text.strip():
         return {"error": "Empty text provided", "modality": "text", "emotion": "Unknown", "confidence": 0}
         
    classifier, fmt = get_classifier()
    if classifier is None:
        # If all else fails, use the lightweight fallback instead of returning an error
        logger.warning("Neural models failed to load. Using keyword fallback.")
        return get_fallback_emotion(text)
        
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
        logger.error(f"Text prediction expansion failed: {e}. Falling back to keywords.")
        return get_fallback_emotion(text)
