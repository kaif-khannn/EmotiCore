import os
import sys
import numpy as np
import librosa

SR = 22050

def extract_features(audio_path: str):
    try:
        y, sr = librosa.load(audio_path, sr=SR, duration=4.0)
        y, _ = librosa.effects.trim(y, top_db=30)
        target_len = SR * 4
        if len(y) < target_len:
            y = np.pad(y, (0, target_len - len(y)))
        
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
        mfcc_mean = np.mean(mfcc, axis=1)
        mfcc_std  = np.std(mfcc, axis=1)
        
        delta   = librosa.feature.delta(mfcc)
        d_mean  = np.mean(delta, axis=1)
        d_std   = np.std(delta, axis=1)
        
        zcr = librosa.feature.zero_crossing_rate(y)
        zcr_mean = np.mean(zcr)
        zcr_std  = np.std(zcr)
        
        rms = librosa.feature.rms(y=y)
        rms_mean = np.mean(rms)
        rms_std  = np.std(rms)
        
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)
        chroma_mean = np.mean(chroma, axis=1)
        chroma_std  = np.std(chroma, axis=1)
        
        contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
        contrast_mean = np.mean(contrast, axis=1)
        contrast_std  = np.std(contrast, axis=1)
        
        mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=64, fmax=8000)
        mel_db = librosa.power_to_db(mel, ref=np.max)
        mel_mean = np.mean(mel_db, axis=1)[:5]
        mel_std  = np.std(mel_db, axis=1)[:5]
        
        # SKIP PITCH FOR SPEED IN DEBUG
        feature_vector = np.hstack([
            mfcc_mean, mfcc_std,
            d_mean, d_std,
            zcr_mean, zcr_std,
            rms_mean, rms_std,
            chroma_mean, chroma_std,
            contrast_mean, contrast_std,
            mel_mean, mel_std
        ])
        return feature_vector
    except Exception as e:
        print(f"Error: {e}")
        return None

# Find a wav file
import glob
wavs = glob.glob(r"datasets\raw\audio\**\*.wav", recursive=True)

if wavs:
    f = extract_features(wavs[0])
    if f is not None:
        print(f"Feature dim (without pitch): {f.shape[0]}")
        print(f"Full dim (with pitch): {f.shape[0] + 3}")
else:
    print("No wav files found.")
