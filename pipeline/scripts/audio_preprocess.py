"""
pipeline/audio/preprocess_ravdess.py
--------------------------------------
Preprocess the RAVDESS (Ryerson Audio-Visual Database of Emotional Speech) dataset.

Expected raw layout:
  datasets/raw/audio/ravdess/
      Actor_01/
          03-01-01-01-01-01-01.wav
          ...
      Actor_02/
          ...
      (24 actor folders total)

Filename schema: Modality-VocalChannel-Emotion-Intensity-Statement-Repetition-Actor
  Emotion codes: 01=neutral 02=calm 03=happy 04=sad 05=angry 06=fearful 07=disgust 08=surprised

Outputs:
  datasets/processed/audio/ravdess_meta.csv
  datasets/processed/audio/features/ravdess_<idx>.npy   (MFCC arrays)
"""

import os
import sys
import glob
import numpy as np
import pandas as pd
try:
    import librosa
except ImportError:
    print("librosa not installed. Run: pip install librosa soundfile")
    sys.exit(1)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from pipeline.config import (
    DATASET_DIRS, PROC_AUDIO_DIR, PROC_AUDIO_FEAT,
    AUDIO_SAMPLE_RATE, AUDIO_N_MFCC, AUDIO_HOP_LENGTH,
    AUDIO_MAX_FRAMES, AUDIO_USE_DELTA
)
from pipeline.label_map import RAVDESS_CODE_MAP


def extract_mfcc(audio_path: str) -> np.ndarray | None:
    """Load audio and extract MFCC, Chroma, and Spectral features (146 rows)."""
    try:
        # Load at 22050Hz (default from config)
        y, sr = librosa.load(audio_path, sr=AUDIO_SAMPLE_RATE)
        
        # 1. Trim silence (Huge for CREMA-D)
        y, _ = librosa.effects.trim(y, top_db=30)
        
        if len(y) < 2048: # Too short to be meaningful
            return None

        # 2. Extract Basic MFCCs
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=AUDIO_N_MFCC,
                                     hop_length=AUDIO_HOP_LENGTH)
        
        # 3. Extract Additional Spectral Features
        # Chroma (12 bins)
        chroma = librosa.feature.chroma_stft(y=y, sr=sr, hop_length=AUDIO_HOP_LENGTH)
        
        # Spectral Centroid (1 bin)
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=AUDIO_HOP_LENGTH)
        
        # Spectral Contrast (7 bins)
        contrast = librosa.feature.spectral_contrast(y=y, sr=sr, hop_length=AUDIO_HOP_LENGTH)
        
        # 4. Deltas for MFCC (Adds temporal dynamics)
        if AUDIO_USE_DELTA:
            delta  = librosa.feature.delta(mfcc, order=1)
            delta2 = librosa.feature.delta(mfcc, order=2)
            mfcc_block = np.vstack([mfcc, delta, delta2]) # 120 rows
        else:
            mfcc_block = mfcc

        # Combine all features
        # Shape: (120 + 12 + 1 + 7, frames) = (140, frames)
        # Note: I'll stick to 140 for now as Tonnetz is slow.
        features = np.vstack([mfcc_block, chroma, centroid, contrast])

        # Pad or truncate to fixed frame length (300 frames)
        n_feat, n_frames = features.shape
        if n_frames < AUDIO_MAX_FRAMES:
            pad = np.zeros((n_feat, AUDIO_MAX_FRAMES - n_frames))
            features = np.hstack([features, pad])
        else:
            features = features[:, :AUDIO_MAX_FRAMES]

        # Per-feature normalization (zero-mean, unit-variance)
        mean = features.mean(axis=1, keepdims=True)
        std  = features.std(axis=1, keepdims=True) + 1e-9
        features = (features - mean) / std

        return features.astype(np.float32)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"    WARN: Failed to process {audio_path}: {e}")
        return None


def run():
    raw_dir = DATASET_DIRS["ravdess"]
    if not os.path.isdir(raw_dir):
        print(f"[ravdess] Raw data not found at: {raw_dir}")
        print("  Download: https://zenodo.org/record/1188976")
        return

    wav_files = glob.glob(os.path.join(raw_dir, "**", "*.wav"), recursive=True)
    print(f"[ravdess] Found {len(wav_files)} .wav files")

    rows = []
    for wav_path in sorted(wav_files):
        fname = os.path.splitext(os.path.basename(wav_path))[0]
        parts = fname.split("-")
        if len(parts) < 3:
            continue
        try:
            emotion_code = int(parts[2])
        except ValueError:
            continue

        canonical = RAVDESS_CODE_MAP.get(emotion_code)
        if canonical is None:
            continue   # disgust — discard

        feat_name = f"ravdess_{len(rows)}.npy"
        feat_path = os.path.join(PROC_AUDIO_FEAT, feat_name)

        # Skip if already exists
        if os.path.exists(feat_path):
            rows.append({
                "filename":     os.path.basename(wav_path),
                "feature_file": feat_name,
                "label":        canonical,
                "source":       "ravdess"
            })
            continue

        feat = extract_mfcc(wav_path)
        if feat is None:
            continue

        np.save(feat_path, feat)

    meta = pd.DataFrame(rows)
    out_path = os.path.join(PROC_AUDIO_DIR, "ravdess_meta.csv")
    meta.to_csv(out_path, index=False)
    print(f"[ravdess] Saved {len(meta)} samples -> {out_path}")
    print(meta["label"].value_counts().to_string())


if __name__ == "__main__":
    run()
