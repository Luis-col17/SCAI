"""Orquesta el proceso completo: foto -> rostro -> vector.

Esta clase es el CORAZON del servicio. Aqui se cargan los modelos UNA sola
vez (al crear el objeto) y despues se reutilizan para cada foto. Cargar los
modelos cuesta ~200 ms, asi que hacerlo por foto seria lentisimo.
"""
import cv2
import numpy as np

import config
from services.face_detector import FaceDetectorYuNet
from services.face_embedder import FaceEmbedder


class FacePipeline:
    """Coordina deteccion y generacion de vectores de rostros."""

    def __init__(self):
        # Los dos modelos se cargan aqui, una unica vez.
        self._detector = FaceDetectorYuNet()
        self._embedder = FaceEmbedder()

    def procesar_imagen(self, imagen: np.ndarray):
        """Procesa UNA imagen y devuelve su vector, o None si no hay rostro."""
        if imagen is None or imagen.size == 0:
            return None

        rostro = self._detector.detectar_mayor(imagen)
        if rostro is None:
            return None

        # rostro es una lista de 15 floats: [x, y, w, h, puntaje, ...puntos clave]
        x, y, w, h = [int(v) for v in rostro[:4]]
        recorte = imagen[y:y + h, x:x + w]

        if recorte.size == 0:
            return None

        return self._embedder.vectorizar(recorte)

    def procesar_lote(self, imagenes: list) -> list:
        """Procesa varias imagenes y devuelve una lista de vectores.

        Mantiene el orden: si imagenes[2] no tiene rostro, su posicion en el
        resultado sera None. Asi Node sabe exactamente cual foto fallo.
        """
        vectores = []
        for imagen in imagenes:
            try:
                vectores.append(self.procesar_imagen(imagen))
            except Exception:
                vectores.append(None)
        return vectores