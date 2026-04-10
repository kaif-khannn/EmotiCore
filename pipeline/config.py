"""
pipeline/config.py
------------------
Central configuration for the multimodal emotion dataset pipeline.
Edit this file to change paths, audio parameters, or image sizes.
"""
import os

# -- Root paths --------------------------------------------------------------
REPO_ROOT   = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW_ROOT    = os.path.join(REPO_ROOT, "datasets", "raw")
PROC_ROOT   = os.path.join(REPO_ROOT, "datasets", "processed")
REPORT_DIR  = os.path.join(PROC_ROOT, "reports")

# -- Per-modality raw data directories ---------------------------------------
RAW_TEXT_DIR    = os.path.join(RAW_ROOT, "text")
RAW_AUDIO_DIR   = os.path.join(RAW_ROOT, "audio")
RAW_IMAGE_DIR   = os.path.join(RAW_ROOT, "image")

# Expected sub-directories inside RAW_TEXT_DIR / RAW_AUDIO_DIR / RAW_IMAGE_DIR
DATASET_DIRS = {
    # TEXT
    "goemotions":    os.path.join(RAW_TEXT_DIR,  "goemotions"),
    "emotionlines":  os.path.join(RAW_TEXT_DIR,  "emotionlines"),
    "isear":         os.path.join(RAW_TEXT_DIR,  "isear"),
    "semeval2018":   os.path.join(RAW_TEXT_DIR,  "semeval2018"),
    # AUDIO
    "ravdess":       os.path.join(RAW_AUDIO_DIR, "ravdess"),
    # IMAGE
    "fer2013":       os.path.join(RAW_IMAGE_DIR, "fer2013"),
    "affectnet":     os.path.join(RAW_IMAGE_DIR, "affectnet"),
    "rafdb":         os.path.join(RAW_IMAGE_DIR, "rafdb"),
    "ckplus":        os.path.join(RAW_IMAGE_DIR, "ckplus"),
}

# -- Processed output directories --------------------------------------------
PROC_TEXT_DIR    = os.path.join(PROC_ROOT, "text")
PROC_AUDIO_DIR   = os.path.join(PROC_ROOT, "audio")
PROC_AUDIO_FEAT  = os.path.join(PROC_AUDIO_DIR, "features")
PROC_IMAGE_DIR   = os.path.join(PROC_ROOT, "image")

# -- Canonical emotion labels -------------------------------------------------
EMOTIONS = ["happy", "sad", "angry", "fear", "neutral", "surprise", "disgust"]

# -- Audio feature extraction -------------------------------------------------
AUDIO_SAMPLE_RATE   = 22050
AUDIO_N_MFCC        = 40          # number of MFCC coefficients
AUDIO_N_MELS        = 128         # mel spectrogram bands
AUDIO_HOP_LENGTH    = 512
AUDIO_MAX_FRAMES    = 300         # pad / truncate to this many frames
AUDIO_USE_DELTA     = True        # append Delta and Delta-Delta (triples feature size)

# -- Image parameters ---------------------------------------------------------
IMAGE_SIZE          = (48, 48)    # final crop size fed into models
IMAGE_FACE_SCALE    = 1.1
IMAGE_FACE_MIN_NBRS = 5

# -- Balancing ----------------------------------------------------------------
# Maximum samples per class after balancing (None = no cap)
TEXT_MAX_PER_CLASS  = 15_000
AUDIO_MAX_PER_CLASS = 3_000
IMAGE_MAX_PER_CLASS = 15_000

# Minimum samples per class; classes below this are oversampled
TEXT_MIN_PER_CLASS  = 5_000
AUDIO_MIN_PER_CLASS = 1_000
IMAGE_MIN_PER_CLASS = 5_000

# Random seed for reproducibility
RANDOM_SEED = 42

# -- Ensure all output dirs exist ---------------------------------------------
for _d in [PROC_TEXT_DIR, PROC_AUDIO_DIR, PROC_AUDIO_FEAT, PROC_IMAGE_DIR, REPORT_DIR]:
    os.makedirs(_d, exist_ok=True)
