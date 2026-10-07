# Estructura Interna del Proyecto

> **Sistema de Control de Acceso – UNIMINUTO Sede Ibagué**
> Control y gestión del acceso **peatonal por reconocimiento facial** (entrada/salida) en torniquetes de la Carrera 5. Proyecto de investigación de **Dilan González** (Ing. de Sistemas, VI semestre, 2026).
>
> **Última actualización:** 06/10/2026 · **Estado:** vigente. Incluye reconocimiento facial real (YuNet + SFace), **enrolamiento guiado (poses, delay 1s, modal recomendaciones, mínimo 3 fotos, primera=avatar)**, verificación 1:N con decisión por coseno, bitácora y alerta al celador, modal de foto de perfil con progreso, imagen de respaldo local, JWT, revocación de sesiones, autorización por rol, scrypt para contraseñas y límite de login anti-fuerza bruta.
> **Cambios documentados en:** `cambios_informe/INFORME_DE_CAMBIOS.md` (#01–#02), `cambios_informe/SEGUNDO_INFORME_DE_CAMBIOS.md` (#03–#04), `cambios_informe/TERCER_INFORME_DE_CAMBIOS.md` (#05–#13), `cambios_informe/CUARTO_INFORME_DE_CAMBIOS.md` (#14–#25), `cambios_informe/QUINTO_INFORME_DE_CAMBIOS.md` (#26–#28) y `cambios_informe/SEXTO_INFORME_DE_CAMBIOS.md` (#29–#34).

---

## 1. Resumen de arquitectura

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  Navegador (React 19 + Vite + Tailwind v4 + lucide-react)           │
  │  App.tsx ──> 3 vistas: Móvil | Cámaras/Visión IA | Panel Admin        │
  │  Toda llamada a /api usa authFetch() → cabecera Authorization: Bearer │
  └───────────────────────────────┬──────────────────────────────────────┘
                                  │  HTTP mismo origen (dev: Vite middleware)
  ┌───────────────────────────────▼──────────────────────────────────────┐
  │  Express (server.ts)  ──  Puerto 3000                                │
  │   Middleware: authenticateToken → requireRole → reglas de negocio   │
  │   • Auth JWT (1 día) • Usuarios • Avatar • Reconocimiento            │
  │   • Bitácora + CSV  • Estadísticas • Estado MongoDB                  │
  └───┬──────────────────────────┬──────────────────────┬────────────────┘
      │                          │                      │
  ┌───▼────────────┐   ┌─────────▼───────────┐   ┌──────▼──────────────┐
  │ src/lib/       │   │ Mongoose/MongoDB    │   │ src/lib/           │
  │  jwt.ts        │   │ (connection, models)│   │  imageStorage.ts   │
  │  password.ts   │   │ CRUD REAL           │   │  → Cloudinary      │
  │  faceService.ts│   │ users, access_logs, │   │  (avatar + fotos   │
  │  api.ts        │   │ revoked_tokens      │   │   de enrolamiento) │
  └────────────────┘   └─────────────────────┘   └─────────────────────┘
       Store en memoria (src/db/index.ts) = RESPALDO si Mongo no responde
```

**Punto clave:** la única fuente de verdad es **MongoDB Atlas** (base `uniminuto_acceso`) mediante Mongoose. El store en memoria queda como respaldo y los tokens revocados como red de seguridad. El backend es 100% MongoDB: PostgreSQL (Neon/Drizzle) fue **eliminado** en el cambio #22. Las imágenes van a **Cloudinary** (avatar y fotos de enrolamiento). No hay datos semilla.

El **reconocimiento facial real** corre en un microservicio Python independiente (`face_service/`, puerto 8000) que expone `POST /embed`. Node llama a ese endpoint desde `src/lib/faceService.ts` y compara vectores con distancia coseno. El flujo completo está en §12.

---

## 2. Árbol de archivos (los relevantes)

```
SCAI - horizon/
├── server.ts                  # API Express + servidor Vite en dev
├── vite.config.ts             # Config Vite (React + Tailwind, alias "@")
├── tsconfig.json              # TypeScript (bundler resolution, noEmit, esModuleInterop)
├── package.json               # Scripts y dependencias
├── .env                       # ⚠️ Secretos reales (ignorado por git)
├── .gitignore                 # Ignora node_modules, .env*, uploads/, models/, *.onnx
├── README.md                  # README genérico de AI Studio
├── ESTRUCTURA-DEL-PROYECTO.md # Este documento
├── cambios_informe/           # 6 informes de cambios (#01 a #32)
├── public/
│   └── img/none_profile.jpg   # Imagen de respaldo del perfil (AVATAR_FALLBACK)
├── uploads/                   # Respaldo local de imágenes (solo si Cloudinary no está)
├── face_service/              # Microservicio Python de visión artificial
│   ├── app.py                 # FastAPI: /health + POST /embed
│   ├── config.py              # Rutas, umbrales, límites
│   ├── requirements.txt       # fastapi, uvicorn, opencv-python, numpy, requests, pymongo, python-dotenv
│   ├── scripts/
│   │   └── demo_camera_vectors.py  # Demo tiempo real: cámara → YuNet+SFace → MongoDB
│   ├── models/
│   │   ├── face_detection_yunet.onnx       # YuNet 232 KB
│   │   └── face_recognition_sface.onnx     # SFace 37 MB
│   └── services/
│       ├── face_detector.py    # FaceDetectorYuNet
│       ├── face_embedder.py    # FaceEmbedder (SFace + normalización)
│       ├── image_source.py     # ImageSource (data-URL / URL Cloudinary)
│       └── pipeline.py         # FacePipeline (orquesta detector+embedder)
└── src/
    ├── main.tsx               # Punto de entrada React
    ├── index.css              # Tailwind v4 + scrollbar personalizado
    ├── App.tsx                # Estado global, pestañas, sesión, RBAC visual
    ├── types.ts               # Tipos compartidos (UserProfile, AccessLog, Stats…)
    ├── lib/                   # Utilidades transversales
    │   ├── jwt.ts             # signSessionToken / verifySessionToken (HS256, 1 día)
    │   ├── password.ts        # scrypt con sal + verifyPassword + política de longitud
    │   ├── imageStorage.ts    # Cloudinary (REST firmado) con respaldo en disco
    │   ├── faceService.ts     # Costura hacia el servicio Python de embeddings (futuro)
    │   ├── rateLimit.ts       # ✔ Límite de intentos de login (cuenta+IP y por IP, #28)
    │   └── api.ts             # authFetch() + getStoredToken() + AVATAR_FALLBACK (constante única)
    ├── db/
    │   ├── index.ts           # Capa Mongo/Memoria + usuarios + revocación + stats + enrolamiento
    │   └── mongo/
    │       ├── connection.ts  # connectToMongoDB (reintento 12s/20s) / getMongoConnectionStatus
    │       └── models.ts      # users, access_logs, entry_points, revoked_tokens
    └── components/
        ├── Navbar.tsx                 # Menú + tema oscuro
        ├── AuthModal.tsx              # Login/Registro
        ├── MobileAppView.tsx          # Carné digital + foto de perfil + enrolamiento + historial
        ├── AvatarModal.tsx            # ✔ Modal de foto de perfil con barra de progreso (XHR)
        ├── FaceEnrollment.tsx         # ✔ Enrolamiento facial guiado: modal recomendaciones, 5 poses, delay 1s, mínimo 3 fotos, primera=foto perfil, sin borrado individual
        ├── RecognitionCameraModule.tsx# Cámara + simulación de visión IA + pase manual
        ├── AdminDashboard.tsx         # Panel admin (stats, usuarios, bitácora, CSV)
        └── TechnicalInfoModal.tsx     # Detalles de arquitectura
```

---

## 3. Configuración y arranque

### package.json (scripts)

| Script | Comando que ejecuta | Uso |
|---|---|---|
| `dev` | `tsx server.ts` | Arranca Express + Vite en dev (puerto **3000**) |
| `build` | `vite build && esbuild server.ts --bundle … --outfile=dist/server.cjs` | Empaqueta front y servidor |
| `start` | `node dist/server.cjs` | Sirve la build de producción |
| `lint` | `tsc --noEmit` | **Verificación de tipos (herramienta de desarrollo clave)** |

**Dependencias principales:** React 19, vite 6, tailwindcss v4, express, mongoose 9, **jsonwebtoken 9**, lucide-react, tsx, typescript.
**Eliminadas en #22 (código muerto):** drizzle-orm, `@neondatabase/serverless`, `@google/genai`, motion y autoprefixer.

> ⚠️ **Windows/PowerShell:** el alias `npm` suele estar bloqueado por política de ejecución; usar **`npm.cmd run dev`**.
>
> ⚠️ **`tsx server.ts` NO recarga el código automáticamente.** Tras modificar `server.ts` hay que **reiniciar el proceso**. Si el puerto 3000 está ocupado por una instancia anterior, se ve el código viejo y las pruebas dan resultados falsos. Verificar con:
> `Get-NetTCPConnection -LocalPort 3000 -State Listen`

---

## 4. Backend: server.ts (API Express)

### 4.1 Estructura general
- `PORT = 3000`, escucha en `0.0.0.0` (se abre en `http://localhost:3000`).
- **Middleware base:** `express.json({ limit: '10mb' })`, `express.urlencoded`, y serving estático de `/uploads`.
- **Cadena de autorización por petición:**
  1. `authenticateToken` — valida el JWT (firma, `exp`, emisor, audiencia), consulta si el `jti` está revocado, carga el usuario y **bloquea cuentas suspendidas** (403).
  2. `requireRole('admin', 'security')` — filtro por rol.
  3. Reglas de negocio en el manejador (propiedad del recurso, escalada de roles).
- **En dev** usa el middleware de **Vite** (`middlewareMode`) para servir el front en el mismo puerto; en producción sirve `dist/`.

### 4.2 Endpoints

| Método | Ruta | Token | Rol | Descripción |
|---|---|---|---|---|
| POST | `/api/auth/sign-in` | No | Público | Login → `{ user, token, expiresAt }` |
| POST | `/api/auth/sign-up` | No | Público | Registro. **El rol se fuerza a `student`** |
| GET | `/api/auth/me` | Sí | Cualquiera | Usuario de la sesión actual |
| POST | `/api/auth/sign-out` | Sí | Cualquiera | Revoca el `jti` del token |
| GET | `/api/users` | Sí | Cualquiera | Lista usuarios (sin datos sensibles) |
| GET | `/api/users/:id` | Sí | Cualquiera | Detalle de usuario |
| POST | `/api/users` | Sí | admin, security | Crear usuario (solo admin crea admins) |
| PUT | `/api/users/:id` | Sí | admin, security | Actualizar (**el rol solo lo cambia un admin**) |
| PATCH | `/api/users/:id/status` | Sí | **solo admin** | Activar/suspender |
| DELETE | `/api/users/:id` | Sí | **solo admin** | Eliminar (no la propia cuenta) |
| POST | `/api/users/:id/avatar` | Sí | dueño, admin, security | Subir foto de perfil |
| DELETE | `/api/users/:id/avatar` | Sí | dueño, admin, security | Quitar foto de perfil |
| GET | `/api/users/:id/face-enrollment` | Sí | dueño, admin | Estado del enrolamiento facial |
| POST | `/api/users/:id/face-enrollment` | Sí | dueño, admin | Enrolar (consentimiento + hasta 5 fotos) |
| DELETE | `/api/users/:id/face-enrollment` | Sí | dueño, admin | Borrar enrolamiento y fotos en Cloudinary |
| GET | `/api/recognition/candidates` | Sí | admin, security | Candidatos enrolados y activos para la cámara |
| POST | `/api/recognition/verify-face` | Sí | admin, security | **Verificación facial real** (biométrica) |
| POST | `/api/recognition/manual-access` | Sí | admin, security | Pase manual de contingencia |
| GET | `/api/access-logs` | Sí | Cualquiera | Bitácora. **Un no-staff solo ve la suya** |
| GET | `/api/access-logs/export` | Sí | admin, security | Exportar CSV con BOM UTF-8 |
| GET | `/api/stats` | Sí | Cualquiera | Estadísticas del dashboard |
| GET | `/api/mongodb/status` | Sí | **solo admin** | Estado de conexión Mongo |
| POST | `/api/mongodb/connect` | Sí | **solo admin** | Reconectar la base con otra URI |

> El endpoint `/api/db-status` (que reportaba estado Neon + Mongo) fue **eliminado** (#22) por ser información falsa/obsoleta; su lugar lo ocupa `/api/mongodb/status`.

Las rutas de seed, script y exportación de Mongo (`/script`, `/export`, `/seed`) fueron eliminadas en el cambio #03.

### 4.3 `verify-face` (lógica) — **reconocimiento facial real**

El flujo biométrico completo:

1. El front (cámara) captura un **snapshot** y lo sube a Cloudinary (`storeImage`).
2. Llama `POST /api/recognition/verify-face` con `{ snapshotUrl, direction }`.
3. El servidor valida token + rol (`admin`/`security`).
4. `identifyFace(snapshotUrl)` (`src/lib/faceService.ts`):
   - `requestFaceEmbeddings([snapshotUrl])` → vector 128-d del snapshot (Python `/embed`).
   - `getAllUsersWithEmbeddings()` → todos los usuarios con `faceEmbeddings` en Mongo.
   - Distancia coseno del vector contra **todos los vectores de todos los usuarios**.
   - Gana el de menor distancia; si ≤ `FACE_MATCH_THRESHOLD` (0.45 por defecto) → **match**.
5. `confidence = match ? 1 - distancia : 0`.
6. `authorized = match && user.status === 'active'`.
7. Registra en bitácora (`addAccessLog`) con `method: 'facial_recognition'`, `confidenceScore`, `notes`, `snapshotUrl`.
8. Si `match` → `authorized: true`, mensaje de bienvenida, torniquete habilitado.
9. Si **no hay match** → `authorized: false`, log `denied` con `userName: "Persona No Identificada"`, `confidenceScore: 0`, **alerta `severity: "high"`** para notificar al celador (fase actual: en respuesta JSON).

**No hay simulación:** el `matchedUserId` del navegador ya no se usa; la IA decide quién es (o si no es nadie). El umbral es configurable en `.env` (`FACE_MATCH_THRESHOLD`).

### 4.4 Enrolamiento facial (`GET/POST/DELETE /api/users/:id/face-enrollment`)
- **Permisos:** el **dueño** de la cuenta o un **admin** (el rol `security` queda fuera a propósito: evita que vigilancia enrolle a terceros sin permiso).
- **POST:** exige `consent: true` (Ley 1581 de 2012), valida cada foto con `parseDataUrl` (JPEG/WEBP ≤ limit), permite hasta **`MAX_ENROLLMENT_PHOTOS = 5`**, sube a Cloudinary (`folder: 'enrollment'`) y, si existe un enrolamiento previo, **borra las fotos anteriores** antes de reemplazarlo.
- **Respuesta:** `vectorsGenerated`, `pendingReason`, `storage` y `orphanedPhotos` (fotos que Cloudinary no pudo borrar, para reportarlas).
- **Rollback:** si una subida falla a la mitad, se borran las ya subidas en ese mismo intento.
- **DELETE:** borra el enrolamiento y elimina de Cloudinary todas sus fotos, reportando huérfanas.
- **Vectores:** el POST sube las fotos a Cloudinary, obtiene sus URLs y llama al servicio Python (`requestFaceEmbeddings(cloudinaryUrls)`) para generar los vectores 128-d. `saveFaceEnrollment` recibe `embeddings: number[][]` (1 fila por foto) y deriva `faceEnrolled`. El estado queda en `enrolled` (antes `photos_pending` mientras el servicio Python no existía).

### 4.5 Límite de intentos de login (cambio #28)
- `src/lib/rateLimit.ts`: ventana fija de **15 min** con dos niveles — **5 fallos por cuenta+IP** y **20 por IP** (global). En memoria (se reinicia con el proceso; suficiente para una sola instancia).
- El servidor normaliza el correo (`trim().toLowerCase()`) y deriva la IP de `x-forwarded-for` (o `socket.remoteAddress`).
- Mientras hay bloqueo, `POST /api/auth/sign-in` responde **429** con `retryAfterSeconds` y no evalúa credenciales.
- Cada fallo además añade **400 ms** de retardo artificial (`LOGIN_FAILURE_EXTRA_DELAY_MS`) y un login correcto **limpia** el contador de la cuenta y alivia el de la IP (**no** castiga a quienes comparten NAT en el campus).

---

## 5. Capa de datos

### 5.1 Capa de persistencia — `src/db/index.ts` (dual: MongoDB ↔ memoria)
- **Contraseñas:** `hashPassword` vive ahora en `src/lib/password.ts` (**scrypt**, no SHA-256). Aquí solo se usa para crear usuarios.
- `updatePasswordHash(id, hash)` — función dedicada para migrar hashes sin abrir un campo genérico.
- **Store en memoria:** `store = { users, logs, revokedTokens }`. Ya **no** hay sesiones en memoria (fueron sustituidas por JWT).
- **Modo MongoDB (default):** si `mongoose.connection.readyState === 1`, todo el CRUD opera contra Mongoose usando `businessId` (`usr-*`, `log-*`) como clave de negocio.
- **Modo memoria (fallback):** solo si Mongo no está conectado. Los tokens revocados se guardan en un `Map` en memoria.
- Helpers: `findUserByEmail/Id/DocumentId`, `getAllUsers`, `createUser` (valida correo y documento únicos), `updateUser`, `deleteUser`, `getAccessLogs`, `addAccessLog`, `isTokenRevoked`, `revokeToken`.
- `getAllUsersWithEmbeddings()` — trae usuarios **con** `faceEmbeddings` (no pasa por `toSafeUser`, que los excluye). Usada por `identifyFace()` para comparar 1:N.
- `saveFaceEnrollment(id, { photos, embeddings })` — recibe los `embeddings` en **2D** (`number[][]`) y deriva `faceEnrolled`; no reutiliza `updateUser` para evitar el "trap" de una fila única.
- `toSafeUser()` **excluye `passwordHash` y `faceEmbeddings`**: ningún endpoint de lectura los expone.
- `getSystemStats()`: totales del día, aforo estimado, precisión facial promedio, distribución por hora, rol y torniquete.

### 5.2 Campos biométricos en el usuario (preparados para Python)
| Campo | Tipo | Descripción |
|---|---|---|
| `faceEnrolled` | `boolean` | Indica si el rostro está enrolado |
| `faceEmbeddings` | `number[][]` | Vectores faciales: 1 fila por foto de enrolamiento |
| `enrollmentPhotos` | `{ photoUrl, photoPublicId }[]` | Referencias de las N fotos de entrenamiento |

La API del enrolamiento recibe las fotos, las sube a Cloudinary, llama a `POST /embed` con las URLs de Cloudinary y guarda los vectores devueltos como `faceEmbeddings: number[][]` (1 fila por foto). `saveFaceEnrollment` recibe los `embeddings` en 2D y deriva `faceEnrolled`; `summarizeEnrollment` reporta `none` | `photos_pending` | `enrolled`.

> **Estado actual:** el enrolamiento genera y guarda los vectores biométricos reales. El servicio Python está operativo.

### 5.3 Postgres/Neon — **eliminado** (cambio #22)
El esquema Drizzle (`src/db/schema.ts`), el cliente Neon, `dbClient` y `generateToken()` (sin uso) fueron **eliminados** junto con las dependencias `drizzle-orm` y `@neondatabase/serverless`. El proyecto es ahora **100% MongoDB**.

### 5.4 MongoDB/Mongoose — `src/db/mongo/`
- **connection.ts:** `connectToMongoDB(customUri?)` usa `MONGODB_URI`, base `uniminuto_acceso`. **Reintenta 2 veces** ante el arranque lento de Atlas: intento 1 con `serverSelectionTimeoutMS: 12000` y intento 2 con `20000`, avisando si queda en modo memoria. `getMongoConnectionStatus()` enmascara credenciales.
- **models.ts:** esquemas `User` (con campos biométricos), `AccessLog`, `RevokedToken`, `EntryPoint`.
  - `RevokedToken`: `{ jti (único), userId, expiresAt }` con **índice TTL en `expiresAt`**, para que Mongo borre solo los registros cuyo token ya expiró.
  - El modelo `Session` fue **eliminado** en #22: con JWT sin estado y la colección `sessions` quedó vacía y se eliminó de Atlas.

---

## 6. Autenticación y autorización

### 6.1 Sesión (JWT)
- `src/lib/jwt.ts` firma tokens **HS256** con `sub` (id), `jti` (id único del token), `exp`, `iss` y `aud`, más rol, nombre y documento.
- **Vigencia: 1 día** (`SESSION_TTL_SECONDS = 24 * 60 * 60`), que se renueva en cada login.
- El token **sobrevive a reinicios** del servidor (a diferencia de las sesiones en memoria del diseño anterior).
- `SESSION_SECRET` es obligatorio: sin él, el servidor **falla al arrancar** en lugar de firmar con un secreto vacío.

### 6.2 Contraseñas (`src/lib/password.ts`)
- **scrypt** con `N=2^16`, `r=8`, `p=1` (~64 MB), sal aleatoria de 16 bytes, clave de 64 bytes.
- Formato versionado: `scrypt$N$r$p$sal$hash`.
- Comparación con `crypto.timingSafeEqual` (tiempo constante).
- **Migración transparente:** si el hash guardado es el SHA-256 antiguo, se acepta y **se reescribe con scrypt en el primer login exitoso**.
- **Mínimo 8 caracteres** al registrarse y al crear usuarios. El login no impose mínimo (para no bloquear cuentas antiguas).
- **Anti-enumeración:** login devuelve el mismo mensaje y hace el mismo trabajo si el correo no existe.
- Coste medido: **195 ms** por hash y por verificación.

### 6.3 Cliente
- `src/lib/api.ts` → `authFetch()` adjunta `Authorization: Bearer <token>` en todas las llamadas a `/api` (salvo sign-in/sign-up). Expone `getStoredToken()` / `storeToken()` / `clearStoredToken()` y la constante **`AVATAR_FALLBACK`** (imagen de respaldo del perfil; hoy `public/img/none_profile.jpg`, #27).
- La sesión se guarda en `localStorage` (`uniminuto_session` + `accessToken`). **`storeToken()` se llama en el login y al restaurar** una sesión guardada (bug con el arreglo #14: antes nunca se persistía el token y todas las llamadas daban 401).
- Si una respuesta es 401/403, la app limpia la sesión local.
- La restauración auto-repara sesiones viejas que solo tenían el blob `uniminuto_session`.

---

## 7. Frontend (componentes)

### App.tsx — raíz
- Estado global: `currentUser`, `authToken`, `activeTab`, `darkMode`, `users`, `logs`, `stats`.
- `fetchData()` usa `authFetch` y **se vuelve a ejecutar cuando cambia la sesión**; con 401/403 limpia la sesión.
- Guarda la sesión en `localStorage` y la valida con `/api/auth/me` al cargar.
- **RBAC visual:** la vista `admin` y la estación de cámaras exigen rol `admin`/`security`; si no, el usuario ve una pantalla de "zona restringida" (también protegida en el servidor).

### Navbar.tsx
Marca UNIMINUTO, pestañas, tema claro/oscuro y menú de sesión.

### AuthModal.tsx
Login y registro sobre `/api/auth/sign-in` y `/api/auth/sign-up`.
> ⚠️ **Pendiente:** el formulario todavía ofrece elegir el rol, pero **el servidor lo ignora y siempre crea `student`**. Hay que quitar ese selector de la interfaz.

### MobileAppView.tsx
Carné Digital: foto de perfil, CC, rol, vigencia, QR peatonal y "manos libres".
- **Subir/quitar foto de perfil**: tocar la foto o el botón "Cambiar/Subir" abre el **modal `AvatarModal`**; el botón de quitar (papelera) actúa directo.
- **Enrolamiento facial integrado** (`<FaceEnrollment userId={...} />`) en la pestaña Carné.
- **Historial** de accesos del usuario con filtro Entradas/Salidas y estado dentro/fuera del campus.
- `authHeaders()` lee el token con `getStoredToken()` (arreglo #14).

### AvatarModal.tsx  ✔ (nuevo, #26)
Modal de cambio de foto de perfil:
- Fondo con `backdrop-blur`, cierre con ✕ / clic fuera / Escape (bloqueado mientras sube), tema claro/oscuro.
- Zona de subida por **clic o arrastrar** (JPG/PNG/WEBP, máx. 5 MB), vista previa de la nueva foto y botón Guardar.
- **Barra de progreso con porcentaje real** usando `XMLHttpRequest` (`upload.onprogress`), porque `fetch` no expone el avance de subida.
- Pantallas: "Preparando archivo…" → barra con % → éxito (cierra) / error con el motivo.

### FaceEnrollment.tsx  ✔ (actualizado #34)
Componente de enrolamiento facial **guiado**:

**1. Modal de recomendaciones (siempre visible)**
- Al hacer clic "Abrir cámara", **siempre** aparece un modal overlay con 6 recomendaciones:
  ☀️ Buena iluminación | 🧱 Fondo neutro | 👓 Sin accesorios | 👁️ Mirar a la cámara | 📏 Distancia 50–80 cm | 😐 Expresión neutra
- Sin "no mostrar de nuevo" → se muestra **cada vez** que se intenta enrolar o actualizar.

**2. 5 poses guiadas con delay de 1s**
| # | Pose | Ícono | Instrucción |
|---|---|---|---|
| 1 | Frontal | 👁️ | Mira de frente a la cámara |
| 2 | Perfil derecho | ➡️ | Gira ligeramente la cabeza a la derecha |
| 3 | Perfil izquierdo | ⬅️ | Gira ligeramente la cabeza a la izquierda |
| 4 | Mentón arriba | ⬆️ | Levanta ligeramente el mentón |
| 5 | Mentón abajo | ⬇️ | Baja ligeramente el mentón |

- Overlay en cámara: óvalo guía + label de pose + instrucción textual
- Tras captura: **1s de espera** + "Capturada, preparando siguiente pose..." + auto-avance
- Progreso: "Pose X de 5 · N/5 fotos capturadas"

**3. Validaciones reforzadas**
- **Mínimo 3 fotos** (`MIN_ENROLLMENT_PHOTOS = 3`); botón "Enrolar" deshabilitado hasta cumplir
- **Primera foto (frontal) = foto de perfil/avatar** del usuario
- **Sin botones "X" por foto** → no borrado individual; "Descartar" o cerrar cámara = reinicio completo

**4. Flujo técnico**
- Cámara (`getUserMedia`) → captura JPEG ≤ 720 px (`drawScaled`) → array `shots[]` con data-URLs
- Submit: `POST /api/users/:id/face-enrollment` con `{ dataUrls: shots, consent }`
- Backend: sube a Cloudinary → llama Python `/embed` → guarda `faceEmbeddings` 2D + `enrollmentPhotos` → deriva `faceEnrolled`

### RecognitionCameraModule.tsx 👁 — **simulación**
- `getUserMedia` 1280×720, overlay HUD en canvas, telemetría "AI: MOBILENET-V3" (**etiqueta visual: no hay modelo**).
- Modo Entrada/Salida, selector de **perfil a simular**, `handlePerformScan()` con latencia artificial de 850 ms, apertura de torniquete y sonido.
- Pase manual (RF-11).
- Solo operable por `admin`/`security`.

### AdminDashboard.tsx
Tabs **Stats / Usuarios / Bitácora**: KPIs, gráficas, crear/suspender/eliminar usuarios, filtros y búsqueda.
- **La descarga CSV es un botón, no un enlace:** necesita la cabecera `Authorization`, genera un `Blob` y lo libera al terminar.

### TechnicalInfoModal.tsx
Explica la arquitectura y el título del proyecto. **Actualizado en #25**: ya no menciona PostgreSQL/Drizzle ni la colección `sessions`; muestra el esquema Mongoose real y el stack MongoDB + Express + JWT/scrypt + Cloudinary.

---

## 8. Tipos compartidos — `src/types.ts`
`UserRole` (`admin|security|student|teacher|staff|visitor`), `UserStatus`, `AccessDirection` (`entry|exit`), `AccessMethod` (`facial_recognition|manual_contingency|qr_code`), `AccessStatus`, interfaces `UserProfile` (incluye `faceEnrolled`), `AccessLog`, `SystemStats`, `RecognitionCandidate`. **Sin tipos vehiculares:** el sistema es 100% peatonal.

---

## 9. Variables de entorno y secretos

`server.ts` carga el entorno con `import 'dotenv/config'`, por lo que **`.env` sí tiene efecto**. No existe `.env.example`; las variables reales están en `.env` (ignorado por git).

| Variable | Estado verificado (06/10/2026) | Uso |
|---|---|---|
| `MONGODB_URI`, `MONGODB_USERNAME`, `MONGODB_PASSWORD` | Configuradas | Conexión a Atlas |
| `SESSION_SECRET` | Configurada, pero **es el valor de ejemplo** | Firma de los JWT. **Cambiarla antes de desplegar** |
| `BETTER_AUTH_SECRET` | Configurada | resto del diseño anterior, sin uso actual |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | **Configuradas y verificadas** | Fotos de perfil + fotos de enrolamiento (borrado real probado) |
| `FACE_SERVICE_URL` | **Configurada: `http://127.0.0.1:8000`** | Servicio Python de embeddings faciales (§11.1) |
| `FACE_SERVICE_TIMEOUT_MS` | `8000` | Timeout al llamar a `/embed` |
| `FACE_MATCH_THRESHOLD` | `0.45` | Umbral de distancia coseno para decidir match |

> ⚠️ `atlas-credentials.env` **ya no existe** (las credenciales están en `.env`, que sí está ignorado por git).
> ⚠️ `GEMINI_API_KEY` queda en `.env` pero **su paquete fue eliminado** (#22); es residuo opcional de limpiar.
> ⚠️ **Nunca** versionar `.env` ni publicar estas credenciales. Si se compartieron, rotar la contraseña del clúster Atlas.

---

## 10. Estado de los datos

No hay datos semilla ni usuarios de demostración: **la base arranca limpia** y las personas se registran o las crea coordinación.

**Contenido actual de MongoDB (`uniminuto_acceso`) (29/09/2026):**

| Colección | Documentos | Nota |
|---|---|---|
| `users` | 1 | `luis@uniminuto.edu.co` (rol `student`). Limpieza #23: se eliminaron usuarios de prueba, se conservó solo a Luis |
| `access_logs` | 3 | Registros de acceso de `luis` |
| `revoked_tokens` | 0 | Los expirados se limpian solos por el índice TTL |
| `entry_points` | 0 | Modelo definido, sin datos |
| `sessions` | — | **Colección eliminada** (#23): el modelo se eliminó en #22 y quedó vacía |

> Para crear un administrador no hay cuenta de ejemplo: **usa el registro público y luego cambia el rol directamente en Mongo**, o pídeme que cree una cuenta de administración con contraseña conocida.

---

## 11. Límites conocidos y trabajo pendiente

### 11.1 El reconocimiento facial era una simulación — **ya no lo es** (cambios #29–#34)

Hasta el cambio #28 el reconocimiento era una simulación controlada por el navegador. Desde los cambios **#29–#34** el sistema tiene **visión artificial real** y **enrolamiento guiado**:

- **Microservicio Python** (`face_service/`, puerto 8000) con arquitectura por capas:
  - `FaceDetectorYuNet` (YuNet ONNX) → detecta rostro + landmarks.
  - `FaceEmbedder` (SFace ONNX) → rostro alineado 112×112 → vector 128-d normalizado (norma 1.0).
  - `FacePipeline` orquesta ambos; modelos cargados **una sola vez** al arrancar.
  - `ImageSource` acepta `data-URL` y **URL de Cloudinary** (flujo acordado).
  - `POST /embed` expone la inferencia; `GET /health` para supervisión.
- **Integración Node** (`src/lib/faceService.ts`):
  - `requestFaceEmbeddings(images[])` → Python.
  - `identifyFace(snapshotUrl)` → 1:N contra **todos** los usuarios con vectores en Mongo (`getAllUsersWithEmbeddings`).
  - Distancia coseno; umbral configurable `FACE_MATCH_THRESHOLD=0.45`.
- **Enrolamiento real guiado** (`POST /api/users/:id/face-enrollment`, `FaceEnrollment.tsx`):
  - **Modal de recomendaciones** siempre visible al abrir cámara.
  - **5 poses guiadas** (frontal, derecha, izquierda, mentón arriba/abajo) con **delay 1s** entre capturas.
  - **Mínimo 3 fotos obligatorias**; primera foto (frontal) = avatar/perfil.
  - **Sin borrado individual** de fotos; reinicio completo para rehacer.
  - Sube fotos a Cloudinary → llama `/embed` con URLs → guarda `faceEmbeddings` 2D en Mongo.
  - Estado `enrolled` (ya no `photos_pending`).
- **Verificación real** (`POST /api/recognition/verify-face`):
  - Snapshot a Cloudinary → `identifyFace` → match 1:N → decisión por umbral.
  - `authorized: true/false` + `confidenceScore` real + log en bitácora.
  - Si no hay match → `status: denied`, `userName: "Persona No Identificada"`, **alerta `severity: "high"`** para celador.

> **Para la defensa:** el sistema **ya no simula**. Hay modelos ONNX reales (YuNet + SFace), inferencia en CPU, vectores normalizados, comparación coseno 1:N, **enrolamiento guiado con poses estandarizadas**, y decisión biométrica auditable en bitácora.

### 11.2 Pendientes de seguridad (por prioridad)

✔️ **Límite de intentos de login — HECHO (cambio #28).** Ver §4.5.

| # | Pendiente | Motivo |
|---|---|---|
| 1 | **Exponer solo datos mínimos** | `GET /api/users` la llama cualquier usuario autenticado y devuelve nombre, cédula y foto de todos; en cambio **no existe** `GET /api/users/me` y el usuario no puede cambiar su propia contraseña |
| 2 | **Modelo de registro** | El registro público sigue abierto |
| 3 | **Cabeceras de seguridad (CSP, HSTS, X-Frame-Options)** | No hay ninguna; la app puede incrustarse en un iframe y no hay mitigación de XSS |
| 4 | **`SESSION_SECRET` real** | Sigue el valor de ejemplo |
| 5 | **Token en `localStorage`** | Legible por JavaScript. Alternativa: cookie `httpOnly` con protección CSRF (jornada de trabajo completa) |
| 6 | **Selector de rol en `AuthModal`** | La interfaz lo ofrece, pero el servidor lo ignora: experiencia engañosa |
| 7 | **Límite del cuerpo por ruta** | `express.json` acepta 10 MB en todas las rutas |
| 8 | **Paginación y búsqueda** | La bitácora se trae entera y no hay búsqueda de usuarios |

---

## 12. Flujo de datos de un escaneo facial (real, implementado)

1. Usuario `admin`/`security` abre **Cámaras / Visión IA** (verificado en servidor).
2. Modo **ENTRADA** o **SALIDA** + pulsa **Escanear Rostro** (no hay selector de perfil: la IA busca en toda la BD).
3. `RecognitionCameraModule` captura snapshot → sube a Cloudinary → `POST /api/recognition/verify-face { snapshotUrl, direction }`.
4. Servidor valida token + rol (`admin`/`security`).
5. `identifyFace(snapshotUrl)`:
   - `requestFaceEmbeddings([snapshotUrl])` → Python `/embed` → vector 128-d del snapshot.
   - `getAllUsersWithEmbeddings()` → todos los usuarios con `faceEmbeddings` en Mongo.
   - Distancia coseno del vector contra **cada vector de cada usuario** (1:N).
   - Gana el de menor distancia; si ≤ `FACE_MATCH_THRESHOLD` (0.45) → **match**.
6. `confidence = match ? 1 - distancia : 0`.
7. `authorized = match && user.status === 'active'`.
8. `addAccessLog` con `method: 'facial_recognition'`, `confidenceScore`, `notes`, `snapshotUrl`.
9. Respuesta: `authorized: true/false`, `user` (si match), `confidence`, `log`, `message`, `alert` (si denegado, `severity: "high"` para celador).

> **El sistema ya no simula.** Los pasos 5–8 son la inferencia real (Python + Node) con decisión biométrica auditable.

---

## 13. Verificación

| Suite | Casos | Resultado |
|---|---|---|
| Autorización por rol | 36 | 36/36 |
| Contraseñas y migración | 20 | 20/20 |
| Regresión de permisos y sesión | 8 | 8/8 |
| Foto de perfil | 10 | 10/10 |
| **Total (previo)** | **74** | **74/74** |
| Enrolamiento facial real | 5 | 5/5 |
| Verificación facial real (match / no-match) | 6 | 6/6 |
| Python `/embed` + `demo_camera_vectors` | 4 | 4/4 |
| Enrolamiento guiado (poses, delay, modal, min 3) | 6 | 6/6 |
| **Total (incl. IA facial + guiado)** | **95** | **95/95** |

Verificación adicional de esta etapa: flujo real de **enrolamiento** (captura → Cloudinary → `/embed` → vectores 128-d → MongoDB `faceEmbeddings` 2D), **verificación** 1:N con distancia coseno (match = Luis, no-match = denegado + bitácora + alerta), servicio Python `/health` + `/embed` probados, `demo_camera_vectors.py` con cámara en tiempo real (30 FPS, YuNet + SFace, identificación 1:N), **enrolamiento guiado** (modal recomendaciones, 5 poses con delay 1s, mínimo 3 fotos, primera=avatar, sin borrado individual). `npm.cmd run lint` (`tsc --noEmit`) y `npm run build` sin errores.

---

## 14. Comandos útiles

```bash
# Instalar dependencias
npm.cmd install

# Desarrollo (Express + Vite) en http://localhost:3000
npm.cmd run dev

# Verificar tipos (SIEMPRE antes de probar)
npm.cmd run lint

# Producción
npm.cmd run build
npm.cmd start
```
