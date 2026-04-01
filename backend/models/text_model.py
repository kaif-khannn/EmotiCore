from transformers import pipeline

# Load a lightweight, pre-trained model for emotion detection from text
# Typical classes for j-hartmann/emotion-english-distilroberta-base:
# anger, disgust, fear, joy, neutral, sadness, surprise

# Initialize pipeline lazily or globally
_classifier = None

def get_classifier():
    global _classifier
    if _classifier is None:
        try:
            # We use a robust small model
            _classifier = pipeline("text-classification", model="j-hartmann/emotion-english-distilroberta-base", return_all_scores=True)
        except Exception as e:
            print(f"Failed to load text model: {e}")
            _classifier = None
    return _classifier

# Standardize names to our fusion standard (Capitalized)
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
         
    classifier = get_classifier()
    if classifier is None:
        return {"error": "Model not loaded", "modality": "text", "emotion": "Unknown", "confidence": 0}
        
    try:
        # returns list of dicts e.g. [[{'label': 'anger', 'score': 0.1}, ...]]
        raw_results = classifier(text)
        
        if isinstance(raw_results, list) and len(raw_results) > 0:
            if isinstance(raw_results[0], list):
                results = raw_results[0]
            else:
                results = raw_results
        else:
            results = [raw_results]
        
        breakdown = {}
        for res in results:
            if isinstance(res, dict) and 'label' in res:
                clean_label = EMOTION_MAP.get(res['label'], res['label'].capitalize())
                breakdown[clean_label] = res['score']
            
        # Find winner
        if not breakdown:
           raise ValueError(f"No valid emotions found in output: {raw_results}")
           
        # Pyre-friendly max search
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
