# SEXTO INFORME DE CAMBIOS

> **Proyecto:** Sistema de Control de Acceso — UNIMINUTO Sede Ibagué
> **Directorio del proyecto:** `C:\Users\losor\Desktop\proyecto entrada\SCAI - horizon`
> **Fecha:** 2026-10-06
> **Informes anteriores:** `cambios_informe/INFORME_DE_CAMBIOS.md` (#01–#02), `cambios_informe/SEGUNDO_INFORME_DE_CAMBIOS.md` (#03–#04), `cambios_informe/TERCER_INFORME_DE_CAMBIOS.md` (#05–#13), `cambios_informe/CUARTO_INFORME_DE_CAMBIOS.md` (#14–#25), `cambios_informe/QUINTO_INFORME_DE_CAMBIOS.md` (#26–#28)
> **Cambios de este documento:** #29 a #34
> **Alcance:** servicio Python de visión artificial (YuNet + SFace), integración Node ↔ Python, enrolamiento facial real con vectores biométricos, verificación facial con decisión biométrica, bitácora y alerta al celador, y script demo standalone de cámara en tiempo real.

---

## Índice de cambios

| # | Cambio | Área |
|---|---|---|
| #29 | Servicio Python de embeddings faciales (YuNet + SFace, arquitectura por capas) | Visión Artificial |
| #30 | Integración Node ↔ Python (`/embed` + `identifyFace()`) | Backend / Integración |
| #31 | Enrolamiento facial real: fotos + vectores en MongoDB | Biometría / Datos |
| #32 | Verificación facial real: decisión biométrica + bitácora + alerta celador | Biometría / Seguridad |
| #33 | Script demo standalone `demo_camera_vectors.py` (cámara en tiempo real, 30 FPS, identificación 1:N) | Visión Artificial / Demo |
| #34 | Enrolamiento facial guiado: poses, delay 1s, modal recomendaciones, mínimo 3 fotos | Frontend / Biometría / UX |

---

## 1. Cambio #29 — "Servicio Python de embeddings faciales (YuNet + SFace)"

### 1.1 Contexto
El reconocimiento facial hasta ahora era una **simulación**: el endpoint `POST /api/recognition/verify-face` recibía un `matchedUserId` del navegador y fabricaba una certeza aleatoria. No había ningún modelo de visión artificial ni inferencia real.

### 1.2 Solución: arquitectura por capas en `face_service/`
Se creó un microservicio Python independiente (FastAPI + OpenCV DNN + ONNX Runtime) con arquitectura por capas y responsabilidad única:

```
face_service/
├── app.py                      # FastAPI: endpoints /health y POST /embed
├── config.py                   # Rutas de modelos, umbrales, límites
├── services/
│   ├── __init__.py
│   ├── face_detector.py        # FaceDetectorYuNet: detecta rostros (YuNet ONNX)
│   ├── face_embedder.py        # FaceEmbedder: rostro → vector 128-d normalizado (SFace ONNX)
│   ├── image_source.py         # ImageSource: data-URL o URL Cloudinary → numpy BGR
│   └── pipeline.py             # FacePipeline: orquesta detector + embedder (modelos 1 vez)
├── models/
│   ├── face_detection_yunet.onnx       # 232 KB (YuNet oficial OpenCV)
│   └── face_recognition_sface.onnx     # 37 MB  (SFace oficial OpenCV)
├── scripts/demo_camera_vectors.py       # Demo tiempo real: cámara → YuNet+SFace → MongoDB
├── requirements.txt            # fastapi, uvicorn, opencv-python, numpy, requests, pymongo, python-dotenv
└── .venv/                      # Python 3.12.10 + dependencias
```

**Principios de diseño (para la defensa):**
- **Modelos cargados UNA vez** al arrancar (`FacePipeline.__init__`), no por petición (~200 ms de ahorro por foto).
- **Separación de responsabilidades**: detector ≠ embedder ≠ orquestador ≠ endpoint.
- **Normalización de vectores** a norma 1.0 → distancia coseno trivial y segura.
- **Entrada unificada**: `ImageSource.cargar()` acepta `data:image/...;base64,` y URLs HTTPS (Cloudinary) → mismo pipeline.

### 1.3 Modelos elegidos
| Modelo | Función | Tamaño | Fuente |
|---|---|---|---|
| **YuNet** (`face_detection_yunet.onnx`) | Detección de rostro (bounding box + 5 landmarks) | 232 KB | OpenCV Zoo (oficial) |
| **SFace** (`face_recognition_sface.onnx`) | Embedding 128-d (familia ArcFace) | 37 MB | OpenCV Zoo (oficial) |

> **Por qué no MobileFaceNet 512-d / ArcFace:** el modelo oficial vive dentro de un ZIP de 330 MB (`buffalo_l.zip` de InsightFace). SFace da 128-d nativamente, descarga directa, y es suficiente para 1:1 y 1:N con umbral 0.45. OpenCV `cv2.FaceRecognizerSF` lo ejecuta en CPU sin ONNX Runtime extra.

### 1.4 Endpoint expuesto
```
POST http://127.0.0.1:8000/embed
Content-Type: application/json
{ "images": ["data:image/jpeg;base64,...", "https://res.cloudinary.com/..."] }

→ { "vectors": [ [128 floats], null, [128 floats] ] }
```
- Longitud de `vectors` = longitud de `images`.
- `null` cuando la imagen no tiene rostro detectable.
- Timeout 8 s, límite 10 MB, formatos JPEG/PNG/WEBP.

### 1.5 Archivos creados
- `face_service/config.py`
- `face_service/services/face_detector.py`
- `face_service/services/face_embedder.py`
- `face_service/services/pipeline.py`
- `face_service/services/image_source.py`
- `face_service/app.py`
- `face_service/scripts/demo_camera_vectors.py`
- `face_service/requirements.txt` (actualizado)
- `face_service/models/face_detection_yunet.onnx` (descargado y verificado)
- `face_service/models/face_recognition_sface.onnx` (descargado y verificado)

---

## 2. Cambio #30 — "Integración Node ↔ Python"

### 2.1 Variables de entorno (`.env`)
```env
FACE_SERVICE_URL="http://127.0.0.1:8000"
FACE_SERVICE_TIMEOUT_MS=8000
FACE_MATCH_THRESHOLD=0.45
```

### 2.2 `src/lib/faceService.ts` — nuevas funciones
- **`identifyFace(snapshotUrl: string)`**: flujo completo 1:N
  1. Sube snapshot a Cloudinary (ya lo hace el front antes de llamar).
  2. `requestFaceEmbeddings([snapshotUrl])` → 1 vector 128-d.
  3. `getAllUsersWithEmbeddings()` → todos los usuarios con `faceEmbeddings.length > 0`.
  4. Compara el vector contra **TODOS los vectores de TODOS los usuarios** (coseno).
  5. Gana el de menor distancia; si ≤ `FACE_MATCH_THRESHOLD` → match, sino `null`.
- **`getAllUsersWithEmbeddings()`** en `src/db/index.ts`: trae usuarios **con** `faceEmbeddings` (sin pasar por `toSafeUser` que los excluye).

### 2.3 `src/db/index.ts` — función añadida
```typescript
export async function getAllUsersWithEmbeddings(): Promise<StoredUser[]>
```
Filtra en MongoDB: `{ faceEmbeddings: { $exists: true, $ne: [] } }` y mapea con `fromMongoUser` (conserva los vectores).

---

## 3. Cambio #31 — "Enrolamiento facial real: fotos + vectores en MongoDB"

### 3.1 Cambio en `server.ts` (línea ~502)
**Antes:** `requestFaceEmbeddings(dataUrls)` — enviaba data-URLs crudos al servicio (aún no existía).
**Ahora:** `requestFaceEmbeddings(cloudinaryUrls)` — envía **las URLs de Cloudinary** que ya se subieron antes.

```typescript
const cloudinaryUrls = photos.map(p => p.photoUrl);
const vectors = await requestFaceEmbeddings(cloudinaryUrls);
const enrollment = await saveFaceEnrollment(target.id, { photos, embeddings: vectors ?? [] });
```

### 3.2 Resultado en MongoDB
```json
{
  "faceEmbeddings": [[128 floats], [128 floats], ...],  // 1 fila por foto
  "enrollmentPhotos": [{ "photoUrl": "...", "photoPublicId": "..." }],
  "faceEnrolled": true
}
```
- `saveFaceEnrollment` recibe `embeddings: number[][]` (2D) y deriva `faceEnrolled`.
- Estado del enrolamiento (`summarizeEnrollment`):
  - `none` → sin fotos
  - `photos_pending` → fotos sin vectores
  - `enrolled` → fotos + vectores

### 3.3 Verificación en vivo
- Usuario `luis@uniminuto.edu.co` re-enrolado con 2 fotos de prueba.
- Respuesta: `"vectorsGenerated": 2`, `"pendingReason": null`, `"storage": "cloudinary"`.

---

## 4. Cambio #32 — "Verificación facial real: decisión biométrica + bitácora + alerta celador"

### 4.1 Endpoint `POST /api/recognition/verify-face` reescrito
**Antes (simulación):**
```typescript
const { matchedUserId } = req.body;          // navegador decide quién es
const confidence = 0.94 + Math.random()*0.05; // número inventado
```

**Ahora (IA real):**
```typescript
const { snapshotUrl, direction } = req.body;  // snapshot ya en Cloudinary
const { match, distance } = await identifyFace(snapshotUrl);
const confidence = match ? 1 - distance : 0;
```

### 4.2 Lógica de decisión
| Distancia coseno | Decisión | Confianza |
|---|---|---|
| ≤ 0.45 (`FACE_MATCH_THRESHOLD`) | **Autorizado** | `1 - distancia` (≈ 0.6–1.0) |
| > 0.45 | **Denegado** | 0 |

### 4.3 Bitácora (`addAccessLog`) — campos clave
```json
{
  "direction": "entry|exit",
  "entryPoint": "Torniquetes Entrada Cra 5",
  "method": "facial_recognition",
  "status": "authorized|denied",
  "userId": "usr-...",           // solo si autorizado
  "userName": "Luis",            // "Persona No Identificada" si denegado
  "confidenceScore": 0.99,
  "notes": "Ingreso peatonal autorizado por reconocimiento facial (99.0%). Torniquete habilitado."
}
```

### 4.3 Alerta al celador (fase actual: en respuesta JSON)
Si denegado → respuesta incluye:
```json
"alert": {
  "title": "Intento de Ingreso No Autorizado",
  "message": "El sistema no encontró coincidencias biométricas activas. Por favor preséntate en portería.",
  "severity": "high"
}
```
> Fase futura: WebSocket / polling para notificar al celador en tiempo real.

### 4.5 Permisos
- Endpoint protegido con `authenticateToken` + `requireRole('admin', 'security')`.
- Solo personal autorizado puede operar la cámara.

### 4.6 Tests end-to-end confirmados
| Test | Input | Resultado |
|---|---|---|
| Luis (registrado) | snapshot = su foto de enrolamiento | `authorized: true`, `confidence: 1.0`, log `authorized` |
| Desconocido | snapshot = foto aleatoria | `authorized: false`, `confidence: 0`, log `denied` + alerta `high` |

---

## 5. Cambio #33 — "Script demo standalone `demo_camera_vectors.py`"

### 5.1 Propósito
Script Python standalone (no parte del microservicio FastAPI) que permite probar el reconocimiento facial en tiempo real **sin necesidad del frontend ni del servidor Node**. Útil para:
- Demostraciones rápidas sin montar todo el stack.
- Validar modelos YuNet + SFace en el hardware real.
- Depurar umbrales y calidad de vectores en campo.
- Ver vectores 128-d en pantalla mientras la cámara detecta rostros.

### 5.2 Ubicación y uso
```
face_service/scripts/demo_camera_vectors.py
```

**Uso:**
```bash
cd face_service
.\.venv\Scripts\python scripts\demo_camera_vectors.py --threshold 0.45 --camera 0 --fps 30
```

**Parámetros CLI:**
| Parámetro | Default | Descripción |
|---|---|---|
| `--threshold` | 0.45 | Umbral distancia coseno (modificable) |
| `--camera` | 0 | Índice de cámara (0 = webcam por defecto) |
| `--fps` | 30 | FPS objetivo (30 para tiempo real) |

### 5.3 Funcionamiento interno
Reutiliza las **mismas clases** del sistema:
- `FaceDetectorYuNet` (YuNet ONNX) → detección de rostro.
- `FaceEmbedder` (SFace ONNX) → vector 128-d normalizado (norma 1.0).
- `config.py` — rutas de modelos y umbrales.
- `pymongo` + `.env` → conexión a MongoDB Atlas (misma URI que el sistema).

**Flujo por frame (30 FPS objetivo):**
1. Captura frame de la webcam (640×480, `CAP_PROP_BUFFERSIZE=1` para baja latencia).
2. `FaceDetectorYuNet.detectar_mayor()` → bounding box del rostro principal.
3. Recorte → `FaceEmbedder.vectorizar()` → vector 128-d normalizado (norma 1.0).
4. Coseno vs **todos los vectores de todos los usuarios** en MongoDB (`getAllUsersWithEmbeddings`).
3. Mejor match: distancia ≤ 0.45 → **match**; si no → **Desconocido**.

### 5.4 Visualización en tiempo real
En la ventana OpenCV se muestra:
- **Bounding box**: verde (match ≤ 0.45) / rojo (no match).
- **Label**: `Nombre (98%) • rol • CC:12345678` (si match) / `Desconocido (0%)` (si no).
- **Vector 128-d**: primeros 8 valores (toggle `v` para ver los 128).
- **FPS counter** (actualizado cada 30 frames).
- **Instrucciones**: `q=salir | v=vector completo`.

**Controles:**
| Tecla | Acción |
|---|---|
| `q` | Salir y cerrar cámara |
| `v` | Toggle vector completo (8 vs 128 valores) |

### 5.5 Dependencias nuevas (agregadas a `requirements.txt`)
```
pymongo        # conexión a MongoDB Atlas
python-dotenv  # leer .env raíz (misma URI que el sistema)
```

### 5.6 Limpieza
- **Eliminado:** `scripts/smoke_test.py` (obsoleto: solo probaba foto estática; sustituido por demo con cámara real + MongoDB).

### 5.7 Verificación
- Modelos YuNet + SFace cargados 1 vez → ~40-60 FPS teórico, 30 FPS real con overhead de visualización.
- Conexión a MongoDB Atlas exitosa → usuarios con vectores cargados correctamente.
- Test manual: cámara detecta rostro, extrae vector, compara 1:N, muestra nombre + distancia en pantalla.

---

## 6. Cambio #34 — "Enrolamiento facial guiado: poses, delay 1s, modal recomendaciones, mínimo 3 fotos"

### 6.1 Contexto
El enrolamiento facial anterior permitía capturar fotos de forma libre (máx 5) sin guía visual, sin espera entre capturas, y permitía borrar fotos individuales. Esto generaba vectores inconsistentes (diferente iluminación, ángulos aleatorios) y una UX confusa.

### 6.2 Solución: flujo guiado en `FaceEnrollment.tsx`
Se rediseñó completamente el componente para imponer un flujo estructurado:

**A. Modal de recomendaciones (siempre visible)**
- Al abrir la cámara, **siempre** se muestra un modal overlay con 6 recomendaciones:
  1. ☀️ Buena iluminación
  2. 🧱 Fondo neutro
  3. 👓 Sin accesorios
  4. 👁️ Mirar a la cámara
  5. 📏 Distancia adecuada (50-80 cm)
  6. 😐 Expresión neutra
- Sin opción "no mostrar de nuevo" → se muestra **cada vez** que se intenta enrolar o actualizar.

**B. 5 poses guiadas con delay de 1s**
| # | Pose | Ícono | Instrucción visual |
|---|---|---|---|
| 1 | Frontal | 👁️ | Mira de frente a la cámara |
| 2 | Perfil derecho | ➡️ | Gira ligeramente la cabeza a la derecha |
| 3 | Perfil izquierdo | ⬅️ | Gira ligeramente la cabeza a la izquierda |
| 4 | Mentón arriba | ⬆️ | Levanta ligeramente el mentón |
| 5 | Mentón abajo | ⬇️ | Baja ligeramente el mentón |

- Overlay en cámara muestra: óvalo guía + ícono/label de pose + instrucción textual
- Tras cada captura: **1 segundo de espera** + mensaje "Capturada, preparando siguiente pose..." + auto-avance
- Progreso visible: "Pose X de 5 · N/5 fotos capturadas"

**C. Validaciones reforzadas**
- **Mínimo 3 fotos obligatorias** (`MIN_ENROLLMENT_PHOTOS = 3`)
- Botón "Enrolar rostro" deshabilitado hasta cumplir mínimo
- **Primera foto (frontal) = foto de perfil** del usuario (avatar)
- **Eliminación de botones "X" por foto** → no se pueden borrar fotos individuales
- Para rehacer: botón "Descartar" o cerrar cámara → reinicio completo del flujo

**D. Estados del botón de captura**
- `Capturar (1/5)` → `Capturando...` → delay 1s → `Capturar (2/5)` ... hasta 5
- Deshabilitado durante captura y delay

### 6.3 Archivos modificados
- `src/components/FaceEnrollment.tsx` — reescritura completa del flujo de captura

### 6.4 Impacto en biometría
- Vectores más consistentes: mismas condiciones de luz, mismo día, poses estandarizadas
- Primera foto frontal garantiza avatar de calidad
- Reduce vectores ruidosos que degradaban el 1:N

---

## 7. Verificación general de la etapa

- **Python service:** `GET /health` → 200; `POST /embed` → 200 con vectores 128-d normalizados (norma 1.0).
- **Node build:** `npm run build` limpio; `tsc --noEmit` sin errores.
- **Enrolamiento:** 2 fotos → Cloudinary → `/embed` → 2 vectores → MongoDB (`faceEmbeddings` 2D).
- **Verificación:** misma foto → distancia 0.0 → confianza 1.0 → autorizado.
- **Desconocido:** foto distinta → distancia 1.0 → confianza 0 → denegado + bitácora + alerta.
- **Demo cámara:** 30 FPS, detección + identificación 1:N en tiempo real, visualización completa.
- **Seguridad:** endpoint exige rol `admin`/`security`; umbral configurable en `.env` (`FACE_MATCH_THRESHOLD=0.45`).
- **Enrolamiento guiado:** modal recomendaciones, 5 poses con delay 1s, mínimo 3 fotos, primera foto = avatar, sin borrado individual.

---

## 8. Impacto en documentación

| Documento | Actualizado |
|---|---|
| `ESTRUCTURA-DEL-PROYECTO.md` | Arquitectura (§1), árbol de archivos (§2), endpoints (§4.2, §4.3), capa de datos (§5.2), flujo (§12), límites (§11.1), verificación (§13), FaceEnrollment (§7) |
| `.gitignore` | `*.onnx` y `models/` ya ignorados |

---

**Documento preparado por:** Seguimiento de cambios del proyecto
**Versión:** 1.2 (Sexto informe, incluye #29–#34)
**Fecha:** 2026-10-06
**Confidencialidad:** Interno - Uso técnico