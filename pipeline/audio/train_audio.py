"""
train_audio.py - High-accuracy audio emotion classifier.

STRATEGY: Extract features DIRECTLY from raw WAV files, bypassing the
pre-normalized .npy files. This preserves absolute energy, pitch, and 
timbre differences between emotions that are critical for classification.

Uses a tuned SVM + HistGradientBoosting ensemble with SMOTE-inspired
oversampling to maximize accuracy on all 7 emotion classes.
"""
import os
import sys
import glob
import numpy as np
import pandas as pd
import librosa
from sklearn.svm import SVC
from sklearn.ensemble import HistGradientBoostingClassifier, VotingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.utils import resample
import joblib

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from pipeline.config import RANDOM_SEED, REPO_ROOT, DATASET_DIRS
from pipeline.label_map import RAVDESS_CODE_MAP

SR = 22050  # sample rate

def extract_features(audio_path: str) -> np.ndarray | None:
    """
    Extract rich, un-normalized features from a WAV file.
    Returns a 1D feature vector of 193 dims preserving absolute magnitudes.
    """
    try:
        y, sr = librosa.load(audio_path, sr=SR, duration=4.0)
        y, _ = librosa.effects.trim(y, top_db=30)
        if len(y) < 1024:
            return None

        # Pad to 4 seconds if shorter
        target_len = SR * 4
        if len(y) < target_len:
            y = np.pad(y, (0, target_len - len(y)))

        # ─ Features ──────────────────────────────────────────────────────────
        # 1. MFCCs (40 coefficients → mean+std = 80 dims) 
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
        mfcc_mean = np.mean(mfcc, axis=1)
        mfcc_std  = np.std(mfcc, axis=1)

        # 2. MFCC Deltas (40 → 80 dims)
        delta   = librosa.feature.delta(mfcc)
        d_mean  = np.mean(delta, axis=1)
        d_std   = np.std(delta, axis=1)

        # 3. Zero Crossing Rate (1 → 2 dims)
        zcr = librosa.feature.zero_crossing_rate(y)
        zcr_mean = np.mean(zcr)
        zcr_std  = np.std(zcr)

        # 4. RMS Energy (critical for anger vs calm — 2 dims)
        rms = librosa.feature.rms(y=y)
        rms_mean = np.mean(rms)
        rms_std  = np.std(rms)

        # 5. Chroma (12 → 24 dims)
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)
        chroma_mean = np.mean(chroma, axis=1)
        chroma_std  = np.std(chroma, axis=1)

        # 6. Spectral Contrast (7 → 14 dims — good for sadness/disgust)
        contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
        contrast_mean = np.mean(contrast, axis=1)
        contrast_std  = np.std(contrast, axis=1)

        # 7. Mel Spectrogram top stats (128 → mean+std = 10 dims via PCA-like reduction)
        mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=64, fmax=8000)
        mel_db = librosa.power_to_db(mel, ref=np.max)
        mel_mean = np.mean(mel_db, axis=1)[:5]  # top 5 bands
        mel_std  = np.std(mel_db, axis=1)[:5]

        # 8. Pitch (F0) stats (3 dims) - DISABLED pyin for speed
        # f0, _, _ = librosa.pyin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'), sr=sr)
        # f0_valid = f0[~np.isnan(f0)] if f0 is not None else np.array([0.0])
        pitch_mean = 0.0 # np.mean(f0_valid) if len(f0_valid) > 0 else 0.0
        pitch_std  = 0.0 # np.std(f0_valid) if len(f0_valid) > 0 else 0.0
        voiced_ratio = 0.0 # len(f0_valid) / len(f0) if f0 is not None and len(f0) > 0 else 0.0

        feature_vector = np.hstack([
            mfcc_mean, mfcc_std,         # 80
            d_mean, d_std,               # 80
            zcr_mean, zcr_std,           # 2
            rms_mean, rms_std,           # 2
            chroma_mean, chroma_std,     # 24
            contrast_mean, contrast_std, # 14
            mel_mean, mel_std,           # 10
            pitch_mean, pitch_std, voiced_ratio  # 3
        ])
        return feature_vector.astype(np.float32)
    except Exception as e:
        return None


def load_ravdess(data_dir: str):
    rows = []
    for wav_path in glob.glob(os.path.join(data_dir, "**", "*.wav"), recursive=True):
        fname = os.path.splitext(os.path.basename(wav_path))[0]
        parts = fname.split("-")
        if len(parts) < 3:
            continue
        try:
            code = int(parts[2])
        except ValueError:
            continue
        label = RAVDESS_CODE_MAP.get(code)
        if label:
            rows.append((wav_path, label))
    return rows


