# QUINTO INFORME DE CAMBIOS

> **Proyecto:** Sistema de Control de Acceso — UNIMINUTO Sede Ibagué
> **Directorio del proyecto:** `C:\Users\losor\Desktop\proyecto entrada\sistema-de-control-de-acceso---uniminuto-sede-ibague actua`
> **Fecha:** 2026-09-30
> **Informes anteriores:** `cambios_informe/INFORME_DE_CAMBIOS.md` (#01–#02), `cambios_informe/SEGUNDO_INFORME_DE_CAMBIOS.md` (#03–#04), `cambios_informe/TERCER_INFORME_DE_CAMBIOS.md` (#05–#13) y `cambios_informe/CUARTO_INFORME_DE_CAMBIOS.md` (#14–#25)
> **Cambios de este documento:** #26 a #28
> **Alcance:** modal propio para cambiar la foto de perfil con barra de progreso, imagen de respaldo local y centralizada, y límite de intentos de inicio de sesión.

---

## Índice de cambios

| # | Cambio | Área |
|---|---|---|
| #26 | Modal "Foto de perfil" con barra de progreso y porcentaje | Interfaz |
| #27 | Imagen de respaldo del perfil: local y en una sola constante | Interfaz / Mantenimiento |
| #28 | Límite de intentos de inicio de sesión (anti fuerza bruta) | Seguridad |

---

## 1. Cambio #26 — "Modal de foto de perfil con progreso"

### 1.1 Problema
El perfil se actualizaba abriendo el diálogo de archivos del sistema directamente y subiendo al instante; no había confirmación visual previa ni indicación del avance de la subida.

### 1.2 Solución
Nuevo componente **`src/components/AvatarModal.tsx`**, con el mismo lenguaje visual del resto de la app:

- **Overlay:** fondo oscuro con `backdrop-blur`, tarjeta centrada (mismo patrón de `TechnicalInfoModal`), soporte de tema claro/oscuro. Cierre con botón ✕, clic fuera o tecla `Escape` (bloqueado mientras sube).
- **Contenido:**
  - Vista previa de la foto actual (o la imagen de respaldo).
  - Zona de subida: clic o **arrastrar y soltar** (acepta JPG, PNG y WEBP, máx. 5 MB), con validación idéntica a la anterior.
  - Al elegir archivo: vista previa de la **nueva** foto (etiqueta "Nueva foto") y botón **Guardar**.
  - Barra de **progreso con porcentaje real** durante la subida.
- **Progreso real con `XMLHttpRequest`:** el `fetch` no expone el avance de subida de forma fiable, por lo que la petición usa `XHR` con `xhr.upload.onprogress` → `porcentaje = (loaded/total)*100`. Estados visibles:
  1. "Preparando archivo…" (spinner) mientras se lee y convierte a base64.
  2. Barra + `%` durante la subida al servidor.
  3. Éxito en verde → cierra el modal al actualizar.
  4. Error en rojo dentro del modal (p. ej. PDF rechazado, > 5 MB).
- **Comportamiento**: al guardar llama a `onUserUpdated(payload.user)` y `onRefresh()`, igual que el flujo anterior; el botón **Quitar** (papelera) se mantiene directo en el carné, sin modal.

### 1.3 Archivos
- `src/components/AvatarModal.tsx` (**nuevo**)
- `src/components/MobileAppView.tsx` — el botón "Cambiar/Subir" y tocar la foto abren el modal; se retiraron del componente la lectura de archivo, la validación y la subida duplicadas.

---

## 2. Cambio #27 — "Imagen de respaldo local y centralizada"

### 2.1 Problema
La imagen que aparece cuando el usuario no tiene foto de perfil era una **URL de Unsplash** y estaba **duplicada en 6 lugares**. Peor aún, la capa de datos (`src/db/index.ts`) y el panel admin **guardaban esa URL como foto real** al crear usuarios, de modo que el "placeholder" quedaba escrito como avatar verdadero.

### 2.2 Solución
- **Imagen local:** el archivo `none_profile.jpg` se movió a `public/img/none_profile.jpg`, se sirve en `/img/none_profile.jpg` y queda copiado en el build (`dist/img/none_profile.jpg`). **Ya no depende de internet.**
- **Constante única:** `AVATAR_FALLBACK` exportada desde `src/lib/api.ts`; todos los componentes la importan:
  - `MobileAppView.tsx`, `AvatarModal.tsx`, `Navbar.tsx` (que además tenía **otra** Unsplash distinta), `RecognitionCameraModule.tsx`, `AdminDashboard.tsx`.
- **Se corrigió** que `AdminDashboard` dejara de escribir la URL externa en el campo `avatarUrl` al crear usuarios (ahora queda sin avatar y el frontend muestra el respaldo), y que `src/db/index.ts` no inyectara más la URL de Unsplash en `createUser`.

### 2.3 Resultado
Para cambiar la imagen de respaldo del sistema se edita **una sola línea** (`src/lib/api.ts`, `AVATAR_FALLBACK`).

---

## 3. Cambio #28 — "Límite de intentos de inicio de sesión"

### 3.1 Problema
`POST /api/auth/sign-in` aceptaba intentos sin límite: un atacante podía probar contraseñas en un bucle. scrypt (~195 ms por hash) hace costosa cada prueba, pero no detiene el ataque (ver pendiente #1 de §11.2).

### 3.2 Solución
Nuevo módulo **`src/lib/rateLimit.ts`** y su conexión en `server.ts`:

- **Ventana fija de 15 minutos** con dos niveles de protección:
  - **Por cuenta + IP:** 5 fallos consecutivos bloquean esa combinación.
  - **Por IP (global):** 20 fallos bloquean toda la IP (evita distribuir el ataque entre varias cuentas).
- Mientras hay bloqueo el servidor responde **429** con `retryAfterSeconds` y **sin evaluar credenciales** (no sigue trabajando).
- Normalización previa: correo a `trim().toLowerCase()`; IP desde `x-forwarded-for` (primera entrada) o `socket.remoteAddress`.
- **Retardo defensivo:** cada intento fallido añade 400 ms adicionales (`LOGIN_FAILURE_EXTRA_DELAY_MS`), ralentizando fuerza bruta incluso por debajo del umbral.
- **Sin castigo por NAT de campus:** un login correcto limpia el contador de la cuenta y resta 2 al contador global de la IP, de modo que decenas de estudiantes compartiendo la misma salida a internet no bloquean a todo el bloque.
- **Almacenamiento en memoria** (contadores que se reinician al reiniciar el proceso): suficiente en una sola instancia; si se escala horizontalmente hay que migrarlos a Redis o Mongo.

### 3.3 Verificación en vivo
- 5 intentos con contraseña incorrecta → **401** en cada uno.
- El 6.º intento (contando con la contraseña **correcta**) → **429 bloqueado**.
- Tras reiniciar el servidor (se vacían los contadores), el login correcto responde **200** con token.

---

## 4. Verificación general de la etapa

- `npx tsc --noEmit` limpio y `npm run build` sin errores.
- `dist/img/none_profile.jpg` presente en el build.
- `GET /img/none_profile.jpg` responde **HTTP 200 con `image/jpeg`** en el servidor en ejecución.
- Flujo del modal: subir imagen reemplaza el avatar (Cloudinary + Mongo), y al quitar la foto vuelve la imagen de respaldo local.

---

**Documento preparado por:** Seguimiento de cambios del proyecto
**Versión:** 1.1 (Quinto informe, incluye #28)
**Fecha:** 2026-09-30
**Confidencialidad:** Interno - Uso técnico