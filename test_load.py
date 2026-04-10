import os
import tensorflow as tf

local_path = r"d:\miniproject\backend\models\assets\image_model.h5"
print(f"Checking path: {local_path}")
print(f"File exists: {os.path.exists(local_path)}")

if os.path.exists(local_path):
    try:
        model = tf.keras.models.load_model(local_path)
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Failed to load: {e}")
else:
    print("File not found at specified path.")
