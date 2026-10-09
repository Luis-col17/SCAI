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
