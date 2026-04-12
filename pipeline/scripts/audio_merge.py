"""
pipeline/audio/merge_audio.py
-------------------------------
Merges ravdess_meta.csv (the only available audio dataset),
balances classes via random oversampling (duplicate + mild noise),
writes final audio_dataset.csv.

Does NOT duplicate .npy files — oversampled entries point to the
original .npy with a noise_augmented flag so the dataloader can
add noise at train time.
"""

import os
import sys
import random
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from pipeline.config import (
    PROC_AUDIO_DIR, PROC_AUDIO_FEAT, EMOTIONS,
    RANDOM_SEED, AUDIO_MAX_PER_CLASS, AUDIO_MIN_PER_CLASS
)

random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


def _augment_npy(src_path: str, dst_path: str, noise_std: float = 0.01):
    """Load a .npy MFCC array, add Gaussian noise, save to new path."""
    feat = np.load(src_path)
    noise = np.random.normal(0, noise_std, feat.shape).astype(np.float32)
    np.save(dst_path, feat + noise)


def run():
    sources = ["ravdess_meta.csv"]
    frames = []
    for src in sources:
        path = os.path.join(PROC_AUDIO_DIR, src)
        if os.path.exists(path):
            df = pd.read_csv(path)
            frames.append(df)
            print(f"  Loaded {src}: {len(df)} rows")
        else:
            print(f"  Skipping {src} (not found - run its preprocessor first)")

    if not frames:
        print("[merge_audio] No processed meta files found.")
        return

    combined = pd.concat(frames, ignore_index=True)
    combined = combined[combined["label"].isin(EMOTIONS)].copy()
    combined["noise_augmented"] = False
    print(f"\n[merge_audio] Raw combined: {len(combined)} samples")
    print(combined["label"].value_counts().to_string())

    # -- Undersample ----------------------------------------------------------
    balanced_frames = []
    for emotion in EMOTIONS:
        subset = combined[combined["label"] == emotion]
        if len(subset) > AUDIO_MAX_PER_CLASS:
            subset = subset.sample(AUDIO_MAX_PER_CLASS, random_state=RANDOM_SEED)
        balanced_frames.append(subset)

    balanced = pd.concat(balanced_frames, ignore_index=True)

    # -- Oversample minority classes (noise-augmented copies) -----------------
    aug_rows = []
    for emotion in EMOTIONS:
        subset = combined[combined["label"] == emotion]
        shortfall = AUDIO_MIN_PER_CLASS - len(subset)
        if shortfall > 0 and len(subset) > 0:
            print(f"  Augmenting '{emotion}': need {shortfall} more samples")
            samples = subset.sample(shortfall, replace=True, random_state=RANDOM_SEED)
            for idx, (_, row) in enumerate(samples.iterrows()):
                src_feat = os.path.join(PROC_AUDIO_FEAT, row["feature_file"])
                aug_name = f"aug_{emotion}_{idx}.npy"
                dst_feat = os.path.join(PROC_AUDIO_FEAT, aug_name)
                if os.path.exists(src_feat) and not os.path.exists(dst_feat):
                    _augment_npy(src_feat, dst_feat)
                aug_rows.append({
                    "filename":       row["filename"],
                    "feature_file":   aug_name,
                    "label":          emotion,
                    "source":         row["source"] + "_aug",
                    "noise_augmented": True
                })

    if aug_rows:
        balanced = pd.concat([balanced, pd.DataFrame(aug_rows)], ignore_index=True)

    balanced = balanced.sample(frac=1, random_state=RANDOM_SEED).reset_index(drop=True)
    out_path = os.path.join(PROC_AUDIO_DIR, "audio_dataset.csv")
    balanced.to_csv(out_path, index=False)
    print(f"\n[merge_audio] Final dataset: {len(balanced)} samples -> {out_path}")
    print(balanced["label"].value_counts().to_string())


if __name__ == "__main__":
    run()
