"""
pipeline/label_map.py
---------------------
Maps every source label from all 9 datasets to one of the 6 canonical emotions:
  [happy, sad, angry, fear, neutral, surprise]

Any label that resolves to None is DISCARDED during preprocessing.
"""

# -----------------------------------------------------------------------------
# GoEmotions  (27 labels)
# -----------------------------------------------------------------------------
GOEMOTIONS_MAP: dict[str, str | None] = {
    "admiration":       None,
    "amusement":        "happy",
    "anger":            "angry",
    "annoyance":        "angry",
    "approval":         None,
    "caring":           None,
    "confusion":        None,
    "curiosity":        None,
    "desire":           None,
    "disappointment":   "sad",
    "disapproval":      "angry",
    "disgust":          "disgust",
    "embarrassment":    "fear",
    "excitement":       "happy",
    "fear":             "fear",
    "gratitude":        "happy",
    "grief":            "sad",
    "joy":              "happy",
    "love":             "happy",
    "nervousness":      "fear",
    "neutral":          "neutral",
    "optimism":         "happy",
    "pride":            "happy",
    "realization":      None,
    "relief":           "happy",
    "remorse":          "sad",
    "sadness":          "sad",
    "surprise":         "surprise",
}

# ─────────────────────────────────────────────────────────────────────────────
# EmotionLines  (Friends + EmotionPush episode splits)
# ─────────────────────────────────────────────────────────────────────────────
EMOTIONLINES_MAP: dict[str, str | None] = {
    "anger":    "angry",
    "disgust":  "disgust",
    "fear":     "fear",
    "joy":      "happy",
    "neutral":  "neutral",
    "sadness":  "sad",
    "surprise": "surprise",
    "non-neutral": None,   # catch-all label in some splits
}

# ─────────────────────────────────────────────────────────────────────────────
# ISEAR  (7 original emotions)
# ─────────────────────────────────────────────────────────────────────────────
ISEAR_MAP: dict[str, str | None] = {
    "joy":     "happy",
    "fear":    "fear",
    "anger":   "angry",
    "sadness": "sad",
    "disgust": "disgust",
    "shame":   None,
    "guilt":   None,
}

# ─────────────────────────────────────────────────────────────────────────────
# RAVDESS  (filename emotion code → int → name)
# Code: 01=neutral 02=calm 03=happy 04=sad 05=angry 06=fearful 07=disgust 08=surprised
# ─────────────────────────────────────────────────────────────────────────────
RAVDESS_CODE_MAP: dict[int, str | None] = {
    1: "neutral",
    2: "neutral",   # calm → neutral
    3: "happy",
    4: "sad",
    5: "angry",
    6: "fear",
    7: "disgust",
    8: "surprise",
}

# ─────────────────────────────────────────────────────────────────────────────
# TESS  (folder name encodes emotion)
# ─────────────────────────────────────────────────────────────────────────────
TESS_MAP: dict[str, str | None] = {
    "angry":    "angry",
    "disgust":  "disgust",
    "fear":     "fear",
    "happy":    "happy",
    "neutral":  "neutral",
    "ps":       "surprise",   # "pleasant surprise"
    "sad":      "sad",
}

# ─────────────────────────────────────────────────────────────────────────────
# CREMA-D  (SummaryTable.csv  emotion column)
# ─────────────────────────────────────────────────────────────────────────────
CREMAD_MAP: dict[str, str | None] = {
    "ang": "angry",
    "dis": "disgust",
    "fea": "fear",
    "hap": "happy",
    "neu": "neutral",
    "sad": "sad",
}

# ─────────────────────────────────────────────────────────────────────────────
# FER-2013  (CSV integer labels)
# 0=Angry 1=Disgust 2=Fear 3=Happy 4=Sad 5=Surprise 6=Neutral
# ─────────────────────────────────────────────────────────────────────────────
FER2013_MAP: dict[int, str | None] = {
    0: "angry",
    1: "disgust",
    2: "fear",
    3: "happy",
    4: "sad",
    5: "surprise",
    6: "neutral",
}

# ─────────────────────────────────────────────────────────────────────────────
# AffectNet  (integer class labels used in annotations)
# 0=Neutral 1=Happy 2=Sad 3=Surprise 4=Fear 5=Disgust 6=Anger 7=Contempt
# ─────────────────────────────────────────────────────────────────────────────
AFFECTNET_MAP: dict[int, str | None] = {
    0: "neutral",
    1: "happy",
    2: "sad",
    3: "surprise",
    4: "fear",
    5: "disgust",
    6: "angry",
    7: None,        # contempt
}

# ─────────────────────────────────────────────────────────────────────────────
# RAF-DB  (list_patition_label.txt integer labels — 1-indexed)
# 1=Surprise 2=Fear 3=Disgust 4=Happy 5=Sad 6=Angry 7=Neutral
# ─────────────────────────────────────────────────────────────────────────────
RAFDB_MAP: dict[int, str | None] = {
    1: "surprise",
    2: "fear",
    3: "disgust",
    4: "happy",
    5: "sad",
    6: "angry",
    7: "neutral",
}

# ─────────────────────────────────────────────────────────────────────────────
# CK+ (Extended Cohn-Kanade) — folder names
# 0=anger 1=contempt 2=disgust 3=fear 4=happy 5=sadness 6=surprise
# ─────────────────────────────────────────────────────────────────────────────
CKPLUS_MAP: dict[str, str | None] = {
    "anger":    "angry",
    "contempt": None,
    "disgust":  "disgust",
    "fear":     "fear",
    "happy":    "happy",
    "sadness":  "sad",
    "surprise": "surprise",
}

# ─────────────────────────────────────────────────────────────────────────────
# SAVEE  (filename prefix: a=anger, d=disgust, f=fear, h=happy, n=neutral,
#                           sa=sad, su=surprise)
# ─────────────────────────────────────────────────────────────────────────────
SAVEE_MAP: dict[str, str | None] = {
    "a":  "angry",
    "d":  "disgust",
    "f":  "fear",
    "h":  "happy",
    "n":  "neutral",
    "sa": "sad",
    "su": "surprise",
}

# ─────────────────────────────────────────────────────────────────────────────
# SemEval-2018  (multi-label columns → primary dominant emotion)
# ─────────────────────────────────────────────────────────────────────────────
SEMEVAL_MAP: dict[str, str | None] = {
    "anger":      "angry",
    "anticipation": None,
    "disgust":    "disgust",
    "fear":       "fear",
    "joy":        "happy",
    "love":       "happy",
    "optimism":   "happy",
    "pessimism":  "sad",
    "sadness":    "sad",
    "surprise":   "surprise",
    "trust":      None,
}


def map_label(raw_label, mapping: dict) -> str | None:
    """
    Resolve *raw_label* using *mapping*.
    Returns canonical emotion string or None if the label should be discarded.
    Handles both string and integer keys; string keys are lowercased.
    """
    if isinstance(raw_label, str):
        raw_label = raw_label.strip().lower()
    return mapping.get(raw_label, None)
