# SEGUNDO INFORME DE CAMBIOS

> **Proyecto:** Sistema de Control de Acceso – UNIMINUTO Sede Ibagué
> **Directorio del proyecto:** `C:\Users\losor\Desktop\proyecto entrada\sistema-de-control-de-acceso---uniminuto-sede-ibague actua`
> **Fecha:** 2026-09-24
> **Relacionado con el primer informe:** `cambios_informe/INFORME_DE_CAMBIOS.md` (cambios #01 y #02)
> **Cambios de este documento:** #03 — Limpieza total de datos y semillas · #04 — Limpieza de referencias demo en el frontend
> **Objetivo base:** el sistema quedó **sin ningún dato precargado**; toda la información de personas se extrae únicamente de MongoDB.

---

## 1. Cambio #03 — "Limpieza total de datos (memoria, archivos y semillas)"

### 1.1 Resumen
Para dejar el proyecto limpio antes de iniciar nuevos cambios, se eliminó **toda la data de
semilla** que aún existía:
- la carpeta `datos_seed_memoria/` (extraída del store en el cambio #01),
- los **seeds decorativos** del front y del backend,
- el **auto-seed de arranque** (que volvía a sembrar la BD si estaba vacía),
- los **endpoints** que exponían esos datos.

**Decisión tomada con el usuario:** *"eliminar los datos que están en memoria, los datos en
archivos; el usuario elimina los datos en la BD"*. Resultado: la app arranca sin datos de ningún
tipo y no existe forma de resembrar desde archivos.

### 1.2 Archivos eliminados

| Ruta | Propósito | Estado |
|---|---|---|
| `datos_seed_memoria/seed-data.json` | Datos extraídos del store viejo (6 usuarios + 6 logs). | Eliminado |
| `datos_seed_memoria/importar-a-mongo.js` | Script mongosh para montar la BD con esos datos. | Eliminado |
| `datos_seed_memoria/DATOS-SEED.md` | Documentación de los datos semilla. | Eliminado |
| `init-mongo.js` | Script mongosh de montaje inicial (hashes inconsistentes). | Eliminado |
| `src/db/mongo/seedData.ts` | `MONGO_SEED_*` + `generateMongoShellScript()` + `seedMongoDBDatabase()`. | Eliminado |
| `src/db/mongo/exportJson.ts` | Exportación estilo Compass/mongoimport (dependía de seedData). | Eliminado |
| `src/components/MongoDatabaseModal.tsx` | UI de MongoDB (código muerto, nunca importada). | Eliminado |

### 1.3 Cambios aplicados en código

| Archivo | Cambio |
|---|---|
| `src/db/index.ts` | Eliminados `datosSeed` (import JSON), `seedDatabaseFromDatosSeed()` y `loadSeedDataIntoMemory()`. Limpio el import de tipos (`AccessMethod`/`AccessStatus` ya no se usan). El store sigue vacío al arrancar. |
| `server.ts` | Removidos imports de `seedData`/`exportJson`, la llamada al auto-seed tras `connectToMongoDB()` y los endpoints `GET /api/mongodb/export`, `GET /api/mongodb/script` y `POST /api/mongodb/seed`. Quedan `GET /api/mongodb/status` y `POST /api/mongodb/connect`. |
| `tsconfig.json` | Eliminado `resolveJsonModule` (ya no hay imports de JSON). |

### 1.4 Impacto
- `GET /api/users` y `GET /api/access-logs` devuelven `[]` (o lo que haya en la BD).
- Login de demo: no hay usuarios hasta **registrarse** o crearlos en Mongo.
- La sección "Cómo restaurar la demo" del primer informe ya no aplica (no existen
  `importar-a-mongo.js` ni `seed-data.json`).

---

## 2. Cambio #04 — "Limpieza de referencias demo en el frontend"

### 2.1 Resumen
Además de los datos, existían **perfiles y credenciales de personas hardcodeadas en la UI** que se
veían al abrir la página (aunque no existieran en la BD). Se eliminaron para que el sistema no muестре
ningún dato de estudiante, administrador u otro integrante: **todo debe venir de MongoDB**.

### 2.2 Cambios aplicados

| Archivo | Cambio |
|---|---|
| `src/App.tsx` | · Eliminada la asignación default de **Dilan** (`usr-std-01`) al cargar datos. · Eliminado el botón "Cambiar a Rol Administrador (Carlos)". · Footer sin persona (ahora: "Control de Acceso Peatonal • Cámaras–Visión IA"). · Quitado `handleQuickSwitchUser` y su prop en Navbar. |
| `src/components/Navbar.tsx` | Eliminado el menú "Cambio Rápido de Rol (Demo)" (Carlos/Jairo/Dilan/Ospina) y el prop `onQuickSwitchUser`. El menú de sesión solo muestra el usuario actual y cerrar sesión. |
| `src/components/AuthModal.tsx` | Eliminados los **quick logins** de demo (admin123 / dilan123 / seguridad123 / docente123) y el placeholder "Ej. Dilan González". |
| `src/components/RecognitionCameraModule.tsx` | Selector de persona sin default (`'unknown'` → "Rostro No Registrado") y quitada la etiqueta "Dilan". |
| `src/components/TechnicalInfoModal.tsx` | Eliminado el crédito con nombre ("Desarrollador: Dilan • VI Semestre de Ingeniería de Sistemas."). |

### 2.3 Garantía de limpieza
Verificado por búsqueda en todo `src/` y `server.ts`: **no queda ningún dato de personas** en el
código (ni nombres propios, ni correos institucionales, ni contraseñas demo). Las únicas menciones
que quedaron son **etiquetas de rol genéricas** ("Estudiante", "Docente", "Vigilancia", …), no datos
de integrantes. La información de usuarios se lee 100 % de la colección Mongo `users`.

> Nota: permanece solo un estado de cámara como default ("Rostro No Registrado"), que no corresponde
> a persona alguna.

---

## 3. Estado actual del sistema

- **BD (MongoDB Atlas, `uniminuto_acceso`):** limpia (el usuario eliminó `users`, `access_logs`,
  `entry_points`, `sessions`). Verificado: `usersCount: 0`, `logsCount: 0`.
- **Memoria (`store`):** vacía al arrancar (`users: []`, `logs: []`).
- **Archivos:** sin datos semilla.
- **Código:** sin nombres, correos ni credenciales de personas.
- **Arranque:** `connectToMongoDB()` conecta si `MONGODB_URI` está en `.env`; si no responde, la app
  opera con el store vacío (fallback).

## 4. Verificación

- [x] `npm run lint` (`tsc --noEmit`) → **sin errores**.
- [x] Servidor reiniciado en `http://localhost:3000`.
- [x] `/api/db-status` → Mongo conectado, `usersCount: 0`, `logsCount: 0`.
- [x] `GET /api/users` → `[]` · `GET /api/access-logs` → `[]`.
- [x] `GET /api/mongodb/status` → `isConnected: true` (URI enmascarada).
- [x] Endpoints de semilla/export eliminados → `404` (`/api/mongodb/seed`, `/script`, `/export`).
- [x] Grep del código → sin nombres propios ni credenciales demo.

## 5. Pendientes (heredados)

1. Sesiones todavía en el `Map` en memoria (7 días); la colección `sessions` con TTL existe pero no se usa.
2. API CRUD sin autenticar (proteger con el token + roles).
3. Hashing de contraseñas con `sha256` sin salt.
4. RBAC solo visual (falta middleware por rol).
5. `atlas-credentials.env` fuera del `.gitignore` → rotar credenciales si se compartió.
6. `entry_points` vacía (catálogo de torniquetes sin uso en runtime).

---

**Documento preparado por:** Seguimiento de cambios del proyecto
**Versión:** 1.0 (Segundo informe)
**Fecha:** 2026-09-24
**Confidencialidad:** Interno - Uso técnico