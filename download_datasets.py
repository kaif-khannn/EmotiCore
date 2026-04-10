import os
os.environ['HF_HOME'] = 'd:/huggingface_cache'
os.environ['KAGGLE_CONFIG_DIR'] = 'd:/.kaggle'
import requests
import shutil
import zipfile
import io
import pandas as pd
from tqdm import tqdm
import kagglehub
from datasets import load_dataset
from huggingface_hub import hf_hub_download

# Configuration
REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
RAW_ROOT = os.path.join(REPO_ROOT, "datasets", "raw")

DATASET_PATHS = {
    "text": os.path.join(RAW_ROOT, "text"),
    "audio": os.path.join(RAW_ROOT, "audio"),
    "image": os.path.join(RAW_ROOT, "image"),
}

# Ensure directories exist
for path in DATASET_PATHS.values():
    os.makedirs(path, exist_ok=True)

def download_file(url, dest_path):
    print(f"Downloading {url} to {dest_path}...")
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f" DONE")
    except Exception as e:
        print(f" FAILED: {e}")

def main():
    print("--- EmotiCore Multi-Source Dataset Downloader (Final Fix) ---")

    # 1-3. GoEmotions, ISEAR, RAVDESS, TESS (Already verified READY in previous steps)
    
    # 4. EmotionLines (Replacing with MELD CSVs)
    el_dir = os.path.join(DATASET_PATHS["text"], "emotionlines")
    os.makedirs(el_dir, exist_ok=True)
    meld_urls = {
        "train": "https://raw.githubusercontent.com/declare-lab/MELD/master/data/MELD/train_sent_emo.csv",
        "dev": "https://raw.githubusercontent.com/declare-lab/MELD/master/data/MELD/dev_sent_emo.csv",
        "test": "https://raw.githubusercontent.com/declare-lab/MELD/master/data/MELD/test_sent_emo.csv"
    }
    for split, url in meld_urls.items():
        dest = os.path.join(el_dir, f"meld_{split}.csv")
        if not os.path.exists(dest):
            download_file(url, dest)

    # 6. CREMA-D (Download AudioWAV from Hugging Face)
    cremad_dir = os.path.join(DATASET_PATHS["audio"], "cremad")
    os.makedirs(cremad_dir, exist_ok=True)
    
    if not os.path.exists(os.path.join(cremad_dir, "AudioWAV")) or not os.listdir(os.path.join(cremad_dir, "AudioWAV")):
        print("Downloading CREMA-D audio via Hugging Face...")
        try:
            # We'll download the AudioWAV.zip from a known mirror
            zip_path = hf_hub_download(repo_id="MahiA/CREMA-D", filename="AudioWAV.zip", local_dir=cremad_dir)
            print(f" Extracting {zip_path}...")
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(cremad_dir)
            print(" DONE")
        except Exception as e:
            print(f" ERROR: {e}")

    # Summary table mirror (alternative)
    crema_csv_url = "https://raw.githubusercontent.com/CheyneyComputerScience/CREMA-D/master/SummaryTable.csv"
    dest_csv = os.path.join(cremad_dir, "SummaryTable.csv")
    if not os.path.exists(dest_csv):
        download_file(crema_csv_url, dest_csv)

    # 7. FER2013 (Already verified READY via HF)
    
    # 8. SemEval-2018 Task 1 (Twitter Emotions)
    semeval_dir = os.path.join(DATASET_PATHS["text"], "semeval2018")
    os.makedirs(semeval_dir, exist_ok=True)
    if not os.path.exists(os.path.join(semeval_dir, "train.csv")):
        print("Downloading SemEval-2018 via Hugging Face...")
        try:
            ds = load_dataset("sem_eval_2018_task_1", "subtask5.english")
            ds['train'].to_pandas().to_csv(os.path.join(semeval_dir, "train.csv"), index=False)
            ds['validation'].to_pandas().to_csv(os.path.join(semeval_dir, "dev.csv"), index=False)
            ds['test'].to_pandas().to_csv(os.path.join(semeval_dir, "test.csv"), index=False)
            print(" DONE")
        except Exception as e:
            print(f" ERROR: {e}")
            
    print("\n--- Manual Datasets Notice ---")
    print("NOTE: IEMOCAP, MSP-Podcast, and CMU-MOSEI require ")
    print("academic EULA agreements and cannot be downloaded via an automated script.")
    print("Once approved, place their raw folders under:")
    print("  - datasets/raw/audio/msp-podcast")
    print("  - datasets/raw/[fusion]/cmu-mosei")

    # 9. CK+ (Extended Cohn-Kanade) via Hugging Face
    ckplus_dir = os.path.join(DATASET_PATHS["image"], "ckplus")
    ckplus_images_dir = os.path.join(ckplus_dir, "images")
    os.makedirs(ckplus_images_dir, exist_ok=True)
    marker = os.path.join(ckplus_dir, "ckplus_downloaded.flag")
    if not os.path.exists(marker):
        print("Downloading CK+ dataset via Hugging Face (AlirezaF138/ckplus-dataset)...")
        try:
            import cv2
            ckplus_ds = load_dataset("AlirezaF138/ckplus-dataset")
            split = ckplus_ds.get("train", list(ckplus_ds.values())[0])
            for i, example in enumerate(split):
                label = str(example.get("label", example.get("emotion", "unknown")))
                img = example.get("image") or example.get("img")
                if img is None:
                    continue
                label_dir = os.path.join(ckplus_images_dir, label)
                os.makedirs(label_dir, exist_ok=True)
                img_path = os.path.join(label_dir, f"{i}.png")
                img.save(img_path)
            open(marker, 'w').close()
            print(" DONE")
        except Exception as e:
            print(f" ERROR: {e}")
    
    print("\n--- Summary ---")
    print("Run 'python pipeline/run_all.py' to begin sequence.")

if __name__ == "__main__":
    main()
