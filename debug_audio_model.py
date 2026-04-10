import os
import sys
import numpy as np
import joblib
import librosa
import pandas as pd

# Standard paths
REPO_ROOT = "d:/miniproject"
MODEL_DIR = os.path.join(REPO_ROOT, "backend/models/assets")
CSV_PATH = os.path.join(REPO_ROOT, "datasets/processed/audio/audio_dataset.csv")
FEAT_DIR = os.path.join(REPO_ROOT, "datasets/processed/audio/features")

def main():
    # 1. Load assets
    model = joblib.load(os.path.join(MODEL_DIR, "audio_model.joblib"))
    labels = joblib.load(os.path.join(MODEL_DIR, "audio_labels.joblib"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "audio_scaler.joblib"))
    
    print(f"Model Labels: {list(labels)}")
    
    # 2. Check on actual features from dataset
    df = pd.read_csv(CSV_PATH).sample(10)
    print("\nTesting on 10 random samples from dataset:")
    for _, row in df.iterrows():
        feat = np.load(os.path.join(FEAT_DIR, row["feature_file"]))
        if feat.shape[0] == 120: feat = feat[0:40]
        
        # stats
        m = np.mean(feat, axis=1)
        s = np.std(feat, axis=1)
        d = np.mean(librosa.feature.delta(feat), axis=1)
        d2 = np.mean(librosa.feature.delta(feat, order=2), axis=1)
        
        X = np.hstack([m, s, d, d2]).reshape(1, -1)
        X_scaled = scaler.transform(X)
        
        probs = model.predict_proba(X_scaled)[0]
        winner = labels[np.argmax(probs)]
        print(f"  File: {row['feature_file']} | GT: {row['label']} | Pred: {winner} ({np.max(probs):.2%})")

    # 3. Check on Silence
    print("\nTesting on Silence (40 MFCCs all zeros):")
    X_silence = np.zeros((1, 160))
    X_silence_scaled = scaler.transform(X_silence)
    probs_silence = model.predict_proba(X_silence_scaled)[0]
    winner_silence = labels[np.argmax(probs_silence)]
    print(f"  Pred: {winner_silence} | Breakdown: {dict(zip(labels, probs_silence))}")

if __name__ == "__main__":
    main()
