"""
pipeline/text/preprocess_emotionlines.py
-----------------------------------------
Preprocess the EmotionLines dataset (Friends) - Updated to use MELD CSVs as source.

Expected raw layout:
  datasets/raw/text/emotionlines/
      meld_train.csv
      meld_dev.csv
      meld_test.csv

Outputs:
  datasets/processed/text/emotionlines.csv
  Columns: text, label, source
"""

import os
import sys
import pandas as pd
import re
import glob

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from pipeline.config import DATASET_DIRS, PROC_TEXT_DIR
from pipeline.label_map import EMOTIONLINES_MAP, map_label

def _clean_text(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"[^a-z0-9\s'\",.!?]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def run():
    raw_dir = DATASET_DIRS["emotionlines"]
    if not os.path.isdir(raw_dir):
        print(f"[emotionlines] Raw data not found at: {raw_dir}")
        return

    csv_files = glob.glob(os.path.join(raw_dir, "meld_*.csv"))
    if not csv_files:
        # Fallback to any CSVs
        csv_files = glob.glob(os.path.join(raw_dir, "*.csv"))

    if not csv_files:
        print(f"[emotionlines] No CSV files found in {raw_dir}")
        return

    all_frames = []
    for fpath in csv_files:
        try:
            df = pd.read_csv(fpath)
            # MELD columns: Utterance, Emotion, ...
            text_key = "Utterance" if "Utterance" in df.columns else df.columns[0]
            label_key = "Emotion" if "Emotion" in df.columns else df.columns[1]
            
            rows = []
            for _, row in df.iterrows():
                emotion_raw = str(row[label_key])
                canonical = map_label(emotion_raw, EMOTIONLINES_MAP)
                if canonical:
                    rows.append({
                        "text": _clean_text(row[text_key]),
                        "label": canonical,
                        "source": "emotionlines"
                    })
            
            out_df = pd.DataFrame(rows)
            all_frames.append(out_df)
            print(f"  [emotionlines] {os.path.basename(fpath)}: {len(out_df)} usable rows")
        except Exception as e:
            print(f"  [emotionlines] Error processing {fpath}: {e}")

    if not all_frames:
        print("[emotionlines] No usable data extracted.")
        return

    combined = pd.concat(all_frames, ignore_index=True)
    combined = combined.dropna(subset=["text", "label"])
    combined = combined[combined["text"].str.len() > 3]

    out_path = os.path.join(PROC_TEXT_DIR, "emotionlines.csv")
    combined.to_csv(out_path, index=False)
    print(f"[emotionlines] Saved {len(combined)} rows -> {out_path}")
    print(combined["label"].value_counts().to_string())

if __name__ == "__main__":
    run()
