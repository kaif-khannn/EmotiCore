import joblib
scaler_path = r"backend\models\assets\audio_scaler.joblib"
try:
    scaler = joblib.load(scaler_path)
    if hasattr(scaler, "n_features_in_"):
        print(f"Scaler expects features: {scaler.n_features_in_}")
    else:
        print("n_features_in_ not set, checking scaler.mean_ shape")
        print(f"Scaler mean shape: {scaler.mean_.shape}")
except Exception as e:
    print(f"Error: {e}")
