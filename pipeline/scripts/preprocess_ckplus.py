"""
pipeline/image/preprocess_ckplus.py
--------------------------------------
Processes the CK+ (Extended Cohn-Kanade) dataset from Kaggle.
Expected Kaggle structure:
  datasets/raw/image/ckplus/
    anger/     *.png
    contempt/  *.png
    disgust/   *.png
    fear/      *.png
    happy/     *.png
    sadness/   *.png
    surprise/  *.png
Outputs: datasets/processed/image/ckplus_meta.csv  [image_path, label, split, source]
"""
import os
import sys
import shutil
import pandas as pd
import cv2

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from pipeline.config import DATASET_DIRS, PROC_IMAGE_DIR, IMAGE_SIZE
from pipeline.label_map import CKPLUS_MAP, map_label

def run():
    raw_dir = DATASET_DIRS["ckplus"]
    out_path = os.path.join(PROC_IMAGE_DIR, "ckplus_meta.csv")
    images_dir = os.path.join(PROC_IMAGE_DIR, "ckplus_images")
    os.makedirs(images_dir, exist_ok=True)

    if not os.path.exists(raw_dir):
        print(f"[ckplus] Raw directory not found: {raw_dir}")
        print("         Run download_datasets.py to auto-download from Hugging Face.")
        return

    # Support HF layout (ckplus/images/label/*.png) and flat layout (ckplus/label/*.png)
    search_root = os.path.join(raw_dir, "images") if os.path.exists(os.path.join(raw_dir, "images")) else raw_dir

    rows = []
    for emotion_folder in os.listdir(search_root):
        folder_path = os.path.join(search_root, emotion_folder)
        if not os.path.isdir(folder_path):
            continue
        label = map_label(emotion_folder.lower(), CKPLUS_MAP)
        if label is None:
            continue

        for img_file in os.listdir(folder_path):
            if not img_file.lower().endswith((".png", ".jpg", ".jpeg")):
                continue
            src_path = os.path.join(folder_path, img_file)
            img = cv2.imread(src_path, cv2.IMREAD_GRAYSCALE)
            if img is None:
                continue

            img = cv2.resize(img, IMAGE_SIZE)
            # Save as RGB PNG for compatibility with MobileNet-based training
            img_rgb = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
            dest_fname = f"ckplus_{emotion_folder}_{img_file}"
            dest_path = os.path.join(images_dir, dest_fname)
            cv2.imwrite(dest_path, img_rgb)

            rel_path = os.path.join("ckplus_images", dest_fname)
            rows.append({"image_path": rel_path, "label": label,
                         "split": "train", "source": "ckplus"})

    out_df = pd.DataFrame(rows)
    out_df.to_csv(out_path, index=False)
    print(f"[ckplus] {len(out_df)} samples -> {out_path}")
    print(out_df["label"].value_counts().to_string())

if __name__ == "__main__":
    run()
