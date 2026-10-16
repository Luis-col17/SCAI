"""Configuracion central del servicio de reconocimiento facial.

Todo lo "ajustable" vive aqui: rutas de los modelos, umbrales de decision
y el tamano de imagen que usa la IA. Si hay que cambiar algo (otro modelo,
otro umbral), se toca SOLO este archivo."""

from pathlib import Path

# Carpeta donde vive este archivo (.../face_service)
BASE_DIR = Path(__file__).resolve().parent

# --- Rutas de los modelos de IA ---
# YuNet: DETECTA donde hay un rostro (devuelve un cuadrito).
MODELO_DETECTOR = BASE_DIR / "models" / "face_detection_yunet.onnx"
# SFace: CONVIERTE ese rostro en 128 numeros (su "huella digital").
MODELO_EMBEDDER = BASE_DIR / "models" / "face_recognition_sface.onnx"

# -- la configuracion del detecrot (Yunet) ---
#La IA analiza la imagen en parches de este tamaño
INPUT_SIZE_DETECTOR = (320, 320)
# Descarta detecciones con menos de esta confianza (0.6 = 60%)
SCORE_THRESHOLD = 0.6

# --- Configuracion del modelo de rostros (SFace) ---
# SFace siempre espera rostros recortados y enderezados a 112x112.
TAMANO_ROSTRO = (112, 112)
# Backend de OpenCV: 0 = DNN clasico (CPU). 1 = hal/opencl si lo necesitas.
BACKEND_ID = 0

# --- Limites de seguridad ---
# Tamano maximo de imagen que aceptamos (evita que nos manden un archivo gigante).
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
# Formatos de imagen permitidos.
FORMATOS_PERMITIDOS = {"jpeg", "jpg", "png", "webp"}