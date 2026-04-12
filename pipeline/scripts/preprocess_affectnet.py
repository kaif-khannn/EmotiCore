"""
pipeline/image/preprocess_affectnet.py
----------------------------------------
Preprocess the AffectNet dataset (large-scale facial affect).

Expected raw layout (manual_annotations format):
  datasets/raw/image/affectnet/
      Manually_Annotated_Images/
          <subdir>/
              <image>.jpg
      ...
      Manually_Annotated_file_lists/
          training.csv    ← columns: subDirectory_filePath, face_x, face_y, face_width, face_height, facial_landmarks, expression, valence, arousal
          validation.csv

OR the Kaggle repack format:
  datasets/raw/image/affectnet/
      train/
          0/   1/   2/ ...       (emotion int subdirs)
      val/
          ...

Outputs:
  datasets/processed/image/affectnet_meta.csv
  datasets/processed/image/affectnet/<emotion>/<idx>.png
"""

import os
import sys
import glob
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from pipeline.config import DATASET_DIRS, PROC_IMAGE_DIR, IMAGE_SIZE, IMAGE_FACE_SCALE, IMAGE_FACE_MIN_NBRS
from pipeline.label_map import AFFECTNET_MAP

try:
    import cv2
except ImportError:
    print("opencv-python-headless not installed.")
    sys.exit(1)

# OpenCV face detector for non-aligned images
_FACE_CASCADE = None
def get_face_cascade():
    global _FACE_CASCADE
    if _FACE_CASCADE is None:
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        _FACE_CASCADE = cv2.CascadeClassifier(cascade_path)
    return _FACE_CASCADE


def _process_image(img_path: str, face_region=None) -> np.ndarray | None:
    """Load, (optionally crop face), resize, normalize image."""
    img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None

    if face_region:
        x, y, w, h = face_region
        # Safety clamp
        x, y = max(0, x), max(0, y)
        w = min(w, img.shape[1] - x)
        h = min(h, img.shape[0] - y)
        if w > 5 and h > 5:
            img = img[y:y+h, x:x+w]
    else:
        # Auto-detect face
        cascade = get_face_cascade()
        faces = cascade.detectMultiScale(img, scaleFactor=IMAGE_FACE_SCALE,
                                          minNeighbors=IMAGE_FACE_MIN_NBRS,
                                          minSize=(20, 20))
        if len(faces) > 0:
            x, y, w, h = faces[0]
            img = img[y:y+h, x:x+w]

    img = cv2.resize(img, IMAGE_SIZE, interpolation=cv2.INTER_LINEAR)
    img = img.astype(np.float32) / 255.0
    return (img * 255).astype(np.uint8)


def _process_csv_format(raw_dir: str) -> pd.DataFrame:
    """Handle official AffectNet CSV manifest format."""
    rows = []
    for split_csv in ["training.csv", "validation.csv"]:
        csv_path_candidates = [
            os.path.join(raw_dir, "Manually_Annotated_file_lists", split_csv),
            os.path.join(raw_dir, split_csv),
        ]
        csv_path = next((p for p in csv_path_candidates if os.path.exists(p)), None)
        if not csv_path:
            continue

        df = pd.read_csv(csv_path)
        # Flexible column detection
        path_col   = next((c for c in df.columns if "path" in c.lower() or "file" in c.lower()), df.columns[0])
        expr_col   = next((c for c in df.columns if "expres" in c.lower()), None)
        face_x_col = next((c for c in df.columns if "face_x" in c.lower()), None)

        if expr_col is None:
            continue

        for _, row in df.iterrows():
            img_rel = str(row[path_col])
            img_path = os.path.join(raw_dir, "Manually_Annotated_Images", img_rel)
            if not os.path.exists(img_path):
                img_path = os.path.join(raw_dir, img_rel)
            if not os.path.exists(img_path):
                continue

            try:
                label_int = int(float(str(row[expr_col])))
            except ValueError:
                continue

            canonical = AFFECTNET_MAP.get(label_int)
            if canonical is None:
                continue

            face_region = None
            if face_x_col:
                try:
                    face_region = (int(row["face_x"]), int(row["face_y"]),
                                   int(row["face_width"]), int(row["face_height"]))
                except Exception:
                    pass

            out_emotion_dir = os.path.join(PROC_IMAGE_DIR, "affectnet", canonical)
            os.makedirs(out_emotion_dir, exist_ok=True)
            fname = f"{len(rows)}.png"
            save_path = os.path.join(out_emotion_dir, fname)

            img = _process_image(img_path, face_region)
            if img is None:
                continue
            cv2.imwrite(save_path, img)

            rows.append({
                "image_path": os.path.join("affectnet", canonical, fname),
                "label":      canonical,
                "split":      split_csv.replace(".csv", ""),
                "source":     "affectnet"
            })

        print(f"  [affectnet] {split_csv}: {len(rows)} cumulative usable rows")

    return pd.DataFrame(rows)


def _process_folder_format(raw_dir: str) -> pd.DataFrame:
    """Handle Kaggle repack: train/0/ train/1/ etc."""
    rows = []
    for split in ["train", "val"]:
        split_dir = os.path.join(raw_dir, split)
        if not os.path.isdir(split_dir):
            continue
        for class_dir in os.listdir(split_dir):
            try:
                label_int = int(class_dir)
            except ValueError:
                continue
            canonical = AFFECTNET_MAP.get(label_int)
            if canonical is None:
                continue

            out_emotion_dir = os.path.join(PROC_IMAGE_DIR, "affectnet", canonical)
            os.makedirs(out_emotion_dir, exist_ok=True)

            img_paths = glob.glob(os.path.join(split_dir, class_dir, "*.jpg")) + \
                        glob.glob(os.path.join(split_dir, class_dir, "*.png"))
            for img_path in img_paths:
                img = _process_image(img_path)
                if img is None:
                    continue
                fname = f"{len(rows)}.png"
                save_path = os.path.join(out_emotion_dir, fname)
                cv2.imwrite(save_path, img)
                rows.append({
                    "image_path": os.path.join("affectnet", canonical, fname),
                    "label":      canonical,
                    "split":      split,
                    "source":     "affectnet"
                })

    return pd.DataFrame(rows)


def run():
    raw_dir = DATASET_DIRS["affectnet"]
    if not os.path.isdir(raw_dir):
        print(f"[affectnet] Raw data not found at: {raw_dir}")
        print("  Download: http://mohammadmahoor.com/affectnet/ (requires license agreement)")
        return

    # Auto-detect format
    if os.path.isdir(os.path.join(raw_dir, "Manually_Annotated_Images")) or \
       os.path.exists(os.path.join(raw_dir, "training.csv")):
        print("[affectnet] Using CSV annotation format")
        meta = _process_csv_format(raw_dir)
    else:
        print("[affectnet] Using folder-based format (Kaggle repack)")
        meta = _process_folder_format(raw_dir)

    out_path = os.path.join(PROC_IMAGE_DIR, "affectnet_meta.csv")
    meta.to_csv(out_path, index=False)
    print(f"[affectnet] Saved {len(meta)} images → {out_path}")
    print(meta["label"].value_counts().to_string())


if __name__ == "__main__":
    run()
