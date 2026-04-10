import os
import sys
import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.utils import resample

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from pipeline.config import PROC_TEXT_DIR, RANDOM_SEED, REPO_ROOT

def run():
    csv_path = os.path.join(PROC_TEXT_DIR, "text_dataset.csv")
    model_dir = os.path.join(REPO_ROOT, "backend", "models", "assets")
    os.makedirs(model_dir, exist_ok=True)
    
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found. Run the text preprocessing pipeline first.")
        return
        
    print("Loading text dataset...")
    df = pd.read_csv(csv_path)
    df = df.dropna(subset=['text', 'label'])
    print(f"Loaded {len(df)} samples.")
    
    # Optional: Balance the dataset
    print("Balancing training data...")
    max_count = df['label'].value_counts().max()
    resampled_dfs = []
    for cls in df['label'].unique():
        cls_df = df[df['label'] == cls]
        resampled_dfs.append(resample(cls_df, replace=True, n_samples=max_count, random_state=RANDOM_SEED))
    
    balanced_df = pd.concat(resampled_dfs)
    X = balanced_df['text'].values
    y = balanced_df['label'].values
    
    print(f"Balanced X shape: {X.shape}")
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.1, random_state=RANDOM_SEED, stratify=y)
    
    print("Training robust local text classifier (TF-IDF + LogisticRegression)...")
    clf = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=25000, ngram_range=(1, 2))),
        ('lr', LogisticRegression(max_iter=1000, n_jobs=-1, class_weight='balanced'))
    ])
    
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    
    acc = accuracy_score(y_test, y_pred)
    print(f"\\nModel Accuracy: {acc:.2%}")
    print("\\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    model_data = {
        "pipeline": clf,
        "classes": clf.classes_
    }
    
    model_path = os.path.join(model_dir, "text_model.joblib")
    joblib.dump(model_data, model_path)
    
    print(f"\\nLocal text model exported to: {model_path}")

if __name__ == "__main__":
    run()
