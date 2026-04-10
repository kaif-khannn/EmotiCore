"""
pipeline/image/preprocess_fer2013.py
--------------------------------------
Preprocess the FER-2013 (Facial Expression Recognition 2013) dataset.

Expected raw layout:
  datasets/raw/image/fer2013/
      fer2013.csv      ← Kaggle format: emotion, pixels, Usage

Columns: emotion (int 0-6), pixels (space-separated pixel string), Usage (Training/PublicTest/PrivateTest)

Label mapping (FER-2013 original):
  0=Angry 1=Disgust 2=Fear 3=Happy 4=Sad 5=Surprise 6=Neutral

Outputs:
  datasets/processed/image/fer2013_meta.csv
  datasets/processed/image/fer2013/<emotion>/<idx>.png
"""

import os
import sys
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from pipeline.config import DATASET_DIRS, PROC_IMAGE_DIR, IMAGE_SIZE
from pipeline.label_map import FER2013_MAP

try:
    import cv2
except ImportError:
    print("opencv-python-headless not installed. Run: pip install opencv-python-headless")
    sys.exit(1)


def run():
    raw_dir = DATASET_DIRS["fer2013"]
    csv_path = os.path.join(raw_dir, "fer2013.csv")

    if not os.path.exists(csv_path):
        print(f"[fer2013] fer2013.csv not found at: {csv_path}")
        print("  Download: https://www.kaggle.com/c/challenges-in-representation-learning-facial-expression-recognition-challenge/data")
        return

    print(f"[fer2013] Loading {csv_path} ...")
    df = pd.read_csv(csv_path)
    df = df.drop_duplicates()
    print(f"  [fer2013] Total unique rows: {len(df)}")

    # Create output emotion subdirs
    for emotion in set(v for v in FER2013_MAP.values() if v):
        os.makedirs(os.path.join(PROC_IMAGE_DIR, "fer2013", emotion), exist_ok=True)

    rows = []
    discarded = 0
    skipped = 0
    for i, row in df.iterrows():
        # Handle potential NaNs in the emotion column
        if pd.isna(row["emotion"]):
            discarded += 1
            continue

        label_int  = int(row["emotion"])
        canonical  = FER2013_MAP.get(label_int)
        if canonical is None:
            discarded += 1
            continue

        fname = f"{i}.png"
        rel_path = os.path.join("fer2013", canonical, fname)
        save_path = os.path.join(PROC_IMAGE_DIR, rel_path)

        # Skip if already exists
        if os.path.exists(save_path):
            rows.append({
                "image_path": rel_path,
                "label":      canonical,
                "split":      row.get("Usage", "Training"),
                "source":     "fer2013"
            })
            skipped += 1
            if i % 10000 == 0:
                print(f"  [fer2013] Skipped up to {i} (already exists)")
            continue


        # Decode pixel string -> 48x48 grayscale image
        try:
            raw_pixels = str(row["pixels"]).split()
            if not raw_pixels or len(raw_pixels) != 2304:
                discarded += 1
                continue
            pixels = np.array(raw_pixels, dtype=np.uint8).reshape(48, 48)
        except Exception:
            discarded += 1
            continue

        # Resize if needed
        if IMAGE_SIZE != (48, 48):
            pixels = cv2.resize(pixels, IMAGE_SIZE, interpolation=cv2.INTER_LINEAR)

        # Normalize
        img_norm = pixels.astype(np.float32) / 255.0

        # Save as PNG (scaled back to 0-255 uint8 for storage)
        img_uint8 = (img_norm * 255).astype(np.uint8)
        fname = f"{i}.png"
        save_path = os.path.join(PROC_IMAGE_DIR, "fer2013", canonical, fname)
        cv2.imwrite(save_path, img_uint8)

        rows.append({
            "image_path": os.path.join("fer2013", canonical, fname),
            "label":      canonical,
            "split":      row.get("Usage", "Training"),
            "source":     "fer2013"
        })

        if i % 5000 == 0:
            print(f"  [fer2013] Processed {i}/{len(df)} ...")

    meta = pd.DataFrame(rows)
    out_path = os.path.join(PROC_IMAGE_DIR, "fer2013_meta.csv")
    meta.to_csv(out_path, index=False)
    print(f"[fer2013] Saved {len(meta)} images (discarded {discarded} non-canonical) -> {out_path}")
    print(meta["label"].value_counts().to_string())


if __name__ == "__main__":
    run()
