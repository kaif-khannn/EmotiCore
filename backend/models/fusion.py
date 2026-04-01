# fusion.py

def aggregate_predictions(predictions: dict) -> dict:
    """
    Takes a dict of predictions from different modalities, e.g.:
    {
      "text": {"emotion": "Happy", "confidence": 0.9, "breakdown": {...}},
      "audio": {...},
      "image": {...}
    }
    
    Returns a unified result using weighted averaging.
    """
    
    # Weights for each modality (can be tuned based on model accuracy)
    WEIGHTS = {
        "text": 0.35,
        "audio": 0.35,
        "image": 0.30
    }
    
    all_emotions = ["Happy", "Sad", "Angry", "Neutral", "Fear", "Surprise", "Disgust"]
    combined_scores = {e: 0.0 for e in all_emotions}
    
    total_weight = 0.0
    
    for mod, mod_result in predictions.items():
        if "error" in mod_result or "breakdown" not in mod_result:
            continue
            
        weight = WEIGHTS.get(mod, 0.0)
        breakdown = mod_result["breakdown"]
        
        for emotion in all_emotions:
            combined_scores[emotion] += breakdown.get(emotion, 0.0) * weight
            
        total_weight += weight
        
    if total_weight == 0:
        return {
            "emotion": "Unknown",
            "confidence": 0,
            "breakdown": combined_scores,
            "individual_predictions": predictions
        }
        
    # Normalize by total active weight
    for emotion in all_emotions:
        combined_scores[emotion] = round(combined_scores[emotion] / total_weight, 3)
        
    winner = max(combined_scores, key=combined_scores.get)
    final_confidence = combined_scores[winner]
    
    return {
        "emotion": winner,
        "confidence": final_confidence,
        "breakdown": combined_scores,
        "individual_predictions": predictions
    }
