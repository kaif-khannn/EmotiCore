import os
import tensorflow as tf
from tensorflow.keras import layers, models, applications

# Same architecture as train_image.py
def build_model():
    base_model = applications.MobileNetV2(input_shape=(96, 96, 3), include_top=False, weights="imagenet")
    model = models.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.Dropout(0.3),
        layers.Dense(7, activation="softmax")
    ])
    return model

h5_path = r"backend\models\assets\image_model_checkpoint.weights.h5"
keras_path = r"backend\models\assets\image_model.keras"

print(f"Loading weights from {h5_path}...")
model = build_model()
model.load_weights(h5_path)
print(f"Saving format to {keras_path}...")
model.save(keras_path)
print("Conversion successful!")
