"""
pipeline/image/preprocess_rafdb.py
------------------------------------
Preprocess the RAF-DB (Real-world Affective Faces Database) dataset.

Expected raw layout:
  datasets/raw/image/rafdb/
      basic/
          Image/
              aligned/
                  train_00001_aligned.jpg
                  test_00001_aligned.jpg
                  ...
          EmoLabel/
              list_patition_label.txt    ← "train_00001.jpg 3"  (1-indexed)

OR flat layout:
  datasets/raw/image/rafdb/
      aligned/
          ...
      list_patition_label.txt

Outputs:
  datasets/processed/image/rafdb_meta.csv
  datasets/processed/image/rafdb/<emotion>/<idx>.png
"""

import os
import sys
import glob
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from pipeline.config import DATASET_DIRS, PROC_IMAGE_DIR, IMAGE_SIZE
from pipeline.label_map import RAFDB_MAP

try:
    import cv2
except ImportError:
    print("opencv-python-headless not installed.")
    sys.exit(1)


def _find_label_file(raw_dir: str) -> str | None:
    for candidate in [
        os.path.join(raw_dir, "basic", "EmoLabel", "list_patition_label.txt"),
        os.path.join(raw_dir, "EmoLabel", "list_patition_label.txt"),
        os.path.join(raw_dir, "list_patition_label.txt"),
    ]:
        if os.path.exists(candidate):
            return candidate
    return None


def _find_image_dir(raw_dir: str) -> str | None:
    for candidate in [
        os.path.join(raw_dir, "basic", "Image", "aligned"),
        os.path.join(raw_dir, "Image", "aligned"),
        os.path.join(raw_dir, "aligned"),
        os.path.join(raw_dir),
    ]:
        if os.path.isdir(candidate):
            images = glob.glob(os.path.join(candidate, "*.jpg")) + \
                     glob.glob(os.path.join(candidate, "*.png"))
            if images:
                return candidate
    return None


def _process_image(img_path: str) -> np.ndarray | None:
    img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
    img = cv2.resize(img, IMAGE_SIZE, interpolation=cv2.INTER_LINEAR)
    img = (img.astype(np.float32) / 255.0 * 255).astype(np.uint8)
    return img


def run():
    raw_dir = DATASET_DIRS["rafdb"]
    if not os.path.isdir(raw_dir):
        print(f"[rafdb] Raw data not found at: {raw_dir}")
        print("  Download: http://www.whdeng.cn/raf/model1.html (requires registration)")
        return

    label_file = _find_label_file(raw_dir)
    image_dir  = _find_image_dir(raw_dir)

    if label_file is None:
        print(f"[rafdb] Cannot find list_patition_label.txt in {raw_dir}")
        return
    if image_dir is None:
        print(f"[rafdb] Cannot find aligned image directory in {raw_dir}")
        return

    print(f"  [rafdb] Label file: {label_file}")
    print(f"  [rafdb] Image dir : {image_dir}")

    # Build filename → label mapping from annotation file
    label_map_from_file: dict[str, int] = {}
    with open(label_file, encoding="utf-8", errors="ignore") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) == 2:
                label_map_from_file[parts[0].strip()] = int(parts[1].strip())

    # Create output subdirs
    for emotion in set(v for v in RAFDB_MAP.values() if v):
        os.makedirs(os.path.join(PROC_IMAGE_DIR, "rafdb", emotion), exist_ok=True)

    rows = []
    # RAF-DB aligned images are named like "train_00001_aligned.jpg"
    all_images = glob.glob(os.path.join(image_dir, "*.jpg")) + \
                 glob.glob(os.path.join(image_dir, "*.png"))

    for img_path in sorted(all_images):
        basename = os.path.basename(img_path)
        # The label file uses un-aligned names: "train_00001.jpg"
        label_key = basename.replace("_aligned", "")

        label_int = label_map_from_file.get(label_key)
        if label_int is None:
            # Try the raw basename directly
            label_int = label_map_from_file.get(basename)
        if label_int is None:
            continue

        canonical = RAFDB_MAP.get(label_int)
        if canonical is None:
            continue

        img = _process_image(img_path)
        if img is None:
            continue

        split = "train" if "train" in basename.lower() else "test"
        fname = f"{len(rows)}.png"
        save_path = os.path.join(PROC_IMAGE_DIR, "rafdb", canonical, fname)
        cv2.imwrite(save_path, img)

        rows.append({
            "image_path": os.path.join("rafdb", canonical, fname),
            "label":      canonical,
            "split":      split,
            "source":     "rafdb"
        })

    meta = pd.DataFrame(rows)
    out_path = os.path.join(PROC_IMAGE_DIR, "rafdb_meta.csv")
    meta.to_csv(out_path, index=False)
    print(f"[rafdb] Saved {len(meta)} images → {out_path}")
    print(meta["label"].value_counts().to_string())


if __name__ == "__main__":
    run()
