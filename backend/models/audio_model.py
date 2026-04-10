import io
import tempfile
import os
import numpy as np
import joblib
import librosa
from pydub import AudioSegment
import static_ffmpeg

# Paths to model assets
MODEL_DIR = os.path.join(os.path.dirname(__file__), "assets")
MODEL_PATH = os.path.join(MODEL_DIR, "audio_model.joblib")
LABELS_PATH = os.path.join(MODEL_DIR, "audio_labels.joblib")
SCALER_PATH = os.path.join(MODEL_DIR, "audio_scaler.joblib")

# Global variables for caching model
_AUDIO_MODEL = None
_AUDIO_LABELS = None
_AUDIO_SCALER = None

def _load_model():
    global _AUDIO_MODEL, _AUDIO_LABELS, _AUDIO_SCALER
    if _AUDIO_MODEL is None:
        if os.path.exists(MODEL_PATH):
            _AUDIO_MODEL = joblib.load(MODEL_PATH)
            _AUDIO_LABELS = joblib.load(LABELS_PATH)
            _AUDIO_SCALER = joblib.load(SCALER_PATH)
            print(f"INFO: Audio ML model loaded successfully from {MODEL_PATH}")
        else:
            print(f"WARNING: Audio model weights not found at {MODEL_PATH}. Falling back to heuristic.")

def get_status() -> dict:
    global _AUDIO_MODEL
    _load_model()
    return {
        "active": _AUDIO_MODEL is not None,
        "type": "Custom SVM Ensemble" if _AUDIO_MODEL is not None else "Heuristic Fallback",
        "size": "122MB" if _AUDIO_MODEL is not None else "N/A"
    }

def predict_audio_emotion(audio_bytes: bytes) -> dict:
    """
    Predicts emotion from audio bytes using a trained Gradient Boosting model on spectral features.
    """
    try:
        # Load model if not already loaded
        _load_model()
        
        # Ensure static-ffmpeg is in PATH
        static_ffmpeg.add_paths()

        # Load audio data at 22050Hz (Must match training!)
        audio_data = None
        sr = 22050
        
        try:
            audio_data, _ = librosa.load(io.BytesIO(audio_bytes), sr=sr)
        except Exception:
            try:
                audio_segment = AudioSegment.from_file(io.BytesIO(audio_bytes))
                wav_buffer = io.BytesIO()
                audio_segment.export(wav_buffer, format='wav')
                wav_buffer.seek(0)
                audio_data, _ = librosa.load(wav_buffer, sr=sr)
            except Exception:
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.webm')
                try:
                    tmp.write(audio_bytes)
                    tmp.close()
                    audio_data, _ = librosa.load(tmp.name, sr=sr)
                finally:
                    os.unlink(tmp.name)

        if audio_data is None or len(audio_data) == 0:
            return {"error": "Empty or unreadable audio", "modality": "audio", "emotion": "Unknown", "confidence": 0}

        # 1. Pre-processing: Trim Silence
        audio_data, _ = librosa.effects.trim(audio_data, top_db=30)
        
        # 2. Energy Check (Silence Guard)
        rms_val = np.mean(librosa.feature.rms(y=audio_data))
        if rms_val < 0.002:
            return {
                "modality": "audio",
                "emotion": "Neutral",
                "confidence": 1.0,
                "breakdown": {label.capitalize(): (1.0 if label == "neutral" else 0.0) for label in _AUDIO_LABELS}
            }

        # 3. Feature Extraction (Must EXACTLY match train_audio.py — 215 dims)
        # Pad to 4 seconds
        target_len = sr * 4
        if len(audio_data) < target_len:
            audio_data = np.pad(audio_data, (0, target_len - len(audio_data)))

        # MFCCs (40 → mean+std = 80 dims)
        mfcc = librosa.feature.mfcc(y=audio_data, sr=sr, n_mfcc=40)
        mfcc_mean = np.mean(mfcc, axis=1)
        mfcc_std  = np.std(mfcc, axis=1)

        # MFCC Deltas (40 → 80 dims)
        delta  = librosa.feature.delta(mfcc)
        d_mean = np.mean(delta, axis=1)
        d_std  = np.std(delta, axis=1)

        # Zero Crossing Rate (2 dims)
        zcr = librosa.feature.zero_crossing_rate(audio_data)
        zcr_mean = np.mean(zcr)
        zcr_std  = np.std(zcr)

        # RMS Energy (2 dims — critical for anger vs calm)
        rms = librosa.feature.rms(y=audio_data)
        rms_mean = np.mean(rms)
        rms_std  = np.std(rms)

        # Chroma (12 → 24 dims)
        chroma = librosa.feature.chroma_stft(y=audio_data, sr=sr)
        chroma_mean = np.mean(chroma, axis=1)
        chroma_std  = np.std(chroma, axis=1)

        # Spectral Contrast (7 → 14 dims — key for sadness/disgust)
        contrast = librosa.feature.spectral_contrast(y=audio_data, sr=sr)
        contrast_mean = np.mean(contrast, axis=1)
        contrast_std  = np.std(contrast, axis=1)

        # Mel Spectrogram top bands (5 → 10 dims)
        mel = librosa.feature.melspectrogram(y=audio_data, sr=sr, n_mels=64, fmax=8000)
        mel_db = librosa.power_to_db(mel, ref=np.max)
        mel_mean = np.mean(mel_db, axis=1)[:5]
        mel_std  = np.std(mel_db, axis=1)[:5]

        # Pitch / F0 stats (3 dims) - DISABLED pyin for speed
        pitch_mean, pitch_std, voiced_ratio = 0.0, 0.0, 0.0

        features = np.hstack([
            mfcc_mean, mfcc_std,           # 80
            d_mean, d_std,                 # 80
            zcr_mean, zcr_std,             # 2
            rms_mean, rms_std,             # 2
            chroma_mean, chroma_std,       # 24
            contrast_mean, contrast_std,   # 14
            mel_mean, mel_std,             # 10
            pitch_mean, pitch_std, voiced_ratio  # 3
        ]).reshape(1, -1)  # 215 total

        # 4. Inference
        if _AUDIO_MODEL:
            features_scaled = _AUDIO_SCALER.transform(features)
            probs   = _AUDIO_MODEL.predict_proba(features_scaled)[0]
            breakdown = {label.capitalize(): float(prob) for label, prob in zip(_AUDIO_LABELS, probs)}
            winner = max(breakdown, key=breakdown.get)
            confidence = breakdown[winner]
            return {
                "modality": "audio",
                "emotion": winner,
                "confidence": round(confidence, 3),
                "breakdown": breakdown
            }
        else:
            return {"error": "Model not loaded", "modality": "audio", "emotion": "Unknown", "confidence": 0}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e), "modality": "audio", "emotion": "Unknown", "confidence": 0}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e), "modality": "audio", "emotion": "Unknown", "confidence": 0}
