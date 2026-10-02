# TERCER INFORME DE CAMBIOS

> **Proyecto:** Sistema de Control de Acceso — UNIMINUTO Sede Ibagué
> **Directorio del proyecto:** `C:\Users\losor\Desktop\proyecto entrada\sistema-de-control-de-acceso---uniminuto-sede-ibague actua`
> **Fecha:** 2026-09-26
> **Informes anteriores:** `cambios_informe/INFORME_DE_CAMBIOS.md` (cambios #01 y #02) y `cambios_informe/SEGUNDO_INFORME_DE_CAMBIOS.md` (cambios #03 y #04)
> **Cambios de este documento:** #05 a #13
> **Alcance:** sesión de trabajo del 25 y 26 de septiembre de 2026. Datos biométricos, foto de perfil, autenticación por JWT y endurecimiento de seguridad de la API.

---

## Índice de cambios

| # | Cambio | Área |
|---|---|---|
| #05 | Estructura de datos biométricos en MongoDB | Base de datos |
| #06 | Foto de perfil del usuario (carné digital) | Funcional |
| #07 | Migración de sesiones en memoria a JWT | Autenticación |
| #08 | Revocación inmediata de tokens | Autenticación |
| #09 | Autorización por rol en toda la API | Seguridad |
| #10 | Cierre del bypass de registro público | Seguridad |
| #11 | Contraseñas con scrypt y sal (migración transparente) | Seguridad |
| #12 | Endurecimiento del cliente (envío de token y UI) | Interfaz |
| #13 | Vigencia del JWT ajustada a 1 día | Autenticación |

---

## 1. Cambio #05 — "Estructura de datos biométricos en MongoDB"

### 1.1 Resumen

Se definió la estructura que almacenará los datos de reconocimiento facial **dentro del documento de usuario** en MongoDB, dejando el módulo listo para el vectorizado posterior en Python.

### 1.2 Campos agregados

| Campo | Tipo | Descripción |
|---|---|---|
| `faceEnrolled` | `boolean` | Indica si el rostro está enrolado (fotos + embeddings disponibles) |
| `faceEmbeddings` | `number[][]` | Vectores de características faciales. 1 fila por foto de enrolamiento |
| `enrollmentPhotos` | `{ photoUrl, photoPublicId }[]` | Referencias a las N fotos usadas para generar los vectores |

### 1.3 Archivos modificados
- `src/db/mongo/models.ts` — esquema de usuario con los tres campos.
- `src/db/index.ts` — normalización, mapeo Mongo ↔ aplicación y filtrado de datos privados.
- `src/types.ts` — contratos `UserProfile`, `EnrollmentPhotoRef`.

### 1.4 Detalle técnico relevante
- **Normalización 1D → 2D:** la API recibe `faceEmbeddings: number[]` (una captura) y la capa de datos la guarda como `[vector]` en Mongo. Esto evita la ambigüedad entre "un vector" y "varios vectores", que fue la causa de un error real de tipos.
- **`toSafeUser()`** excluye `faceEmbeddings` y `passwordHash`: ningún endpoint de lectura los expone.
- **`updateUser()`** mantiene la coherencia entre `faceEmbeddings` y `faceEnrolled` (si hay vectores, `faceEnrolled` queda en `true`).

---

## 2. Cambio #06 — "Foto de perfil del usuario"

### 2.1 Resumen
Se permitio que cada usuario cargue una imagen de perfil desde el Carné Digital, con almacenamiento dual: **Cloudinary** si hay credenciales configuradas, o **disco local** como respaldo.

### 2.2 Endpoints

| Método | Ruta | Regla |
|---|---|---|
| `POST` | `/api/users/:id/avatar` | Propietario, `admin` o `security` |
| `DELETE` | `/api/users/:id/avatar` | Propietario, `admin` o `security` |

### 2.3 Validaciones
- Solo JPG, PNG y WEBP.
- Máximo 5 MB.
- Base64 validado en el servidor.
- Al reemplazar, se elimina la imagen anterior para no acumular archivos.

### 2.4 Almacenamiento
- `src/lib/imageStorage.ts` implementa la misma interfaz para ambos casos.
- Cloudinary por **API REST con firma** (sin SDK).
- Respaldo local en `uploads/avatars/`, servido como estático.
- **Estado actual (verificado el 26/09/2026):** las variables `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` **están configuradas**, por lo que las imágenes se almacenan en Cloudinary. El respaldo en disco (`uploads/avatars/`) queda activo solo si esas variables se vacían. Queda pendiente confirmar las credenciales con una subida real al servicio.

### 2.5 Verificación
Prueba E2E de 10 casos: sin token (401), carga correcta (200), reemplazo, rechazo de PDF, eliminación, rechazo de otro usuario (403) y persistencia real en Mongo.

---

## 3. Cambio #07 — "Migración de sesiones en memoria a JWT"

### 3.1 Resumen
Las sesiones dejaron de vivir en un `Map` de memoria (que se perdía al reiniciar el servidor) y pasaron a **tokens firmados**.

### 3.2 Cambios
- Se instaló `jsonwebtoken@9` y `@types/jsonwebtoken`.
- Nuevo archivo `src/lib/jwt.ts` con:
  - `SESSION_TTL_SECONDS` — vigencia configurable de la sesión.
  - `signSessionToken()` — firma HS256 con `sub`, `jti`, `exp`, `iss`, `aud` y datos mínimos del usuario.
  - `verifySessionToken()` — valida firma, emisor, audiencia y expiración.
  - Guardia que exige `SESSION_SECRET` en `.env`.
- Se eliminó la colección `sessions`.
- Se añadió `esModuleInterop` a `tsconfig.json`.

### 3.3 Efecto
Los tokens **sobreviven a reinicios del servidor** (antes cada reinicio cerraba todas las sesiones). Verificado: el token siguió funcionando tras reiniciar el proceso.

---

## 4. Cambio #08 — "Revocación inmediata de tokens"

### 4.1 Problema
Un JWT no se puede "deshacer": cerrar sesión no invalidaba el token, que seguía válido hasta expirar.

### 4.2 Solución
Se añadió la colección **`revoked_tokens`** con los `jti` de las sesiones cerradas:

| Campo | Contenido |
|---|---|
| `jti` | Identificador único del token revocado (índice único) |
| `userId` | Dueño de la sesión |
| `expiresAt` | Fecha de expiración natural del token |

- **Índice TTL en `expiresAt`**: MongoDB borra los registros cuando el token habría expirado, así la colección no crece sin control.
- Funciones `isTokenRevoked(jti)` y `revokeToken(...)` en la capa de datos.
- `POST /api/auth/sign-out` revoca el token actual.
- El middleware `authenticateToken` consulta la revocación en cada petición.

### 4.3 Comportamiento verificado
- Cerrar sesión invalida **solo** ese token; otras sesiones del mismo usuario siguen activas.
- Un token revocado responde 401 aunque el servidor se reinicie.
- Collection verificada en Atlas con los índices `jti_1`, `userId_1` y `expiresAt_1` (TTL).

---

## 5. Cambio #09 — "Autorización por rol en toda la API"

### 5.1 Problema encontrado
Al auditar el código se descubrió que **cuatro rutas de gestión de usuarios no exigían autenticación**:

| RutaAbierta | Consecuencia |
|---|---|
| `GET /api/users` | Cualquiera listaba nombre, cédula, correo y foto de todos los usuarios |
| `POST /api/users` | Cualquiera creaba una cuenta, incluso con `role: "admin"` |
| `PUT /api/users/:id` | Cualquiera modificaba cualquier usuario, **incluido su rol** |
| `DELETE /api/users/:id` | Cualquiera borraba usuarios |

Además, `/api/recognition/*`, `/api/access-logs`, `/api/access-logs/export`, `/api/stats`, `/api/db-status` y `/api/mongodb/*` tampoco estaban protegidas. Esta última permiten **reconfigurar la base de datos de toda la aplicación** con una URI arbitraria.

### 5.2 Solución
Se creó el middleware `requireRole(...roles)` y se aplicó el siguiente mapa:

| Ruta | Token | Rol requerido |
|---|---|---|
| `POST /api/auth/sign-in` · `sign-up` | No | Público |
| `GET /api/auth/me` | Sí | Cualquiera |
| `POST /api/auth/sign-out` | Sí | Cualquiera |
| `GET /api/users` · `/api/users/:id` | Sí | Cualquiera |
| `POST /api/users` | Sí | `admin`, `security` |
| `PUT /api/users/:id` | Sí | `admin`, `security` |
| `PATCH /api/users/:id/status` | Sí | **Solo `admin`** |
| `DELETE /api/users/:id` | Sí | **Solo `admin`** |
| `POST`/`DELETE /api/users/:id/avatar` | Sí | Propietario, `admin`, `security` |
| `GET /api/recognition/candidates` | Sí | `admin`, `security` |
| `POST /api/recognition/verify-face` · `manual-access` | Sí | `admin`, `security` |
| `GET /api/access-logs` | Sí | Cualquiera (ver 5.4) |
| `GET /api/access-logs/export` | Sí | `admin`, `security` |
| `GET /api/stats` | Sí | Cualquiera |
| `GET /api/db-status` · `/api/mongodb/status` · `/api/mongodb/connect` | Sí | **Solo `admin`** |

### 5.3 Reglas contra escalada de privilegios
- **Solo un `admin`** puede modificar el campo `role`.
- **`security` no puede** crear cuentas de administrador.
- **Solo `admin`** puede activar o suspender cuentas.
- **Nadie** puede cambiar su propio rol ni eliminar su propia cuenta.
- `passwordHash` e `id` se descartan del cuerpo en las actualizaciones.
- Se eliminó una **ruta duplicada** de `PATCH /api/users/:id/status` que quedaba sin protección por debajo de las de avatar.

### 5.4 Minimización de datos
En `GET /api/access-logs`, si quien consulta **no** es `admin` ni `security`, el servidor **ignora el `userId` que envíe el cliente** y devuelve únicamente su propio historial. Un estudiante no puede leer los accesos de terceros.

### 5.5 Verificación
**36 pruebas E2E** sobre HTTP real, todas superadas: 13 rutas sin token devuelven 401; estudiante recibe 403 en toda operación sensible; `security` puede crear usuarios pero no escalar privilegios; `admin` sí puede; el aislamiento de datos funciona; token falso y cabecera ausente devuelven 401.

---

## 6. Cambio #10 — "Cierre del bypass de registro público"

### 6.1 Problema crítico
La ruta `POST /api/auth/sign-up` leía el rol del cuerpo de la petición y lo pasaba directo a la creación del usuario:

```ts
const { name, email, password, role = 'student', ... } = req.body;
createUser({ name, email, password, role: role as UserRole, ... });
```

**Cualquier visitante podía registrarse como administrador** sin autenticarse. Se comprobó por HTTP: la cuenta creada recibía `role: "admin"` y su token pasaba la comprobación de `requireRole('admin')`.

Este agujero era más grave que las cuatro rutas abiertas del cambio #09, porque anulaba por completo el control de roles.

### 6.2 Solución
El registro público **fuerza `role: 'student'`** e ignora cualquier rol enviado por el cliente. Los roles privilegiados solo se conceden por `POST /api/users`, que ya exige `admin` o `security`.

### 6.3 Verificación
Registro pidiendo `role: "admin"` → HTTP 201 con `role: "student"`. Con ese token, `DELETE /api/users/:id` responde **403 "Acceso restringido: requiere rol admin"**.

---

## 7. Cambio #11 — "Contraseñas con scrypt y sal"

### 7.1 Problema
Las contraseñas se guardaban con SHA-256 **sin sal**:
```ts
crypto.createHash('sha256').update(plain).digest('hex')
```
Consecuencias: usuarios con la misma contraseña producían el mismo hash; las tablas precalculadas de contraseñas comunes son triviales de construir; y SHA-256 es tan rápido que la fuerza bruta es viable por hardware.

### 7.2 Solución
Nuevo archivo `src/lib/password.ts`:

- **Algoritmo:** scrypt con `N=2^16`, `r=8`, `p=1` (~64 MB por hash; mínimo recomendado por OWASP para scrypt).
- **Sal:** 16 bytes aleatorios por usuario.
- **Longitud de clave:** 64 bytes.
- **Formato versionado:** `scrypt$N$r$p$sal(base64)$hash(base64)`.
- **Comparación en tiempo constante** con `crypto.timingSafeEqual`.
- **Coste medido:** 195 ms por hash y por verificación.

### 7.3 Migración transparente
Para no perder ninguna cuenta existente, el hash antiguo se reconoce en el inicio de sesión:
1. Si el hash almacenado es SHA-256 de 64 hexadecimales, se verifica con el método antiguo.
2. Si coincide, **se reescribe de inmediato con scrypt** y la operación continúa con normalidad.
3. El usuario no percibe nada y su cuenta queda protegida desde ese momento.

El SHA-256 queda relegado **solo a la función de compatibilidad**; ya no se usa para almacenar contraseñas nuevas.

### 7.4 Endurecimiento adicional
- **Mínimo de 8 caracteres** al registrarse y cuando coordinación crea usuarios. No se exige en el inicio de sesión, para no bloquear cuentas antiguas con contraseñas cortas.
- **Anti-enumeración de cuentas:** el inicio de sesión devuelve el mismo mensaje ("Credenciales inválidas") y ejecuta el mismo trabajo tanto si el correo no existe como si la contraseña es incorrecta. Antes un atacante podía enumerar qué correos están registrados.

### 7.5 Verificación
**20 pruebas** superadas: formato del hash, dos usuarios con la misma contraseña producen hashes distintos, la contraseña nunca aparece en el hash, login correcto e incorrecto, migración real de una cuenta con SHA-256 (verificada antes y después en Mongo), política de longitud y ausencia de `passwordHash` en las respuestas.

---

## 8. Cambio #12 — "Endurecimiento del cliente"

### 8.1 Resumen
Al exigir token a las rutas, el frontend dejó de funcionar. Se corrigió para que toda llamada a la API lo envíe.

### 8.2 Cambios
- Nuevo archivo `src/lib/api.ts` con `authFetch()`, que adjunta la cabecera `Authorization` automáticamente.
- `src/App.tsx`: los datos del sistema se recargan cuando cambia la sesión; si la respuesta es 401 o 403, la sesión local se limpia.
- `src/components/AdminDashboard.tsx`: creación, suspensión y eliminación de usuarios usan el token.
- `src/components/MobileAppView.tsx`: el historial de accesos propio se pide con token.
- `src/components/RecognitionCameraModule.tsx`: verificación facial y pase manual usan el token.

### 8.3 Dos casos que se habrían roto
- **Descarga CSV:** era un enlace `<a href>`, que no puede enviar cabeceras. Se convirtió en un botón que descarga el archivo con el token, genera un `Blob` y lo libera al terminar.
- **Pestaña "Cámaras / Visión IA":** era visible para cualquier estudiante, pero sus rutas ahora exigen rol. Se añadió una pantalla de "Estación de vigilancia restringida" en lugar de mostrar errores 403.

---

## 9. Cambio #13 — "Vigencia del JWT ajustada a 1 día"

### 9.1 Cambio
`SESSION_TTL_SECONDS` pasó de `7 * 24 * 60 * 60` (7 días) a `24 * 60 * 60` (**1 día**).

### 9.2 Corrección asociada
Al verificar el cambio se detectó una inconsistencia: `signSessionToken()` calculaba `expiresAt` con milisegundos, mientras `jsonwebtoken` redondea el `iat` a segundos enteros, de modo que la fecha de la respuesta y el claim `exp` del token se diferían una fracción de segundo. Ahora ambas parten del mismo segundo.

### 9.3 Verificación
Token generado expiraba en **24.000 horas exactas** y la fecha del claim coincide con la de la respuesta. `tsc --noEmit` limpio.

---

## 10. Limpieza de datos

Durante la verificación se eliminaron de MongoDB todos los artefactos de prueba:
- Usuarios creados para las pruebas (se detectó además un residuo con dominio `@t.co` que la limpieza inicial no cubrió).
- Registros de acceso de prueba en `access_logs`.
- Tokens revocados huérfanos de usuarios ya eliminados.
- La cuenta `test.otro.1790381137@uniminuto.edu.co`, residuo de una sesión anterior.

**Estado de la base al cerrar este informe:**

| Colección | Documentos |
|---|---|
| `users` | 1 (`luis@uniminuto.edu.co`, rol `student`, hash SHA-256 heredado) |
| `access_logs` | 6 |
| `revoked_tokens` | 0 (los expirados se limpian solos por TTL) |

El usuario existente conserva su hash antiguo y **migrará a scrypt automáticamente en su próximo inicio de sesión**; no requiere acción manual.

---

## 11. Resumen comparativo: qué cambió respecto a los informes anteriores

Esta sección responde a la pregunta de **qué es distinto hoy frente a lo que describían `INFORME_DE_CAMBIOS.md` y `SEGUNDO_INFORME_DE_CAMBIOS.md`**.

### 11.1 Lo que los informes anteriores describían y hoy ya no es así

| Antes (24/09) | Hoy (26/09) |
|---|---|
| "Las **sesiones siguen en memoria** (7 días)" | Sesiones firmadas **JWT** de 1 día, que sobreviven reinicios y se revocan al cerrar sesión |
| Colección `sessions` en el store | **Eliminada**; en su lugar, tokens stateless + colección `revoked_tokens` con TTL |
| Contraseñas con SHA-256 **sin sal** | **scrypt** con sal aleatoria y comparación en tiempo constante |
| Cuatro rutas de usuarios **abiertas** (crear, editar, borrar, listar) | Todas exigen **token y rol**; el registro público ya no acepta roles del cliente |
| `/api/mongodb/connect` sin protección | **Solo `admin`** (permite reconectar toda la base de datos) |
| Sin datos biométricos | `faceEnrolled`, `faceEmbeddings` y `enrollmentPhotos` en `users` |
| Sin foto de perfil | Foto de perfil con Cloudinary o respaldo local, validada y con control de propiedad |
| Frontend sin manejo de token | `authFetch()` centralizado; descarga CSV y estación de cámara alineadas con el servidor |
| `PLAN_DE_DESARROLLO.md` y el plan final como documentos de control | Este Tercer Informe y el bloque comparativo de la sección 11 |

### 11.2 Lo que este informe añade y antes no existía
1. **Un modelo de autorización por rol documentado** (sección 5.2), inexistente en los informes previos.
2. **Registro de dos vulnerabilidades críticas** que no se habían detectado: el bypass de registro público (cambio #10) y la gravedad de la configuración de contraseñas (cambio #11).
3. **Estrategia de migración de contraseñas** que evita perder cuentas existentes.
4. **Pruebas de seguridad automatizadas** (64 aserciones E2E repartidas en autorización, contraseñas y regresión) como criterio de verificación, frente a la verificación manual de los informes anteriores.
5. **Estado real y honesto del módulo de reconocimiento facial**, que sigue siendo una simulación (ver 12.1).

### 11.3 Cambios de arquitectura
- **Base de datos:** se consolidó **MongoDB como única fuente de verdad**. Las dependencias de Neon/PostgreSQL y Drizzle permanecen instaladas pero **sin uso**; el archivo `src/db/schema.ts` quedó fuera del flujo.
- **Autenticación:** de sesiones en memoria a JWT firmados con revocación en base de datos.
- **Servidor:** se añadió una capa de middlewares reutilizable (`authenticateToken`, `requireRole`) en lugar de validaciones dispersas.

---

## 12. Estado actual y trabajo pendiente

### 12.1 Límites conocidos del sistema (importante para la defensa del proyecto)

**El reconocimiento facial es una simulación, no una implementación:**
- **No hay ninguna librería de visión artificial instalada** (nada de face-api, TensorFlow.js, ONNX, MediaPipe u OpenCV). La interfaz muestra la etiqueta "MobileNet-V3", pero **no existe modelo ni inferencia**.
- `POST /api/recognition/verify-face` **no calcula nada**: recibe el `matchedUserId` desde el navegador y registra el acceso.
- `faceEmbeddings` **se guarda pero nunca se lee**: no hay comparación de vectores ni distancia coseno.
- **No existe flujo de enrolamiento**: nadie sube fotos de entrenamiento ni genera embeddings.
- **Bug conocido:** `GET /api/recognition/candidates` devuelve `faceEnrolled: true` **fijado** y sin filtrar, por lo que presenta como inscritos a usuarios que no lo están. `AdminDashboard` hace lo mismo al crear usuarios.

### 12.2 Pendientes de seguridad, por prioridad

| # | Pendiente | Motivo |
|---|---|---|
| 1 | **Límite de intentos de inicio de sesión** | No hay bloqueo tras fallos: se puede hacer fuerza bruta. scrypt (195 ms) la frena, pero no la detiene |
| 2 | **Modelo de registro** | El registro público sigue abierto. Con solo registrarse, un desconocido lista nombre, cédula y foto de toda la comunidad |
| 3 | **Cabeceras de seguridad (CSP, HSTS, X-Frame-Options)** | No hay ninguna. La app puede incrustarse en un iframe y no hay mitigación de XSS |
| 4 | **`SESSION_SECRET` real** | Sigue el valor de ejemplo. Debe ser largo y aleatorio antes de desplegar |
| 5 | **Token en `localStorage`** | Legible por JavaScript. La alternativa es cookie `httpOnly` con protección CSRF; jornada de trabajo completa |
| 6 | **Cloudinary sin verificar** | Las credenciales están configuradas, pero no se ha comprobado una subida real al servicio |
| 7 | **Límite del cuerpo por ruta** | `express.json` acepta 10 MB en todas las rutas, incluso las que no reciben imágenes |

### 12.3 Verificaciones ejecutadas

| Suite | Casos | Resultado |
|---|---|---|
| Autorización por rol | 36 | 36/36 |
| Contraseñas y migración | 20 | 20/20 |
| Regresión de permisos y sesión | 8 | 8/8 |
| Foto de perfil (informe #06) | 10 | 10/10 |
| **Total en esta sesión** | **64** | **64/64** |

Además: `npm run lint` (`tsc --noEmit`) y `npm run build` sin errores tras cada bloque de cambios.

> **Advertencia operativa:** `tsx server.ts` **no recarga el código automáticamente**. Tras modificar `server.ts` es obligatorio reiniciar el proceso, o las pruebas se ejecutarán contra el código anterior. Conviene verificar que el puerto 3000 no esté ocupado por una instancia anterior:
> `Get-NetTCPConnection -LocalPort 3000 -State Listen`

---

**Documento preparado por:** Seguimiento de cambios del proyecto
**Versión:** 1.0 (Tercer informe)
**Fecha:** 2026-09-26
**Confidencialidad:** Interno - Uso técnico
