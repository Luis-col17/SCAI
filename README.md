## 🎯 Cambios principales

### ✨ Nuevas funcionalidades
- **Vista de edición de perfil** (`EditProfileView.tsx`) con preview en vivo
- **Modal de cambio de contraseña** (`ChangePasswordModal.tsx`)
- **Endpoint** `PATCH /api/users/me` para editar datos propios
- **Endpoint** `PATCH /api/users/me/password` para cambiar contraseña
- **Revocación global de sesiones** al cambiar contraseña (`sessionInvalidBefore`)

### 🎨 UI/UX
- Navbar con dropdown mejorado:
  - Editar información
  - Cambiar contraseña
  - Cambiar tema (claro/oscuro) ← movido del navbar al dropdown
  - Cerrar sesión
- Logo SCAI adaptativo (claro/oscuro)
- Fondo ripple cyan decorativo
- Vista web responsive (`WebAppView`)

### 🔒 Seguridad
- Validación de política de contraseñas reutilizable
- Revocación de tokens al cambiar contraseña (fuerza re-login global)
- Validación de `sessionInvalidBefore` en `authenticateToken`
- Validación de campos editables (`name`, `phone`, `facultyOrDept`)

## 📜 Registro de Cambios

### [v1.2.0] - Rediseño Dashboard Frontend
- **Modificado**: `WebAppView.tsx` rediseñado por completo con estética institucional Uniminuto.
- **Añadido**: Componente visual de carné digital con chip NFC/RFID y QR peatonal.
- **Añadido**: Instalación e integración de `framer-motion` para animaciones del dashboard.
- **Mejorado**: Filtrado rápido de historial de accesos y vista de métricas/KPIs.
