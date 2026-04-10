"""
pipeline/text/preprocess_semeval2018.py
----------------------------------------
Reads SemEval-2018 Task 1 CSVs (downloaded from Hugging Face).
SemEval is multi-label: multiple emotions per tweet. We pick the single
highest-intensity label column as the primary emotion for each tweet.
Outputs: datasets/processed/text/semeval2018_meta.csv  [text, label]
"""

import os
import sys
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from pipeline.config import DATASET_DIRS, PROC_TEXT_DIR
from pipeline.label_map import SEMEVAL_MAP, map_label

EMOTION_COLS = ["anger", "anticipation", "disgust", "fear", "joy",
                "love", "optimism", "pessimism", "sadness", "surprise", "trust"]

def run():
    raw_dir = DATASET_DIRS["semeval2018"]
    out_path = os.path.join(PROC_TEXT_DIR, "semeval2018_meta.csv")

    if not os.path.exists(raw_dir):
        print(f"[semeval2018] Raw directory not found: {raw_dir}")
        return

    frames = []
    for split in ["train.csv", "dev.csv", "test.csv"]:
        fpath = os.path.join(raw_dir, split)
        if os.path.exists(fpath):
            frames.append(pd.read_csv(fpath))

    if not frames:
        print("[semeval2018] No CSV files found. Run download_datasets.py first.")
        return

    df = pd.concat(frames, ignore_index=True)

    # Find which emotion column to use — HF uses integer 0/1 columns
    # Identify columns that exist in the dataframe
    present_cols = [c for c in EMOTION_COLS if c in df.columns]

    rows = []
    for _, row in df.iterrows():
        text = str(row.get("Tweet", row.get("sentence", row.get("text", "")))).strip()
        if not text:
            continue

        # Pick the dominant emotion (highest score column)
        scores = {col: int(row.get(col, 0)) for col in present_cols}
        if not any(scores.values()):
            continue

        dominant = max(scores, key=scores.get)
        label = map_label(dominant, SEMEVAL_MAP)
        if label is None:
            continue
        rows.append({"text": text, "label": label, "source": "semeval2018"})

    out_df = pd.DataFrame(rows)
    out_df.to_csv(out_path, index=False)
    print(f"[semeval2018] {len(out_df)} samples -> {out_path}")
    print(out_df["label"].value_counts().to_string())

if __name__ == "__main__":
    run()
