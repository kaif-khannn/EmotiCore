import sqlite3
import os
import pandas as pd
import sys

# Add root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from pipeline.config import PROC_TEXT_DIR, PROC_AUDIO_DIR, PROC_IMAGE_DIR

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "datasets", "feedback", "feedback.db")

def integrate_text_feedback(samples):
    csv_path = os.path.join(PROC_TEXT_DIR, "text_dataset.csv")
    if not os.path.exists(csv_path):
        print("Text dataset not found, skipping integration.")
        return
    
    df = pd.read_csv(csv_path)
    new_rows = []
    for s in samples:
        new_rows.append({"text": s[3], "label": s[5]}) # raw_input is s[3], corrected is s[5]
    
    df_new = pd.DataFrame(new_rows)
    df_combined = pd.concat([df, df_new], ignore_index=True)
    df_combined.to_csv(csv_path, index=False)
    print(f"Integrated {len(new_rows)} text samples.")

def main():
    if not os.path.exists(DB_PATH):
        print("No feedback database found.")
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Get unintegrated samples
    c.execute("SELECT * FROM feedback_samples WHERE integrated = 0")
    samples = c.fetchall()
    
    if not samples:
        print("No new feedback samples to integrate.")
        return

    text_samples = [s for s in samples if s[1] == 'text']
    audio_samples = [s for s in samples if s[1] == 'audio']
    image_samples = [s for s in samples if s[1] == 'image']

    if text_samples:
        integrate_text_feedback(text_samples)
    
    # Update DB status
    c.execute("UPDATE feedback_samples SET integrated = 1 WHERE integrated = 0")
    conn.commit()
    conn.close()
    
    print("Integration complete. Run training scripts to apply changes.")

if __name__ == "__main__":
    main()
