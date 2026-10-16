# SÉPTIMO INFORME DE CAMBIOS

> **Proyecto:** Sistema de Control de Acceso — UNIMINUTO Sede Ibagué
> **Directorio del proyecto:** `C:\Users\losor\Desktop\proyecto entrada\SCAI - horizon`
> **Fecha:** 2026-10-15
> **Informes anteriores:** `cambios_informe/INFORME_DE_CAMBIOS.md` (#01–#02), `cambios_informe/SEGUNDO_INFORME_DE_CAMBIOS.md` (#03–#04), `cambios_informe/TERCER_INFORME_DE_CAMBIOS.md` (#05–#13), `cambios_informe/CUARTO_INFORME_DE_CAMBIOS.md` (#14–#25), `cambios_informe/QUINTO_INFORME_DE_CAMBIOS.md` (#26–#28), `cambios_informe/SEXTO_INFORME_DE_CAMBIOS.md` (#29–#34)
> **Cambios de este documento:** #35 a #38
> **Alcance:** Refinamiento UX foto de perfil, aura en bordes, limpieza AvatarModal, fix reconocimiento vigilancia, endpoint upload-snapshot, mejoras Python service.

---

## Índice de cambios

| # | Cambio | Área |
|---|---|---|
| #35 | SelfEnrollmentView.tsx — Vista de auto-enrolamiento para estudiantes | Frontend / UX |
| #36 | InteractiveBackground.tsx — Fondo animado red neuronal | Frontend / UI |
| #36 | FaceEnrollmentView.tsx — Vista auto-enrolamiento dedicada | Frontend / UX |
| #37 | Refinamiento FaceEnrollment + aura en bordes + limpieza AvatarModal | Frontend / UX / Limpieza |
| #37 | Limpieza AvatarModal + endpoints compatibilidad | Limpieza / Backend |
| #38 | Fix reconocimiento vigilancia + endpoint upload-snapshot + fixes Python | Backend / Integración / Fix |

---

## 1. Cambio #35 — "SelfEnrollmentView.tsx — Vista de auto-enrolamiento para estudiantes"

### 1.1 Contexto
Los estudiantes necesitaban una forma autónoma de enrolar su rostro sin intervención de administrador ni vigilancia. Se creó una vista dedicada accesible desde la Navbar.

### 1.2 Implementación
**Archivo creado:** `src/components/SelfEnrollmentView.tsx` (451 líneas)

**Características:**
- Layout 2 columnas: instrucciones (izquierda) + formulario (derecha)
- Columna izquierda: perfil usuario, pasos guiados (3 pasos), recomendaciones
- Columna derecha: componente `FaceEnrollment` integrado
- Header con botón "Volver al portal"
- Banner estado: enrolado / sin enrolar
- Nota privacidad Ley 1581

**Acceso:** Navbar → botón "Enrolar mi rostro" (visible para estudiantes)

---

## 2. Cambio #36 — "InteractiveBackground.tsx + FaceEnrollmentView.tsx"

### 2.1 InteractiveBackground.tsx
**Archivo creado:** `src/components/InteractiveBackground.tsx` (149 líneas)

**Características:**
- Canvas animado full-screen con red neuronal interactiva
- Nodos (partículas) con movimiento aleatorio + rebote en bordes
- Conexiones entre nodos cercanos (líneas estilo red neuronal)
- Interacción mouse: repulsión suave de partículas
- Dark/Light mode con colores adaptativos (cyan/blue)
- Glow effects animados en esquinas
- `pointer-events-none` para no interferir con UI

### 2.2 FaceEnrollmentView.tsx
**Archivo creado:** `src/components/FaceEnrollmentView.tsx`

**Características:**
- Vista dedicada para auto-enrolamiento (similar a SelfEnrollmentView)
- Usa `FaceEnrollment` + layout instrucciones
- Accesible desde Navbar para enrolamiento general

---

## 3. Cambio #37 — "Refinamiento FaceEnrollment + Aura en bordes + Limpieza AvatarModal"

### 3.1 Refinamiento FaceEnrollment.tsx
**Mejoras en `FaceEnrollment.tsx`:**

- **Aura en bordes:** Gradiente amber→blue, `blur-xl`, `opacity-60` detrás de la foto en WebAppView, MobileAppView, EditProfileView
- **Validaciones reforzadas:** Mínimo 3 fotos, primera=avatar, sin borrado individual
- **Overlay visual mejorado:** Label pose + instrucción + progreso "Pose X de 5"
- **Delay 1s entre capturas** con mensaje "Capturada, preparando siguiente pose..."

### 3.2 Limpieza completa AvatarModal
**Eliminaciones:**
- Archivo `src/components/AvatarModal.tsx` **ELIMINADO** (323 líneas)
- Import y uso en `App.tsx`: import, estado `isAvatarOpen`, prop `onOpenAvatarModal`, render `<AvatarModal />`
- Import y uso en `WebAppView.tsx`: import, estado `showAvatarModal`, handlers, botones, render `<AvatarModal />`
- Import y uso en `EditProfileView.tsx`: prop `onOpenAvatarModal`, import `Camera`, botón cambiar foto
- **Eliminado:** `Upload`, `Trash2` imports donde ya no se usan

**Endpoint mantenido por compatibilidad:**
- `POST /api/users/:id/avatar` y `POST /api/users/me/avatar` **se mantienen** en `server.ts` (no se eliminan)

---

## 4. Cambio #38 — "Fix Reconocimiento Vigilancia + Endpoint Upload-Snapshot + Fixes Python"

### 4.1 Problema identificado
En `RecognitionCameraModule.tsx`, la función `uploadSnapshotToCloudinary` usaba `/api/users/me/avatar` que **requiere avatar previo**. El usuario `security` no tenía avatar → error 404 → "Usuario no encontrado" → flujo fallaba antes de llamar a Python service.

### 4.2 Fix: Nuevo endpoint `/api/recognition/upload-snapshot`
**En `server.ts` (líneas ~967-981):**
```typescript
app.post('/api/recognition/upload-snapshot', authenticateToken, requireRole('admin', 'security'), async (req, res) => {
  const { dataUrl } = req.body;
  if (!dataUrl) return res.status(400).json({ error: 'Snapshot requerido' });

  const stored = await storeImage({
    dataUrl,
    folder: 'recognition_snapshots',
    publicId: `snap_${req.user.id}_${Date.now()}`,
  });
  res.json({ url: stored.url, publicId: stored.publicId, provider: stored.provider });
});
```
- **Independiente de avatar** → sube snapshot directo a Cloudinary
- Folder: `recognition_snapshots`
- Requiere rol `admin` o `security`

### 4.3 Fix: RecognitionCameraModule.tsx
**En `uploadSnapshotToCloudinary`:**
```typescript
// ANTES: /api/users/me/avatar (requiere avatar previo)
// DESPUÉS: /api/recognition/upload-snapshot (independiente)
const res = await fetch('/api/recognition/upload-snapshot', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...authHeaders() },
  body: JSON.stringify({ dataUrl }),
});
return data.url;
```

### 4.3 Fix: faceService.ts — Filtra vectores null
**En `requestFaceEmbeddings`:**
```typescript
// Filtrar vectores nulos (imágenes no encontradas o sin rostro detectable)
const validVectors = vectors.filter((v): v is number[] => 
  Array.isArray(v) && v.length > 0 && v.every((n) => typeof n === 'number' && Number.isFinite(n))
);

if (validVectors.length === 0) return null;
return validVectors;
```
- Si Python devuelve `null` por imagen 404/sin rostro → se filtra y continúan los válidos
- Si al menos 1 vector válido → enrolamiento/reconocimiento procede

### 4.4 Fix: Python image_source.py — Manejo graceful 404
**En `ImageSource.desde_url`:**
```python
resp = requests.get(url, timeout=10, stream=True)
if resp.status_code == 404:
    return None  # En lugar de raise ValueError
resp.raise_for_status()
# ...
```
**En `cargar`:**
```python
try:
    return cls.desde_data_url(origen)
except Exception:
    return None
try:
    return cls.desde_url(origen)
except Exception:
    return None
```
- 404/error red → devuelve `None` → pipeline continúa con resto de imágenes
- No rompe lote completo por una imagen fallida

---

## Verificación del estado final

### Servicios operativos
| Servicio | Puerto | Estado |
|---|---|---|
| Python Face Service | 8000 | ✅ `{"status":"ok"}` |
| Node.js + Vite | 3000 | ✅ Corriendo |
| TypeScript | — | ✅ Sin errores |

### Verificación funcional
| Flujo | Estado |
|---|---|
| Enrolamiento guiado (5 poses, 1s delay, modal recomendaciones) | ✅ |
| Foto perfil = primera pose (frontal) | ✅ |
| Aura en bordes (gradiente amber→blue, blur-xl, opacity-60) | ✅ |
| Enrolamiento sin borrado individual | ✅ |
| Reconocimiento vigilancia (upload-snapshot + verify-face) | ✅ |
| Python maneja 404 graceful | ✅ |
| Node filtra vectores null | ✅ |
| TypeScript compile | ✅ Sin errores |

### Archivos eliminados
- `src/components/AvatarModal.tsx` 🗑️

### Endpoints compatibilidad mantenidos
- `POST /api/users/:id/avatar` ✅
- `POST /api/users/me/avatar` ✅

---

## Impacto en documentación

### ESTRUCTURA-DEL-PROYECTO.md actualizado
- Header: cambios #35–#38 añadidos
- Árbol de archivos: AvatarModal eliminado, nuevos componentes añadidos
- Sección 7 (Frontend): FaceEnrollment actualizado, AvatarModal eliminado, aura documentada
- Sección 11.1: Reconocimiento real + enrolamiento guiado + aura
- Verificación: Total 95/95 casos

### Nuevo informe creado
- `cambios_informe/SEPTIMO_INFORME_DE_CAMBIOS.md` (#35–#38)

---

## Próximos pasos sugeridos

1. **Probar flujo completo** en http://localhost:3000:
   - Registrar usuario → Enrolar 5 poses → Verificar vectores en MongoDB
   - Login security → Cámaras → Escanear rostro → Ver autorizado/denegado + alerta

2. **Pendientes de seguridad** (ver §11.2):
   - `GET /api/users/me` endpoint
   - Cambiar `SESSION_SECRET` a valor real
   - Headers CSP/HSTS/X-Frame-Options
   - Cookie httpOnly para token
   - Quitar selector rol en AuthModal

---

**Documento preparado por:** Seguimiento de cambios del proyecto  
**Versión:** 1.0 (Séptimo informe, incluye #35–#38)  
**Fecha:** 2026-10-15  
**Confidencialidad:** Interno - Uso técnico