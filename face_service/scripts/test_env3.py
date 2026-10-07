from pathlib import Path
from dotenv import load_dotenv
import os

# This simulates demo_camera_vectors.py location
script_path = Path(r"C:\Users\losor\Desktop\proyecto entrada\SCAI - horizon\face_service\scripts\demo_camera_vectors.py").resolve()
env_path = script_path.parent.parent.parent / ".env"

print(f"Script: {script_path}")
print(f"Env path: {env_path}")
print(f"Exists: {env_path.exists()}")

load_dotenv(env_path)
import os
print(f"MONGODB_URI: {os.getenv('MONGODB_URI')}")