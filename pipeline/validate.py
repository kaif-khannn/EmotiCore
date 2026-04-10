"""
pipeline/validate.py
---------------------
Cross-modality validation script.

Reads the three final processed CSVs and reports:
  - Sample count per emotion per modality
  - Overall distribution table
  - Missing or inconsistent labels
  - Saves report to datasets/processed/reports/validation_report.txt
  - Generates bar chart: datasets/processed/reports/distribution.png
"""

import os
import sys
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from pipeline.config import (
    PROC_TEXT_DIR, PROC_AUDIO_DIR, PROC_IMAGE_DIR,
    REPORT_DIR, EMOTIONS
)


def _load_dataset(path: str, name: str) -> pd.DataFrame | None:
    if not os.path.exists(path):
        print(f"  [MISSING] {name}: {path}")
        return None
    df = pd.read_csv(path)
    print(f"  [OK]      {name}: {len(df)} rows")
    return df


def _count_per_emotion(df: pd.DataFrame, modality: str) -> pd.Series:
    counts = df["label"].value_counts().reindex(EMOTIONS, fill_value=0)
    counts.name = modality
    return counts


def _flag_issues(df: pd.DataFrame, name: str) -> list[str]:
    issues = []
    missing_text = df["label"].isna().sum()
    if missing_text:
        issues.append(f"{name}: {missing_text} rows with missing labels")
    unknown = df[~df["label"].isin(EMOTIONS)]["label"].unique()
    if len(unknown):
        issues.append(f"{name}: unknown labels → {list(unknown)}")
    return issues


def run():
    print("\n" + "=" * 60)
    print("  EmotiCore  -  Multimodal Dataset Validation Report")
    print("=" * 60)

    # Load processed datasets
    text_df  = _load_dataset(os.path.join(PROC_TEXT_DIR,  "text_dataset.csv"),  "text")
    audio_df = _load_dataset(os.path.join(PROC_AUDIO_DIR, "audio_dataset.csv"), "audio")
    image_df = _load_dataset(os.path.join(PROC_IMAGE_DIR, "image_dataset.csv"), "image")

    # Build distribution table
    table_parts = {}
    all_issues = []

    for name, df in [("text", text_df), ("audio", audio_df), ("image", image_df)]:
        if df is not None:
            table_parts[name] = _count_per_emotion(df, name)
            all_issues.extend(_flag_issues(df, name))

    if not table_parts:
        print("\n[validate] No processed datasets found. Run the pipeline first.\n")
        return

    dist_table = pd.DataFrame(table_parts)
    dist_table.index.name = "emotion"
    dist_table["TOTAL"] = dist_table.sum(axis=1)

    print("\n-- Distribution Table ----------------------------------")
    print(dist_table.to_string())
    print(f"\nGrand total samples: {dist_table['TOTAL'].sum():,}")

    # Issues report
    print("\n-- Label Issues ----------------------------------------")
    if all_issues:
        for issue in all_issues:
            print(f"  !  {issue}")
    else:
        print("  OK  No missing or inconsistent labels detected.")

    # Write text report
    os.makedirs(REPORT_DIR, exist_ok=True)
    report_path = os.path.join(REPORT_DIR, "validation_report.txt")
    with open(report_path, "w") as f:
        f.write("EmotiCore — Multimodal Dataset Validation Report\n")
        f.write("=" * 60 + "\n\n")
        f.write("Distribution Table:\n")
        f.write(dist_table.to_string() + "\n")
        f.write(f"\nGrand total: {dist_table['TOTAL'].sum():,}\n\n")
        f.write("Label Issues:\n")
        if all_issues:
            for issue in all_issues:
                f.write(f"  - {issue}\n")
        else:
            f.write("  None detected.\n")

    print(f"\n  Report saved: {report_path}")

    # Optional: Generate bar chart if matplotlib is available
    try:
        import matplotlib.pyplot as plt

        plot_df = dist_table.drop(columns=["TOTAL"])
        ax = plot_df.plot(kind="bar", figsize=(14, 7), colormap="Set2",
                          title="EmotiCore — Samples per Emotion per Modality",
                          edgecolor="white", linewidth=0.5)
        ax.set_xlabel("Emotion")
        ax.set_ylabel("Sample Count")
        ax.legend(title="Modality")
        plt.tight_layout()
        chart_path = os.path.join(REPORT_DIR, "distribution.png")
        plt.savefig(chart_path, dpi=150)
        plt.close()
        print(f"  Chart saved : {chart_path}")
    except ImportError:
        print("  (matplotlib not installed — skipping chart generation)")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    run()
