"""
pipeline/text/preprocess_goemotions.py
---------------------------------------
Preprocess the GoEmotions dataset (Google, 27 labels).

Expected raw layout:
  datasets/raw/text/goemotions/
      train.tsv  (or train.csv)
      dev.tsv
      test.tsv
      emotions.txt   ← one emotion per line, matches column header order

Outputs:
  datasets/processed/text/goemotions.csv
  Columns: text, label, source
"""

import os
import sys
import pandas as pd
import re

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from pipeline.config import DATASET_DIRS, PROC_TEXT_DIR
from pipeline.label_map import GOEMOTIONS_MAP, map_label

# ── GoEmotions ships two formats ────────────────────────────────────────────
# Format A: TSV with columns  text | id | ... | <emotion_col0> ... <emotion_col26>
# Format B: simple CSV with   text | labels  (comma-sep label indices)
# We handle both by auto-detecting.

SPLIT_FILES = ["train.tsv", "dev.tsv", "test.tsv",
               "train.csv", "dev.csv", "test.csv"]


def _clean_text(text: str) -> str:
    """Lowercase, strip URLs, Reddit mentions, excess whitespace."""
    text = str(text).lower()
    text = re.sub(r"http\S+", "", text)          # URLs
    text = re.sub(r"u/\w+|r/\w+", "", text)     # Reddit refs
    text = re.sub(r"[^a-z0-9\s'\",.!?]", " ", text)  # non-ASCII noise
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _load_format_a(path: str, emotion_names: list[str]) -> pd.DataFrame:
    """TSV: auto-detect one-hot vs indexed."""
    # Read without header
    df = pd.read_csv(path, sep="\t", header=None)
    
    # Format 1 (Indexed): text | id | labels  (WAIT, I saw: text | labels | id)
    # Actually, let's look at the columns
    # Based on Get-Content:
    # My favourite food is anything I didn't have to cook myself. \t 27 \t eebbqej
    
    if df.shape[1] >= 2:
        # Check if col 1 is a single emotion index or comma-sep indices
        first_label = str(df.iloc[0, 1])
        if first_label.replace(",", "").isdigit():
            # Indexed TSV
            rows = []
            for _, row in df.iterrows():
                indices = str(row[1]).split(",")
                if len(indices) == 1:
                    idx = int(indices[0])
                    if idx < len(emotion_names):
                        canonical = map_label(emotion_names[idx], GOEMOTIONS_MAP)
                        if canonical:
                            rows.append({"text": _clean_text(row[0]),
                                         "label": canonical,
                                         "source": "goemotions"})
            return pd.DataFrame(rows)

    # Fallback to One-Hot if col 1 is ID and col 2 is emotion
    if df.shape[1] > 2 + len(emotion_names):
        text_col = df.iloc[:, 0]
        emotion_cols = df.iloc[:, 2:2 + len(emotion_names)]
        emotion_cols.columns = emotion_names
        rows = []
        for i, row in emotion_cols.iterrows():
            active = [e for e in emotion_names if row[e] == 1]
            if len(active) == 1:
                canonical = map_label(active[0], GOEMOTIONS_MAP)
                if canonical:
                    rows.append({"text": _clean_text(text_col.iloc[i]),
                                 "label": canonical,
                                 "source": "goemotions"})
        return pd.DataFrame(rows)
    
    return pd.DataFrame()


def _load_format_b(path: str) -> pd.DataFrame:
    """CSV: text | labels (comma-sep indices), emotions colindex list in emotions.txt"""
    emotions_path = os.path.join(os.path.dirname(path), "emotions.txt")
    if not os.path.exists(emotions_path):
        return pd.DataFrame()
    with open(emotions_path) as f:
        emotion_names = [l.strip() for l in f if l.strip()]

    df = pd.read_csv(path)
    # Possible column names
    text_key = "text" if "text" in df.columns else df.columns[0]
    label_key = "labels" if "labels" in df.columns else df.columns[1]

    rows = []
    for _, row in df.iterrows():
        indices = str(row[label_key]).split(",")
        if len(indices) == 1 and indices[0].strip().isdigit():
            idx = int(indices[0].strip())
            if idx < len(emotion_names):
                canonical = map_label(emotion_names[idx], GOEMOTIONS_MAP)
                if canonical:
                    rows.append({"text": _clean_text(row[text_key]),
                                 "label": canonical,
                                 "source": "goemotions"})
    return pd.DataFrame(rows)


def run():
    raw_dir = DATASET_DIRS["goemotions"]
    if not os.path.isdir(raw_dir):
        print(f"[goemotions] Raw data not found at: {raw_dir}")
        print("  Download: https://github.com/google-research/google-research/tree/master/goemotions")
        return

    # Load emotion names if available
    emotions_path = os.path.join(raw_dir, "emotions.txt")
    if os.path.exists(emotions_path):
        with open(emotions_path) as f:
            emotion_names = [l.strip() for l in f if l.strip()]
    else:
        emotion_names = list(GOEMOTIONS_MAP.keys())

    all_frames = []
    for fname in SPLIT_FILES:
        fpath = os.path.join(raw_dir, fname)
        if not os.path.exists(fpath):
            continue
        if fname.endswith(".tsv"):
            df = _load_format_a(fpath, emotion_names)
        else:
            df = _load_format_b(fpath)
        all_frames.append(df)
        print(f"  [goemotions] {fname}: {len(df)} usable rows")

    if not all_frames:
        print("[goemotions] No split files found inside raw directory.")
        return

    combined = pd.concat(all_frames, ignore_index=True)
    combined = combined.dropna(subset=["text", "label"])
    combined = combined[combined["text"].str.len() > 3]

    out_path = os.path.join(PROC_TEXT_DIR, "goemotions.csv")
    combined.to_csv(out_path, index=False)
    print(f"[goemotions] Saved {len(combined)} rows -> {out_path}")
    print(combined["label"].value_counts().to_string())


if __name__ == "__main__":
    run()
