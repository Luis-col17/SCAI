"""Carga imagenes desde diferentes origenes (URL de Cloudinary o data-URL base64).

Unifica la entrada para que el pipeline siempre reciba un array numpy BGR.
"""
import base64
import io
import re
from urllib.parse import urlparse

import cv2
import numpy as np
import requests

import config


class ImageSource:
    """Convierte un origen (URL o data-URL) en imagen numpy BGR."""

    _DATA_URL_RE = re.compile(r'^data:image/(?P<fmt>jpeg|jpg|png|webp);base64,(?P<b64>.+)$')

    @staticmethod
    def _validar_tamano_y_formato(data: bytes, fmt: str):
        if len(data) > config.MAX_IMAGE_BYTES:
            raise ValueError(f"Imagen demasiado grande ({len(data)} bytes, max {config.MAX_IMAGE_BYTES}).")
        if fmt.lower() not in config.FORMATOS_PERMITIDOS:
            raise ValueError(f"Formato no permitido: {fmt}. Permitidos: {config.FORMATOS_PERMITIDOS}")

    @classmethod
    def desde_data_url(cls, data_url: str) -> np.ndarray:
        """Convierte data URL base64 -> imagen numpy BGR."""
        m = cls._DATA_URL_RE.match(data_url.strip())
        if not m:
            raise ValueError("Data URL invalida. Esperado: data:image/<fmt>;base64,<b64>")

        fmt = m.group('fmt')
        b64 = m.group('b64')
        try:
            raw = base64.b64decode(b64, validate=True)
        except Exception as e:
            raise ValueError(f"Base64 invalido: {e}")

        cls._validar_tamano_y_formato(raw, fmt)
        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("No se pudo decodificar la imagen.")
        return img

    @classmethod
    def desde_url(cls, url: str) -> np.ndarray:
        """Descarga imagen desde URL (ej. Cloudinary) -> imagen numpy BGR."""
        try:
            resp = requests.get(url, timeout=10, stream=True)
            resp.raise_for_status()
        except Exception as e:
            raise ValueError(f"Error descargando imagen: {e}")

        # Detectar formato por Content-Type o extension
        ct = resp.headers.get('Content-Type', '')
        fmt = 'jpg'
        if 'png' in ct:
            fmt = 'png'
        elif 'webp' in ct:
            fmt = 'webp'
        else:
            path = urlparse(url).path
            if path.lower().endswith('.png'):
                fmt = 'png'
            elif path.lower().endswith('.webp'):
                fmt = 'webp'

        raw = resp.content
        cls._validar_tamano_y_formato(raw, fmt)
        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("No se pudo decodificar la imagen descargada.")
        return img

    @classmethod
    def cargar(cls, origen: str) -> np.ndarray:
        """Detecta si es data-URL o URL y delega."""
        if origen.startswith('data:'):
            return cls.desde_data_url(origen)
        return cls.desde_url(origen)