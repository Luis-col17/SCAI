#!/usr/bin/env python3
"""
Demo en tiempo real: camara -> YuNet -> SFace -> MongoDB -> visualizacion.

Uso:
    python scripts/demo_camera_vectors.py [--threshold 0.45] [--camera 0] [--fps 30]
    Teclas: 'q' = salir, 'v' = toggle vector completo (8 vs 128 valores)
"""

import cv2
import numpy as np
import pymongo
import argparse
from pathlib import Path
import sys

# Añadir face_service al path para importar servicios
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.face_detector import FaceDetectorYuNet
from services.face_embedder import FaceEmbedder
import config


class DemoCameraVectors:
    """Demo en tiempo real: camara -> detector -> embedder -> MongoDB -> visualizacion."""

    def __init__(self, mongo_uri: str, db_name: str = "uniminuto_acceso", 
                 threshold: float = 0.45, show_full_vector: bool = False):
        self.threshold = threshold
        self.show_full_vector = show_full_vector

        # 1. Cargar modelos UNA sola vez
        self.detector = FaceDetectorYuNet()
        self.embedder = FaceEmbedder()

        # 2. Conectar a MongoDB y cargar usuarios con vectores
        self.client = pymongo.MongoClient(mongo_uri)
        self.db = self.client["uniminuto_acceso"]
        self._cargar_usuarios_con_vectores()

    def _cargar_usuarios_con_vectores(self):
        """Carga usuarios que tienen faceEmbeddings no vacíos."""
        cursor = self.db.users.find(
            {"faceEmbeddings": {"$exists": True, "$ne": []}},
            {"name": 1, "faceEmbeddings": 1, "documentId": 1, "role": 1}
        )
        self.usuarios = []
        for doc in cursor:
            # Convertir a arrays numpy para cálculo eficiente
            vectores = [np.array(v, dtype=np.float32) for v in doc["faceEmbeddings"]]
            self.usuarios.append({
                "name": doc.get("name", "Desconocido"),
                "documentId": doc.get("documentId", ""),
                "role": doc.get("role", ""),
                "vectores": vectores
            })
        print(f"[INFO] Usuarios con vectores cargados: {len(self.usuarios)}")

    @staticmethod
    def _cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
        """Distancia coseno: 0 = idénticos, 1 = opuestos."""
        if a.shape != b.shape:
            return 1.0
        dot = np.dot(a, b)
        na = np.linalg.norm(a)
        nb = np.linalg.norm(b)
        if na == 0 or nb == 0:
            return 1.0
        return 1.0 - dot / (na * nb)

    def _identificar(self, vector: np.ndarray) -> tuple:
        """Compara vector contra todos los usuarios. Retorna (nombre, distancia, role, docId)."""
        if not self.usuarios:
            return "Sin usuarios en BD", 1.0, "", ""

        mejor_dist = 1.0
        mejor_usuario = None

        for u in self.usuarios:
            for v in u["vectores"]:
                d = self._cosine_distance(vector, v)
                if d < mejor_dist:
                    mejor_dist = d
                    mejor_usuario = u

        if mejor_dist <= self.threshold and mejor_usuario:
            return (mejor_usuario["name"], mejor_dist, 
                    mejor_usuario.get("role", ""), 
                    mejor_usuario.get("documentId", ""))
        return "Desconocido", mejor_dist, "", ""

    def run(self, camera_index: int = 0, target_fps: int = 30):
        """Loop principal de cámara en tiempo real."""
        cap = cv2.VideoCapture(camera_index)
        if not cap.isOpened():
            raise RuntimeError(f"No se pudo abrir la cámara {camera_index}")

        # Configurar resolución para 30 FPS estables
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, target_fps)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reducir latencia

        print(f"[INFO] Cámara iniciada. Presiona 'q' para salir, 'v' para toggle vector completo.")

        frame_count = 0
        t0 = cv2.getTickCount()

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # 1. Detectar rostro principal
            rostro = self.detector.detectar_mayor(frame)

            if rostro is not None:
                x, y, w, h = [int(v) for v in rostro[:4]]
                recorte = frame[y:y+h, x:x+w]

                if recorte.size > 0:
                    # Extraer vector 128-d
                    vector = self.embedder.vectorizar(frame[y:y+h, x:x+w])

                    if vector is not None:
                        # Identificar contra MongoDB
                        nombre, dist, role, doc_id = self._identificar(vector)

                        # Dibujar bounding box
                        color = (0, 255, 0) if dist <= 0.45 else (0, 0, 255)
                        cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)

                        # Label principal
                        label = f"{nombre} ({1-dist:.2%})"
                        if dist <= 0.45:
                            label += f" • {role} • CC:{doc_id}"
                        cv2.putText(frame, label, (x, y-10),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                        # Vector (primeros 8 o completo)
                        if self.show_full_vector:
                            vec_str = " ".join(f"{v:.4f}" for v in vector)
                        else:
                            vec_str = " ".join(f"{v:.4f}" for v in vector[:8]) + " ..."
                        cv2.putText(frame, f"Vec: [{vec_str}]", (x, y+h+20),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255,255,255), 1)

            # FPS counter
            frame_count += 1
            if frame_count % 30 == 0:
                t1 = cv2.getTickCount()
                fps = 30 * cv2.getTickFrequency() / (t1 - t0)
                t0 = t1
                cv2.putText(frame, f"FPS: {fps:.1f}", (10, 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

            # Instrucciones en pantalla
            cv2.putText(frame, "q=salir | v=vector completo", (10, frame.shape[0]-10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200,200,200), 1)

            cv2.imshow("Demo Vectores Faciales - YuNet + SFace", frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('v'):
                self.show_full_vector = not self.show_full_vector
                print(f"[INFO] Vector completo: {'ON' if self.show_full_vector else 'OFF'}")

        cap.release()
        cv2.destroyAllWindows()
        self.client.close()


def main():
    parser = argparse.ArgumentParser(description="Demo camara -> YuNet+SFace -> MongoDB")
    parser.add_argument("--threshold", type=float, default=0.45, 
                       help="Umbral distancia coseno (default: 0.45)")
    parser.add_argument("--camera", type=int, default=0, 
                       help="Índice de cámara (default: 0)")
    parser.add_argument("--fps", type=int, default=30, 
                       help="FPS objetivo (default: 30)")
    args = parser.parse_args()

    # Leer MongoDB URI desde .env raíz (proyecto raíz = 3 niveles arriba desde scripts/)
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

    import os
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        print("[ERROR] MONGODB_URI no encontrado en .env")
        sys.exit(1)

    demo = DemoCameraVectors(
        mongo_uri=mongo_uri,
        threshold=args.threshold,
        show_full_vector=False
    )
    demo.run(camera_index=args.camera, target_fps=args.fps)


if __name__ == "__main__":
    main()