# CUARTO INFORME DE CAMBIOS

> **Proyecto:** Sistema de Control de Acceso — UNIMINUTO Sede Ibagué
> **Directorio del proyecto:** `C:\Users\losor\Desktop\proyecto entrada\sistema-de-control-de-acceso---uniminuto-sede-ibague actua`
> **Fecha:** 2026-09-29
> **Informes anteriores:** `cambios_informe/INFORME_DE_CAMBIOS.md` (cambios #01 y #02), `cambios_informe/SEGUNDO_INFORME_DE_CAMBIOS.md` (cambios #03 y #04) y `cambios_informe/TERCER_INFORME_DE_CAMBIOS.md` (cambios #05 a #13)
> **Cambios de este documento:** #14 a #25
> **Alcance:** arreglos de sesión y conexión, **enrolamiento facial operativo** (cámara + Cloudinary + MongoDB), correcciones de subida y borrado de imágenes, y limpieza integral del proyecto (código muerto, archivos obsoletos y base de datos).

---

## Índice de cambios

| # | Cambio | Área |
|---|---|---|
| #14 | Sesión del cliente: el token nunca se guardaba (401 en todas las llamadas) | Interfaz / Sesión |
| #15 | Tiempo de espera y reintento de la conexión a MongoDB Atlas | Base de datos |
| #16 | Enrolamiento facial: API backend (`face-enrollment`) | Funcional |
| #17 | Enrolamiento facial: capa de datos (`summarizeEnrollment`, `saveFaceEnrollment`) | Base de datos |
| #18 | Estado real de enrolamiento (candidatos, `verify-face` 409, panel admin) | Funcional |
| #19 | Componente `FaceEnrollment.tsx` e integración en el Carné | Interfaz |
| #20 | Corrección de captura vacía y validación por foto | Funcional |
| #21 | Corrección del borrado en Cloudinary (firma, `purgeImages`, huérfanas) | Funcional |
| #22 | Limpieza de código muerto: Postgres/Drizzle/Neon, `Session`, `/api/db-status`, dependencias | Mantenimiento |
| #23 | Limpieza de la base de datos (solo `luis`) | Mantenimiento |
| #24 | Eliminación de archivos obsoletos del repositorio | Mantenimiento |
| #25 | Documentación actualizada (modal técnico, `ESTRUCTURA-DEL-PROYECTO.md`, este informe) | Documentación |

---

## 1. Cambio #14 — "El token de sesión nunca se guardaba"

### 1.1 Problema
`storeToken()` no se llamaba en ningún punto del frontend: el token de acceso solo vivía en el estado de React y **nunca se persistía** en `localStorage`. Al recargar la página, `authFetch()` no encontraba el token y **todas las llamadas a `/api` respondían 401** (usuarios, estadísticas, bitácora, enrolamiento), dejando la base vacía.

### 1.2 Solución
En `src/App.tsx`:
- Al iniciar sesión (login), se llama a `storeToken(token)`.
- Al restaurar una sesión guardada, se vuelve a persistir el token, **auto-reparando** sesiones antiguas que solo tenían el blob `uniminuto_session`.
- En el cierre de sesión y ante cualquier 401/403 se llama a `clearStoredToken()`.

Los módulos que construían las cabeceras a mano para el Carné y la cámara (`MobileAppView.tsx` y `RecognitionCameraModule.tsx`) ahora usan `getStoredToken()` en lugar de leer el blob `uniminuto_session` completo.

### 1.3 Archivos
- `src/App.tsx`
- `src/lib/api.ts` (expone `getStoredToken` / `storeToken` / `clearStoredToken`)
- `src/components/MobileAppView.tsx`
- `src/components/RecognitionCameraModule.tsx`

---

## 2. Cambio #15 — "Reintento y timeout realista para MongoDB Atlas"

### 2.1 Problema
La conexión usaba `serverSelectionTimeoutMS: 5000`, insuficiente para un clúster Atlas **frío** (tardaba ~6,7 s en responder). El servidor caía al store en memoria y la interfaz mostraba una base vacía de forma silenciosa.

### 2.2 Solución
En `src/db/mongo/connection.ts`:
- Intento 1 con `serverSelectionTimeoutMS: 12000` y espera de 3 s.
- Intento 2 con `serverSelectionTimeoutMS: 20000`.
- Mensajes claros en consola y aviso explícito cuando queda en **MODO MEMORIA**.

### 2.3 Verificación
Con la URI real de Atlas, la conexión se establece en el primer intento.

---

## 3. Cambio #16 — "Enrolamiento facial: API backend"

### 3.1 Resumen
Se crearon las rutas `GET` / `POST` / `DELETE /api/users/:id/face-enrollment`. Permiten consultar el estado, guardar fotos de entrenamiento y eliminar el enrolamiento.

### 3.2 Endpoints

| Método | Ruta | Permisos |
|---|---|---|
| `GET` | `/api/users/:id/face-enrollment` | Dueño o `admin` |
| `POST` | `/api/users/:id/face-enrollment` | Dueño o `admin` |
| `DELETE` | `/api/users/:id/face-enrollment` | Dueño o `admin` |

> **Decisión de diseño:** el rol `security` queda **excluido** a propósito. La vigilancia puede verificar rostros, pero **no enrolar** a terceros sin autorización.

### 3.3 Reglas del POST (server.ts)
- Exige `consent: true` (consentimiento informado, Ley 1581 de 2012).
- No más de **`MAX_ENROLLMENT_PHOTOS = 5`** fotos.
- Cada foto se valida con `parseDataUrl` (como los avatares: tipo y tamaño).
- Se suben a Cloudinary (`folder: 'enrollment'`).
- Si el usuario ya tenía enrolamiento, se **borran sus fotos anteriores** antes de reemplazar.
- **Rollback:** si la subida *i* falla, se eliminan las ya subidas en el mismo intento.
- Respuesta: `vectorsGenerated`, `pendingReason`, `storage`, `orphanedPhotos`.

### 3.4 Archivos
- `server.ts` (rutas + constantes)
- `src/lib/imageStorage.ts` (reutilizado para la subida)

---

## 4. Cambio #17 — "Enrolamiento facial: capa de datos"

### 4.1 Resumen
Se añadió a `src/db/index.ts` la lógica que deriva el estado del enrolamiento y lo persiste.

### 4.2 Adiciones
- Tipo `EnrollmentStatus`: `none` | `photos_pending` | `enrolled`.
- `summarizeEnrollment(user)` — deriva el estado según si hay fotos y vectores.
- `saveFaceEnrollment(id, { photos, embeddings })` — recibe los embeddings **en 2D** (`number[][]`) y deriva `faceEnrolled`. **No** reutiliza `updateUser` para evitar el "trap" 1D → 1 fila que se documentó en el informe anterior.

### 4.3 Estado "vectorizado"
Como no hay servicio Python (ver §13), hoy el enrolamiento guarda las fotos y deja `vectorsGenerated: false` con `pendingReason`; el estado visible es `photos_pending`.

### 4.4 Archivos
- `src/db/index.ts`
- `src/types.ts` (estado y contratos)

---

## 5. Cambio #18 — "Estado real de enrolamiento en el resto de la API"

### 5.1 Problemas corregidos
- `GET /api/recognition/candidates` respondía `faceEnrolled: true` **fijado** y sin filtrar: mostraba como enrolados a quien no lo estaba.
- `POST /api/recognition/verify-face` dejaba escanear a cualquier usuario, aunque no tuviera rostro inscrito.
- `AdminDashboard.tsx` enviaba `faceEnrolled: true` al crear usuarios.

### 5.2 Solución
- `candidates` usa `summarizeEnrollment(u)`, filtra por `status === 'active'` y ordena por nombre.
- `verify-face` responde **409** si el usuario no está `enrolled`.
- `AdminDashboard` deja de forzar `faceEnrolled`.

---

## 6. Cambio #19 — "Componente `FaceEnrollment.tsx`"

### 6.1 Resumen
Nuevo componente React que captura el rostro y enrula el enrolamiento desde el **Carné Digital** (`MobileAppView.tsx`).

### 6.2 Funciones
- Cámara en vivo (`getUserMedia`) y compresión a JPEG hasta 720 px (`drawScaled`).
- Subida por archivo como alternativa.
- Guía oval para centrar el rostro y miniaturas de las fotos tomadas.
- Casilla de **consentimiento** obligatoria (Ley 1581 de 2012).
- Estados `none` → captura → `photos_pending` y avisos de fotos huérfanas en Cloudinary.

### 6.3 Archivos
- `src/components/FaceEnrollment.tsx` (nuevo)
- `src/components/MobileAppView.tsx`

---

## 7. Cambio #20 — "Corrección de captura vacía y validación por foto"

### 7.1 Bug
Se usaba `video.width` (atributo HTML, 0) en lugar de `video.videoWidth`/`video.videoHeight`. El canvas quedaba en 0×0, la captura era `data:,` y el servidor respondía 400 "Formato de imagen inválido".

### 7.2 Solución
- `drawScaled(source, width, height, mirror)` recibe las dimensiones reales del frame; los archivos usan `naturalWidth/naturalHeight`.
- El cliente pre-valida el `dataUrl` antes de enviar.
- El servidor indica **qué foto** falló y qué recibió (`Foto N invalida (llego ...)`).

---

## 8. Cambio #21 — "Corrección del borrado en Cloudinary"

### 8.1 Bug
`removeImage()` firmaba `{ public_id, timestamp }` pero enviaba `invalidate` **sin firmar** → Cloudinary respondía `Invalid Signature`. Además, `.catch(() => {})` tragaba el error **sin leer el cuerpo**, por lo que las fotos borradas en la app seguían en Cloudinary (huérfanas).

### 8.2 Solución
`src/lib/imageStorage.ts`:
- `removeImage()` firma **todos** los parámetros enviados (`public_id`, `timestamp`, `invalidate`).
- Devuelve `RemoveResult { ok, reason, publicId }`, lee el cuerpo y exige `result === 'ok'`.
- Para almacenamiento local, valida la ruta y maneja `ENOENT`.

`server.ts`:
- Helper `purgeImages(publicIds)` → devuelve los `publicId` que quedaron huérfanos.
- Usado en los 4 borrados (avatar reemplazado, avatar eliminado, fotos de enrolamiento reemplazadas, enrolamiento eliminado) y en el rollback de subida.

### 8.3 Verificación
Subida de prueba → borrado → la URL de Cloudinary devuelve **404** (tras invalidar el CDN). Confirmado en vivo.

---

## 9. Cambio #22 — "Limpieza de código muerto y dependencias"

### 9.1 Eliminado
- **PostgreSQL / Neon / Drizzle:** `src/db/schema.ts`, el bloque `dbClient` de `src/db/index.ts`, la importación de `neon`/`drizzle` y la función sin uso `generateToken()`.
- **Modelo `Session`:** `ISession`, `SessionMongoSchema` y `SessionModel` de `src/db/mongo/models.ts` (nadie los usaba y contradecían la arquitectura JWT sin estado).
- **Endpoint `/api/db-status`:** reportaba `neonConnected` y tablas falsas; su lugar lo ocupa `GET /api/mongodb/status` (admin).
- **Dependencias:** `drizzle-orm`, `@neondatabase/serverless`, `@google/genai`, `motion` y `autoprefixer` (sin uso; `npm install` retiró 39 paquetes).

### 9.2 Conservado a propósito
- **Modelo `EntryPoint`** (`entry_points`): de dominio válido para los torniquetes, aunque aún no se conecta con la bitácora.

### 9.3 Verificación
`npx tsc --noEmit` limpio tras la limpieza.

---

## 10. Cambio #23 — "Limpieza de la base de datos"

### 10.1 Eliminado en Atlas (`uniminuto_acceso`)
- Usuario de prueba `admin-test-1790642355930@uniminuto.edu.co` (rol `admin`).
- Registros de acceso de usuarios eliminados y huérfanos (3 de 6).
- **Colección `sessions`** (vacía y obsoleta tras el cambio #22).

### 10.2 Conservado
- `luis@uniminuto.edu.co` y sus 3 registros de acceso.

| Colección | Documentos |
|---|---|
| `users` | 1 (`luis@uniminuto.edu.co`, rol `student`) |
| `access_logs` | 3 (de `luis`) |
| `revoked_tokens` | 0 |
| `entry_points` | 0 |

---

## 11. Cambio #24 — "Eliminación de archivos obsoletos"

Se borraron del repositorio:
- `metadata.json` (sin uso, de AI Studio)
- `bun.lock` (el proyecto usa `npm`/`package-lock.json`)
- `_del_test.ts`, `_diag-parse.mjs`, `_enrolamiento-e2e.mjs`, `_server.log` (temporales de diagnóstico)

---

## 12. Cambio #25 — "Documentación actualizada"

### 12.1 Modal técnico (`TechnicalInfoModal.tsx`)
- Se eliminó la tarjeta "PostgreSQL & Drizzle" y el snippet SQL.
- Se corrigió la lista de colecciones (adios `sessions (TTL)`; el TTL real está en `revoked_tokens`).
- Nuevo snippet con el **esquema Mongoose real** de usuario.

### 12.2 `ESTRUCTURA-DEL-PROYECTO.md`
Reescritas las secciones de arquitectura, árbol de archivos, endpoints, capa de datos, entorno, estado de la base, límites conocidos y pendientes para reflejar: enrolamiento operativo, backend 100% MongoDB, sesión con `accessToken`, reintento de conexión y limpieza #22–#24.

### 12.3 Este informe
Documento `cambios_informe/CUARTO_INFORME_DE_CAMBIOS.md`.

---

## 13. Estado real del reconocimiento facial (para la defensa)

- **Enrolamiento de fotos: real y operativo.** Cámara → compresión → Cloudinary → MongoDB, con borrado real verificado.
- **Reconocimiento: sigue siendo simulado.** No hay librería de visión artificial ni modelo; `verify-face` recibe el `matchedUserId` del navegador y los `faceEmbeddings` no se generan ni se comparan.
- **Estado de un usuario enrolado:** `photos_pending` (fotos sin vectores). Hasta que exista el servicio Python, `verify-face` responde 409 "sin enrolar".
- **Costura lista:** `src/lib/faceService.ts` (`getFaceServiceStatus`, `requestFaceEmbeddings` → `POST /embed`, `cosineDistance`) esperando `FACE_SERVICE_URL`. **Es el siguiente hito del proyecto.**

## 14. Verificación y advertencia operativa

- `npx tsc --noEmit` limpio tras la limpieza (#22). `npm install` sin vulnerabilidades.
- Flujo de enrolamiento probado en vivo: captura → subida → guardado → **eliminación con 404 real en Cloudinary**.

> **Advertencia:** `tsx server.ts` **no recarga el código automáticamente**. Tras modificar `server.ts` es obligatorio reiniciar el proceso:
> `Get-NetTCPConnection -LocalPort 3000 -State Listen`

---

**Documento preparado por:** Seguimiento de cambios del proyecto
**Versión:** 1.0 (Cuarto informe)
**Fecha:** 2026-09-29
**Confidencialidad:** Interno - Uso técnico