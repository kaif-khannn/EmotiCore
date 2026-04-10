"""
pipeline/run_all.py
--------------------
Master orchestration script — runs the full pipeline end to end.

Usage:
  python pipeline/run_all.py [--modality text|audio|image|all]

Pass --modality to run only one branch (default: all).
"""

import argparse
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

def run_text():
    print("\n" + "-" * 50)
    print("  TEXT MODALITY")
    print("-" * 50)
    from pipeline.text.preprocess_goemotions  import run as go
    from pipeline.text.preprocess_emotionlines import run as el
    from pipeline.text.preprocess_isear       import run as is_
    from pipeline.text.merge_text             import run as mt
    go(); el(); is_(); mt()


def run_audio():
    print("\n" + "-" * 50)
    print("  AUDIO MODALITY")
    print("-" * 50)
    from pipeline.audio.preprocess_ravdess import run as rv
    from pipeline.audio.preprocess_tess    import run as ts
    from pipeline.audio.preprocess_cremad  import run as cr
    from pipeline.audio.merge_audio        import run as ma
    rv(); ts(); cr(); ma()


def run_image():
    print("\n" + "-" * 50)
    print("  IMAGE MODALITY")
    print("-" * 50)
    from pipeline.image.preprocess_fer2013   import run as f2
    from pipeline.image.preprocess_affectnet import run as an
    from pipeline.image.preprocess_rafdb     import run as rb
    from pipeline.image.merge_image          import run as mi
    f2(); an(); rb(); mi()


def run_validate():
    print("\n" + "-" * 50)
    print("  VALIDATION")
    print("-" * 50)
    from pipeline.validate import run as vl
    vl()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EmotiCore Dataset Pipeline")
    parser.add_argument("--modality", choices=["text", "audio", "image", "all"],
                        default="all", help="Which modality to process (default: all)")
    args = parser.parse_args()

    if args.modality in ("text", "all"):
        run_text()
    if args.modality in ("audio", "all"):
        run_audio()
    if args.modality in ("image", "all"):
        run_image()

    # Always validate at the end
    run_validate()

    print("\nDONE: Pipeline complete.\n")
