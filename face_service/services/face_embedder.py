"""Clase que convierte un rostro en su "huella digital" (vector de numeros).

Usa el modelo SFace: recibe el rostro ya recortado/enderezado y devuelve
128 numeros que describen su identidad. Rostros parecidos -> vectores parecidos.
"""
import cv2
import numpy as np

import config


class FaceEmbedder:
    """Genera embeddings de rostros usando SFace (OpenCV DNN + ONNX)."""

    def __init__(self, ruta_modelo=None):
        ruta = ruta_modelo or config.MODELO_EMBEDDER

        if not ruta.exists():
            raise FileNotFoundError(f"No se encontro el modelo SFace en: {ruta}")

        # En OpenCV 5.0 la firma es: create(modelo, config, backend_id, target_id)
        self._reconocedor = cv2.FaceRecognizerSF.create(
            str(ruta),
            "",
            config.BACKEND_ID,
            0,
        )

    def _normalizar(self, vector: np.ndarray) -> np.ndarray:
        """Divide el vector por su propia longitud para que mida exactamente 1.

        Sin esto, comparar vectores es mas dificil. Normalizado, la distancia
        coseno entre dos rostroscafe va de 0 (identicos) a 2 (opuestos), y
        se puede decidir "es la misma persona" con un umbral simple.
        """
        norma = np.linalg.norm(vector)
        if norma == 0:
            return vector
        return vector / norma

    def vectorizar(self, rostro: np.ndarray) -> np.ndarray:
        """Convierte un rostro (112x112) en un vector de numeros normalizado.

        rostro: imagen BGR del rostro ya enderezado (lo produce el detector).
        Devuelve: array numpy de 128 floats, de norma 1.
        """
        if rostro is None or rostro.size == 0:
            return None

        # Aseguramos el tamano que SFace espera (112x112).
        if rostro.shape[:2] != config.TAMANO_ROSTRO:
            rostro = cv2.resize(rostro, config.TAMANO_ROSTRO)

        # SFace devuelve forma (1, 128): aplanamos a (128,).
        vector = self._reconocedor.feature(rostro)[0]

        # Normalizamos para que la comparacion por coseno sea exacta.
        return self._normalizar(vector)