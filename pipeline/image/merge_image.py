"""
pipeline/image/merge_image.py
------------------------------
Merges fer2013_meta.csv + affectnet_meta.csv + rafdb_meta.csv,
balances classes via augmentation (rotation, flip, brightness),
writes final image_dataset.csv.
"""

import os
import sys
import random
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from pipeline.config import (
    PROC_IMAGE_DIR, EMOTIONS, RANDOM_SEED,
    IMAGE_MAX_PER_CLASS, IMAGE_MIN_PER_CLASS, IMAGE_SIZE
)

random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

try:
    import cv2
except ImportError:
    print("opencv-python-headless not installed.")
    sys.exit(1)


def _augment_image(img_path: str, save_path: str) -> bool:
    """Apply random rotation + flip + brightness to an existing image."""
    full_path = os.path.join(PROC_IMAGE_DIR, img_path)
    img = cv2.imread(full_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return False

    # Random rotation +/- 15 deg
    angle = random.uniform(-15, 15)
    h, w  = img.shape
    M     = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
    img   = cv2.warpAffine(img, M, (w, h))

    # Random horizontal flip (50% chance)
    if random.random() < 0.5:
        img = cv2.flip(img, 1)

    # Random brightness shift
    shift = random.randint(-25, 25)
    img   = np.clip(img.astype(np.int16) + shift, 0, 255).astype(np.uint8)

    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    cv2.imwrite(save_path, img)
    return True


def run():
    sources = ["fer2013_meta.csv", "affectnet_meta.csv", "rafdb_meta.csv"]
    frames = []
    for src in sources:
        path = os.path.join(PROC_IMAGE_DIR, src)
        if os.path.exists(path):
            df = pd.read_csv(path)
            frames.append(df)
            print(f"  Loaded {src}: {len(df)} rows")
        else:
            print(f"  Skipping {src} (not found - run its preprocessor first)")

    if not frames:
        print("[merge_image] No processed metadata files found.")
        return

    combined = pd.concat(frames, ignore_index=True)
    combined = combined[combined["label"].isin(EMOTIONS)].copy()
    combined["augmented"] = False
    print(f"\n[merge_image] Raw combined: {len(combined)} images")
    print(combined["label"].value_counts().to_string())

    # -- Undersample over-represented classes ---------------------------------
    balanced_frames = []
    for emotion in EMOTIONS:
        subset = combined[combined["label"] == emotion]
        if len(subset) > IMAGE_MAX_PER_CLASS:
            subset = subset.sample(IMAGE_MAX_PER_CLASS, random_state=RANDOM_SEED)
        balanced_frames.append(subset)

    # -- Oversample minority classes (image augmentation) ----------------------
    aug_rows = []
    for emotion in EMOTIONS:
        subset = combined[combined["label"] == emotion]
        shortfall = IMAGE_MIN_PER_CLASS - len(subset)
        if shortfall > 0 and len(subset) > 0:
            print(f"  Augmenting '{emotion}': need {shortfall} more samples")
            samples = subset.sample(shortfall, replace=True, random_state=RANDOM_SEED)
            aug_dir = os.path.join(PROC_IMAGE_DIR, "augmented", emotion)
            os.makedirs(aug_dir, exist_ok=True)
            aug_count = 0
            for _, row in samples.iterrows():
                aug_fname = f"aug_{len(aug_rows)}_{aug_count}.png"
                save_path = os.path.join(aug_dir, aug_fname)
                rel_path  = os.path.join("augmented", emotion, aug_fname)
                if _augment_image(row["image_path"], save_path):
                    aug_rows.append({
                        "image_path": rel_path,
                        "label":      emotion,
                        "split":      "train",
                        "source":     row["source"] + "_aug",
                        "augmented":  True
                    })
                aug_count += 1

    balanced = pd.concat(
        balanced_frames + ([pd.DataFrame(aug_rows)] if aug_rows else []),
        ignore_index=True
    )
    balanced = balanced.sample(frac=1, random_state=RANDOM_SEED).reset_index(drop=True)

    out_path = os.path.join(PROC_IMAGE_DIR, "image_dataset.csv")
    balanced.to_csv(out_path, index=False)
    print(f"\n[merge_image] Final dataset: {len(balanced)} images -> {out_path}")
    print(balanced["label"].value_counts().to_string())


if __name__ == "__main__":
    run()
