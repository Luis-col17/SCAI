"""Clase que detecta rostros en una imagen usando el modelo YuNet.

YuNet NO identifica a quien es: solo dice "hay un rostro aqui" y devuelve
un recorte (el pedacito de imagen de la cara).
"""
import cv2
import numpy as np

import config


class FaceDetectorYuNet:
    """Detector de rostros basado en YuNet (OpenCV DNN + ONNX).

    Al crear el objeto se carga el modelo UNA vez en memoria. Por eso la
    creamos al arrancar el servidor y la reutilizamos para cada foto.
    """

    def __init__(self, ruta_modelo=None, score_threshold=None):
        ruta = ruta_modelo or config.MODELO_DETECTOR
        umbral = score_threshold if score_threshold is not None else config.SCORE_THRESHOLD

        if not ruta.exists():
            raise FileNotFoundError(f"No se encontro el modelo YuNet en: {ruta}")

        self._detector = cv2.FaceDetectorYN.create(
            str(ruta),
            "",                       # config vacio (los ONNX no lo necesitan)
            config.INPUT_SIZE_DETECTOR,
            umbral,
        )

    def detectar_rostros(self, imagen: np.ndarray) -> list:
        """Devuelve una lista de rostros detectados en la imagen.

        Cada rostro es un array de 15 numeros:
        [x, y, ancho, alto, puntaje, y10 puntos clave (ojos, nariz, boca...)]

        Vuelve lista vacia si no detecta ninguno.
        """
        if imagen is None or imagen.size == 0:
            return []

        alto, ancho = imagen.shape[:2]
        self._detector.setInputSize((ancho, alto))
        ok, rostros = self._detector.detect(imagen)

        if not ok or rostros is None:
            return []
        return [list(map(float, r)) for r in rostros]

    def detectar_mayor(self, imagen: np.ndarray):
        """Devuelve SOLO el rostro mas grande de la foto, o None si no hay.

        'Mayor' = el de mayor area (x*ancho*alto): es la persona principal
        de la foto, que es justo lo que nos interesa en un torniquete.
        """
        rostros = self.detectar_rostros(imagen)
        if not rostros:
            return None
        return max(rostros, key=lambda r: r[2] * r[3])