import io
import tempfile
import os
import numpy as np

# List of expected output classes:
# 'Happy', 'Sad', 'Angry', 'Neutral', 'Fear', 'Surprise', 'Disgust'

def predict_audio_emotion(audio_bytes: bytes) -> dict:
    """
    Takes audio bytes and predicts the emotion using MFCC feature extraction
    and a heuristic energy-based classifier.
    """
    try:
        import librosa
        from pydub import AudioSegment

        # Browser MediaRecorder sends webm/ogg. Convert to WAV first using pydub.
        audio_data = None
        sr = None
        
        try:
            # Try loading directly (works for WAV files)
            audio_data, sr = librosa.load(io.BytesIO(audio_bytes), sr=16000)
        except Exception:
            try:
                # Convert webm/ogg to WAV via pydub
                audio_segment = AudioSegment.from_file(io.BytesIO(audio_bytes))
                wav_buffer = io.BytesIO()
                audio_segment.export(wav_buffer, format='wav')
                wav_buffer.seek(0)
                audio_data, sr = librosa.load(wav_buffer, sr=16000)
            except Exception:
                # Last resort: write to temp file
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.webm')
                try:
                    tmp.write(audio_bytes)
                    tmp.close()
                    audio_data, sr = librosa.load(tmp.name, sr=16000)
                finally:
                    os.unlink(tmp.name)

        if audio_data is None or len(audio_data) == 0:
            return {"error": "Empty or unreadable audio", "modality": "audio", "emotion": "Unknown", "confidence": 0}

        # === REAL FEATURE EXTRACTION ===
        # Extract MFCCs (mel-frequency cepstral coefficients)
        mfccs = librosa.feature.mfcc(y=audio_data, sr=sr, n_mfcc=13)
        mfcc_mean = np.mean(mfccs, axis=1)
        
        # Extract additional features
        rms_energy = float(np.mean(librosa.feature.rms(y=audio_data)))
        zcr = float(np.mean(librosa.feature.zero_crossing_rate(audio_data)))
        spectral_centroid = float(np.mean(librosa.feature.spectral_centroid(y=audio_data, sr=sr)))
        spectral_bandwidth = float(np.mean(librosa.feature.spectral_bandwidth(y=audio_data, sr=sr)))
        
        # === HEURISTIC EMOTION CLASSIFIER ===
        # Map acoustic features to emotion probabilities using acoustic science:
        # - High energy + high spectral centroid = Angry/Happy
        # - Low energy + low centroid = Sad
        # - High ZCR + high bandwidth = Fear/Surprise
        # - Moderate everything = Neutral
        
        energy_norm = min(rms_energy / 0.1, 1.0)  # Normalize to 0-1
        zcr_norm = min(zcr / 0.15, 1.0)
        centroid_norm = min(spectral_centroid / 4000, 1.0)
        bandwidth_norm = min(spectral_bandwidth / 3000, 1.0)
        
        # Compute raw scores for each emotion
        scores = {
            "Happy": 0.1 + energy_norm * 0.4 + centroid_norm * 0.3 + (1 - zcr_norm) * 0.1,
            "Sad": 0.1 + (1 - energy_norm) * 0.5 + (1 - centroid_norm) * 0.3,
            "Angry": 0.05 + energy_norm * 0.5 + zcr_norm * 0.3 + bandwidth_norm * 0.2,
            "Neutral": 0.15 + (1 - abs(energy_norm - 0.5)) * 0.4 + (1 - abs(centroid_norm - 0.5)) * 0.3,
            "Fear": 0.05 + zcr_norm * 0.4 + bandwidth_norm * 0.3 + (1 - energy_norm) * 0.2,
            "Surprise": 0.05 + bandwidth_norm * 0.4 + centroid_norm * 0.3 + zcr_norm * 0.2,
            "Disgust": 0.05 + energy_norm * 0.2 + (1 - centroid_norm) * 0.3 + zcr_norm * 0.1
        }
        
        # Normalize to probability distribution
        total = sum(scores.values())
        probabilities = {k: round(v / total, 3) for k, v in scores.items()}
        
        winner = max(probabilities, key=probabilities.get)
        confidence = probabilities[winner]

        return {
            "modality": "audio",
            "emotion": winner,
            "confidence": round(confidence, 3),
            "breakdown": probabilities
        }
    except Exception as e:
        return {"error": str(e), "modality": "audio", "emotion": "Unknown", "confidence": 0}
