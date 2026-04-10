import sys
import os
# Ensure we map the current directory
sys.path.append(os.getcwd())

from routes.api import router

print("Routes in api_router:")
for route in router.routes:
    print(f"Path: {route.path}, Name: {route.name}")
