"""
train_image.py - High-accuracy image emotion classifier (CPU Optimized).
Uses MobileNetV2 with fine-tuning, class weighting, data augmentation,
to maximize performance across all 7 emotion classes.
"""
import os
import sys
import pandas as pd
import numpy as np

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

try:
    import tensorflow as tf
    from tensorflow.keras import layers, models, applications, callbacks, optimizers
except ImportError:
    print("TensorFlow not installed. Please install tensorflow to train image models.")
    sys.exit(1)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from pipeline.config import PROC_IMAGE_DIR, RANDOM_SEED, REPO_ROOT, IMAGE_SIZE, EMOTIONS

def run():
    csv_path = os.path.join(PROC_IMAGE_DIR, "image_dataset.csv")
    model_dir = os.path.join(REPO_ROOT, "backend", "models", "assets")
    os.makedirs(model_dir, exist_ok=True)

    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found. Run the image preprocessing pipeline first.")
        return

    print("Loading image dataset metadata...")
    df = pd.read_csv(csv_path)
    label_map = {emotion: idx for idx, emotion in enumerate(EMOTIONS)}

    df["full_path"] = df["image_path"].apply(lambda p: os.path.join(PROC_IMAGE_DIR, p))
    df = df[df["full_path"].apply(os.path.exists)].copy()
    df = df[df["label"].isin(EMOTIONS)].copy()
    df["label_idx"] = df["label"].map(label_map)

    print(f"Found {len(df)} valid images.")
    if len(df) == 0:
        return

    # --- Compute class weights ---
    counts = df["label_idx"].value_counts().sort_index()
    total = len(df)
    n_classes = len(EMOTIONS)
    class_weight = {i: total / (n_classes * cnt) for i, cnt in counts.items()}

    # MobileNetV2 works great at (96, 96)
    IMG_SIZE = (96, 96)

    train_df = df.sample(frac=0.8, random_state=RANDOM_SEED)
    val_df = df.drop(train_df.index)

    def augment(image, label):
        image = tf.image.random_flip_left_right(image)
        image = tf.image.random_brightness(image, max_delta=0.1)
        return image, label

    def parse_image(filename, label):
        image = tf.io.read_file(filename)
        image = tf.image.decode_png(image, channels=3)
        image = tf.image.resize(image, IMG_SIZE)
        image = tf.keras.applications.mobilenet_v2.preprocess_input(image)
        return image, label

    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = (
        tf.data.Dataset.from_tensor_slices((train_df["full_path"].values, train_df["label_idx"].values))
        .map(parse_image, num_parallel_calls=AUTOTUNE)
        .map(augment, num_parallel_calls=AUTOTUNE)
        .shuffle(1000).batch(16).prefetch(AUTOTUNE)
    )
    val_ds = (
        tf.data.Dataset.from_tensor_slices((val_df["full_path"].values, val_df["label_idx"].values))
        .map(parse_image, num_parallel_calls=AUTOTUNE)
        .batch(16).prefetch(AUTOTUNE)
    )

    print("\nBuilding MobileNetV2 (CPU Optimized)...")
    base_model = applications.MobileNetV2(input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3), include_top=False, weights="imagenet")
    base_model.trainable = True
    # Freeze first 100 layers
    for layer in base_model.layers[:100]:
        layer.trainable = False

    model = models.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.Dropout(0.3),
        layers.Dense(len(EMOTIONS), activation="softmax")
    ])

    model.compile(optimizer=optimizers.Adam(1e-4), loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    
    checkpoint_path = os.path.join(model_dir, "image_model_checkpoint.weights.h5")
    if os.path.exists(checkpoint_path):
        print(f"Loading existing checkpoint weights: {checkpoint_path}")
        model.load_weights(checkpoint_path)

    cb = [
        callbacks.EarlyStopping(patience=2, restore_best_weights=True, monitor="val_accuracy"),
        callbacks.ReduceLROnPlateau(patience=1, factor=0.5, monitor="val_accuracy"),
        callbacks.ModelCheckpoint(filepath=checkpoint_path, save_weights_only=True, save_best_only=True, monitor="val_accuracy")
    ]


    print("Starting training (Phase 1)...")
    model.fit(train_ds, validation_data=val_ds, epochs=5, class_weight=class_weight, callbacks=cb)



    model_path = os.path.join(model_dir, "image_model.h5")
    model.save(model_path)
    print(f"\nModel exported to: {model_path}")

if __name__ == "__main__":
    run()
