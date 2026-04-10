"""
pipeline/text/preprocess_isear.py
-----------------------------------
Preprocess the ISEAR (International Survey on Emotion Antecedents and Reactions) dataset.

Expected raw layout  (any of these will be auto-detected):
  datasets/raw/text/isear/
      isear.csv            ← most common download format
      isear.xlsx
      DATA.MDB             ← original Access DB (skipped; use CSV export)

The CSV has columns: ID, CITY, COUN, SUBJ, SEX, AGE, RELI, PRAC, FOCC,
                     MOCC, FAED, MAED, Field1 ... SIT, W_SFEEL, EMOT, ...
Key columns: 'Field1' (or 'SIT') = the situational description (text),
             'EMOT' (or 'Emotion') = emotion label.

Outputs:
  datasets/processed/text/isear.csv
  Columns: text, label, source
"""

import os
import sys
import re
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from pipeline.config import DATASET_DIRS, PROC_TEXT_DIR
from pipeline.label_map import ISEAR_MAP, map_label


# ISEAR emotion labels as they appear in the raw files (both numeric and string variants)
ISEAR_INT_MAP = {
    1: "joy",
    2: "fear",
    3: "anger",
    4: "sadness",
    5: "disgust",
    6: "shame",
    7: "guilt",
}


def _clean_text(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"[^a-z0-9\s'\",.!?]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _find_columns(df: pd.DataFrame):
    """Auto-detect text and emotion columns regardless of header naming."""
    cols = [c.strip().upper() for c in df.columns]
    col_map = {c.strip().upper(): c for c in df.columns}

    # Text column candidates
    for candidate in ["FIELD1", "SIT", "SITUATION", "TEXT", "SENTENCE"]:
        if candidate in cols:
            text_col = col_map[candidate]
            break
    else:
        # Fallback: longest string column
        text_col = max(df.columns, key=lambda c: df[c].astype(str).str.len().mean())

    # Emotion column candidates
    for candidate in ["EMOT", "EMOTION", "LABEL", "CATEGORY"]:
        if candidate in cols:
            emot_col = col_map[candidate]
            break
    else:
        emot_col = None

    return text_col, emot_col


def _resolve_emotion(raw) -> str | None:
    """Handle both integer and string emotion representations."""
    try:
        idx = int(float(str(raw).strip()))
        string_form = ISEAR_INT_MAP.get(idx)
    except (ValueError, TypeError):
        string_form = str(raw).strip().lower()
    return map_label(string_form, ISEAR_MAP) if string_form else None


def run():
    raw_dir = DATASET_DIRS["isear"]
    if not os.path.isdir(raw_dir):
        print(f"[isear] Raw data not found at: {raw_dir}")
        print("  Download: https://www.unige.ch/cisa/research/materials-and-online-research/research-material/")
        return

    # Try CSV first, then XLSX
    df = None
    for fname in ["isear.csv", "isear_dataSet.csv", "data.csv",
                  "isear.xlsx", "isear_dataSet.xlsx"]:
        fpath = os.path.join(raw_dir, fname)
        if os.path.exists(fpath):
            try:
                if fpath.endswith(".xlsx"):
                    df = pd.read_excel(fpath)
                else:
                    # ISEAR CSVs use pipe or comma delimiter
                    for sep in ["|", ",", ";"]:
                        try:
                            df = pd.read_csv(fpath, sep=sep, on_bad_lines="skip")
                            if df.shape[1] > 2:
                                break
                        except Exception:
                            continue
                print(f"  [isear] Loaded {fname} ({len(df)} rows, {df.shape[1]} cols)")
                break
            except Exception as e:
                print(f"  [isear] Failed to read {fname}: {e}")

    if df is None:
        print(f"[isear] Could not find or read a supported file in {raw_dir}")
        return

    text_col, emot_col = _find_columns(df)
    if emot_col is None:
        print("[isear] Could not detect emotion column - check file format.")
        return

    rows = []
    for _, row in df.iterrows():
        text = _clean_text(row[text_col])
        canonical = _resolve_emotion(row[emot_col])
        if canonical and len(text) > 5:
            rows.append({"text": text, "label": canonical, "source": "isear"})

    result = pd.DataFrame(rows)
    out_path = os.path.join(PROC_TEXT_DIR, "isear.csv")
    result.to_csv(out_path, index=False)
    print(f"[isear] Saved {len(result)} rows -> {out_path}")
    print(result["label"].value_counts().to_string())


if __name__ == "__main__":
    run()
