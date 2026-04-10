import numpy as np
import math
from datetime import datetime

def to_python_types(val):
    """
    Recursively convert numpy types, datetimes, and problematic floats 
    (NaN/Inf) to standard python types for JSON serialization.
    """
    if isinstance(val, dict):
        return {str(k): to_python_types(v) for k, v in val.items()}
    
    # Handle list-like objects including numpy arrays
    elif isinstance(val, (list, tuple, np.ndarray)):
        if hasattr(val, "tolist"):
            return to_python_types(val.tolist())
        return [to_python_types(x) for x in val]
    
    # Handle Numpy specific numeric types
    elif isinstance(val, (np.float32, np.float64, np.floating)):
        f_val = float(val)
        if math.isnan(f_val): return 0.0
        if math.isinf(f_val): return 999.9 if f_val > 0 else -999.9
        return f_val
    
    elif isinstance(val, (np.int32, np.int64, np.integer)):
        return int(val)
    
    elif isinstance(val, (np.bool_)):
        return bool(val)
    
    # Standard float handling (for NaN/Inf)
    elif isinstance(val, float):
        if math.isnan(val): return 0.0
        if math.isinf(val): return 999.9 if val > 0 else -999.9
        return val

    elif isinstance(val, datetime):
        return val.isoformat()
    
    # Handle complex objects/pydantic models if they haven't been converted
    elif hasattr(val, "dict") and callable(val.dict): # Pydantic v1
        return to_python_types(val.dict())
    elif hasattr(val, "model_dump") and callable(val.model_dump): # Pydantic v2
        return to_python_types(val.model_dump())
    elif hasattr(val, "__dict__"):
        return to_python_types(vars(val))
        
    return val