# RAVDESS loader remains the same as it is the primary dataset.


def run():
    model_dir = os.path.join(REPO_ROOT, "backend", "models", "assets")
    os.makedirs(model_dir, exist_ok=True)

    # ── Gather RAVDESS files ────────────────────────────────────────────────
    d = DATASET_DIRS["ravdess"]
    if not os.path.isdir(d):
        print(f"[ERROR] RAVDESS dataset not found at {d}")
        return
    
    all_data = load_ravdess(d)
    print(f"[ravdess] Found {len(all_data)} labeled audio files")

    if not all_data:
        print("No audio data found!")
        return

    print(f"\nTotal files to process: {len(all_data)}")


    # ── Extract features directly from WAV files ─────────────────────────────
    X, y_raw = [], []
    for i, (wav_path, label) in enumerate(all_data):
        feat = extract_features(wav_path)
        if feat is not None:
            X.append(feat)
            y_raw.append(label)
        if (i + 1) % 1000 == 0:
            print(f"  Extracted {i+1}/{len(all_data)} ({len(X)} valid)")

    X = np.array(X)
    y_raw = np.array(y_raw)
    print(f"\nDataset extracted: X={X.shape}, labels distribution:")
    for lbl in sorted(set(y_raw)):
        print(f"  {lbl}: {sum(y_raw == lbl)}")

    # ── Encode labels ─────────────────────────────────────────────────────────
    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    class_names = le.classes_
    print(f"\nClasses: {list(class_names)}")

    # ── Train / Test Split ───────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=RANDOM_SEED, stratify=y
    )

    # ── Oversample minority classes ──────────────────────────────────────────
    train_df = pd.DataFrame(X_train)
    train_df["_target"] = y_train
    max_cls = train_df["_target"].value_counts().max()
    balanced = pd.concat([
        resample(train_df[train_df["_target"] == cls],
                 replace=True, n_samples=max_cls, random_state=RANDOM_SEED)
        for cls in np.unique(y_train)
    ])
    X_train_bal = balanced.drop("_target", axis=1).values
    y_train_bal = balanced["_target"].values
    print(f"\nBalanced training set: {X_train_bal.shape}")

    # ── Scale ────────────────────────────────────────────────────────────────
    scaler = StandardScaler()
    X_train_bal = scaler.fit_transform(X_train_bal)
    X_test_scaled = scaler.transform(X_test)

    # ── Train Ensemble ───────────────────────────────────────────────────────
    print("\nTraining SVM (RBF kernel) — best for audio emotion...")
    svm = SVC(kernel="rbf", C=8, gamma="scale", probability=True,
              class_weight="balanced", random_state=RANDOM_SEED, verbose=False)
    svm.fit(X_train_bal, y_train_bal)
    svm_acc = accuracy_score(y_test, svm.predict(X_test_scaled))
    print(f"SVM Accuracy: {svm_acc:.2%}")

    print("\nTraining HistGradientBoosting (ensemble partner)...")
    hgb = HistGradientBoostingClassifier(
        max_iter=600, max_depth=10, learning_rate=0.04,
        min_samples_leaf=10, l2_regularization=0.1,
        random_state=RANDOM_SEED, verbose=0,
        early_stopping=True, n_iter_no_change=25,
        validation_fraction=0.1,
    )
    hgb.fit(X_train_bal, y_train_bal)
    hgb_acc = accuracy_score(y_test, hgb.predict(X_test_scaled))
    print(f"HGB Accuracy: {hgb_acc:.2%}")

    print("\nBuilding Voting Ensemble (SVM + HGB)...")
    ensemble = VotingClassifier(
        estimators=[("svm", svm), ("hgb", hgb)],
        voting="soft",
        weights=[2, 1]  # Trust SVM more
    )
    ensemble.fit(X_train_bal, y_train_bal)
    y_pred = ensemble.predict(X_test_scaled)
    final_acc = accuracy_score(y_test, y_pred)
    print(f"\nFINAL Ensemble Accuracy: {final_acc:.2%}")
    print("\nFull Classification Report:")
    print(classification_report(y_test, y_pred, target_names=class_names))

    # ── Export ───────────────────────────────────────────────────────────────
    joblib.dump(ensemble, os.path.join(model_dir, "audio_model.joblib"))
    joblib.dump(class_names, os.path.join(model_dir, "audio_labels.joblib"))
    joblib.dump(scaler, os.path.join(model_dir, "audio_scaler.joblib"))
    print(f"\nModel assets exported to: {model_dir}")


if __name__ == "__main__":
    run()
