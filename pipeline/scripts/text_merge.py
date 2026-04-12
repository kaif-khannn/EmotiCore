"""
pipeline/text/merge_text.py
----------------------------
Merges goemotions.csv + emotionlines.csv + isear.csv + semeval2018_meta.csv,
balances classes, and writes the final text_dataset.csv.

Balancing strategy:
  - Undersample any class above TEXT_MAX_PER_CLASS
  - Oversample (synonym-replacement augmentation) any class below TEXT_MIN_PER_CLASS
"""

import os
import sys
import random
import re
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from pipeline.config import (
    PROC_TEXT_DIR, EMOTIONS, RANDOM_SEED,
    TEXT_MAX_PER_CLASS, TEXT_MIN_PER_CLASS
)

random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

# ── Simple synonym dict for lightweight text augmentation ───────────────────
SYNONYMS: dict[str, list[str]] = {
    "happy":   ["glad", "joyful", "pleased", "delighted", "content", "cheerful"],
    "good":    ["great", "excellent", "fine", "wonderful"],
    "sad":     ["unhappy", "sorrowful", "downcast", "miserable", "gloomy"],
    "bad":     ["terrible", "dreadful", "awful", "horrible"],
    "angry":   ["furious", "irritated", "enraged", "mad", "annoyed"],
    "scared":  ["frightened", "terrified", "afraid", "petrified"],
    "shocked": ["stunned", "amazed", "astonished", "surprised"],
    "feel":    ["sense", "experience", "notice"],
    "very":    ["extremely", "quite", "really", "deeply"],
}


def _augment_text(text: str, n: int = 1) -> list[str]:
    """Return n augmented copies via random synonym replacement."""
    words = text.split()
    augmented = []
    for _ in range(n):
        new_words = []
        for w in words:
            w_low = w.lower().rstrip(".,!?")
            if w_low in SYNONYMS and random.random() < 0.25:
                new_words.append(random.choice(SYNONYMS[w_low]))
            else:
                new_words.append(w)
        augmented.append(" ".join(new_words))
    return augmented


def run():
    sources = ["goemotions.csv", "emotionlines.csv", "isear.csv", "semeval2018_meta.csv"]
    frames = []
    for src in sources:
        path = os.path.join(PROC_TEXT_DIR, src)
        if os.path.exists(path):
            df = pd.read_csv(path)
            frames.append(df)
            print(f"  Loaded {src}: {len(df)} rows")
        else:
            print(f"  Skipping {src} (not found — run its preprocessor first)")

    if not frames:
        print("[merge_text] No processed text files found. Run individual preprocessors first.")
        return

    combined = pd.concat(frames, ignore_index=True)
    combined = combined[combined["label"].isin(EMOTIONS)].copy()
    combined = combined.drop_duplicates(subset=["text"]).reset_index(drop=True)
    print(f"\n[merge_text] Raw combined: {len(combined)} unique rows")
    print(combined["label"].value_counts().to_string())

    # ── Undersample over-represented classes ────────────────────────────────
    balanced_frames = []
    for emotion in EMOTIONS:
        subset = combined[combined["label"] == emotion]
        if len(subset) > TEXT_MAX_PER_CLASS:
            subset = subset.sample(TEXT_MAX_PER_CLASS, random_state=RANDOM_SEED)
        balanced_frames.append(subset)

    # ── Oversample under-represented classes (synonym augmentation) ─────────
    augmented_rows = []
    for emotion in EMOTIONS:
        subset = combined[combined["label"] == emotion]
        shortfall = TEXT_MIN_PER_CLASS - len(subset)
        if shortfall > 0 and len(subset) > 0:
            print(f"  Augmenting '{emotion}': need {shortfall} more samples")
            src_texts = subset["text"].tolist()
            for _ in range(shortfall):
                original = random.choice(src_texts)
                aug = _augment_text(original, 1)[0]
                augmented_rows.append({"text": aug, "label": emotion, "source": "augmented"})

    balanced = pd.concat(balanced_frames + [pd.DataFrame(augmented_rows)], ignore_index=True)
    balanced = balanced.sample(frac=1, random_state=RANDOM_SEED).reset_index(drop=True)

    out_path = os.path.join(PROC_TEXT_DIR, "text_dataset.csv")
    balanced.to_csv(out_path, index=False)
    print(f"\n[merge_text] Final dataset: {len(balanced)} rows -> {out_path}")
    print(balanced["label"].value_counts().to_string())


if __name__ == "__main__":
    run()
