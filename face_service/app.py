"""Servicio de reconocimiento facial del sistema de control de acceso.

Endpoints:
  GET  /health  -> prueba de vida del servicio
  POST /embed   -> recibe imagenes y devuelve vectores de rostros
"""
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import config
from services.image_source import ImageSource
from services.pipeline import FacePipeline

app = FastAPI(title="Servicio IA Facial")

# Modelos cargados UNA vez al arrancar (y no por peticion).
pipeline = FacePipeline()


class EmbedRequest(BaseModel):
    images: list[str]


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "face-recognition",
        "model": "yunet + sface (128 dim)",
    }


@app.post("/embed")
def embed(datos: EmbedRequest):
    if not datos.images:
        raise HTTPException(status_code=400, detail="Se esperaba al menos una imagen.")

    try:
        imagenes = [ImageSource.cargar(origen) for origen in datos.images]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=502, detail="No se pudo descargar una imagen.")

    vectores = pipeline.procesar_lote(imagenes)

    # Convertimos a listas de float para que FastAPI las serialize a JSON.
    return {"vectors": [None if v is None else [float(n) for n in v] for v in vectores]}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)