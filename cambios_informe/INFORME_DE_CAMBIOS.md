# INFORME DE CAMBIOS

> **Proyecto:** Sistema de Control de Acceso – UNIMINUTO Sede Ibagué
> **Directorio del proyecto:** `C:\Users\losor\Desktop\proyecto entrada\sistema-de-control-de-acceso---uniminuto-sede-ibague actua`
> **Fecha:** 2026-09-24
> **Cambio #01 — "Eliminar datos hardcodeados del store en memoria"**

---

## 1. Resumen del cambio

Se eliminaron por completo los **datos hardcodeados** que vivían dentro del store en memoria
(`src/db/index.ts`) y se extrajeron a una carpeta aparte que conserva su **estructura original
(TypeScript)**. La aplicación ahora arranca con el **store vacío** (`users: []`, `logs: []`).

**Decisión tomada con el usuario:** *"Store vacío al arrancar"*. La app ya no arranca con los
6 usuarios ni los 6 registros; los usuarios deben crearse por registro
(`/api/auth/sign-up`) o sembrarse desde MongoDB.

---

## 2. Archivos creados

| Ruta | Propósito |
|---|---|
| `datos_seed_memoria/seed-data.json` | Datos extraídos en JSON puro (6 usuarios + 6 logs), estructura exacta de `UserProfile` / `AccessLog`. |
| `datos_seed_memoria/importar-a-mongo.js` | Script `mongosh` que inserta los mismos datos en MongoDB (colecciones `users` y `access_logs`) **conservando los `_id` originales** strings (`usr-*`, `log-*`). |
| `datos_seed_memoria/DATOS-SEED.md` | Documenta la estructura original (TypeScript), los archivos y cómo volver a cargar los datos. |
| `cambios_informe/INFORME_DE_CAMBIOS.md` | Este documento. |

> Los datos en `seed-data.json` y `importar-a-mongo.js` son **equivalentes**; el JSON es la
> referencia fiel, el script Mongo adapta fechas a `Date` y agrega `alertTriggered`
> (campo que el modelo Mongoose `access_logs` ya declaraba).

---

## 3. Archivos modificados

### `src/db/index.ts`
**Antes:** definía las constantes `INITIAL_USERS` (6) e `INITIAL_LOGS` (6) y el store
`{ users: [...INITIAL_USERS], logs: [...INITIAL_LOGS], sessions }`.

**Después:**

```ts
export const store = {
  users: [] as (UserProfile & { passwordHash: string })[],
  logs: [] as AccessLog[],
  sessions: new Map<string, SessionRecord>(),
};
```

Todo lo demás (helpers `findUserByEmail`, `createUser`, `getAccessLogs`, `addAccessLog`,
`getSystemStats`, `hashPassword`, `generateToken`, conexión Neon/Drizzle, módulo Mongo)
**se mantiene intacto**.

---

## 4. Impacto en el funcionamiento

> Controlado por el **Cambio #02** (sección 8): con **MongoDB conectado** el estado "Ahora" de la
> tabla se revierte parcialmente (la app vuelve a cargar 6 usuarios y 6 logs sembrados desde
> `datos_seed_memoria`). La tabla aplica únicamente al escenario "Mongo caído" (fallback memoria).

| Aspecto | Antes | Ahora (Mongo caído) |
|---|---|---|
| `GET /api/users` | 6 usuarios | `[]` |
| `GET /api/access-logs` | 6 registros | `[]` |
| Login de demo (admin123, dilan123…) | Funcionaba | No hay usuarios → hay que **registrarse** primero |
| Usuario por defecto (Dilan) en `App.tsx` | Se asignaba `usr-std-01` | No existe → queda el prompt de iniciar sesión |
| "Cambio rápido de rol" en Navbar | Mostraba perfiles | Sin datos no muestra perfiles hasta crear usuarios |
| Finder/clone/verificación facial | Candidatos reales | La lista sale vacía hasta sembrar datos |
| Editores admin | Datos completos | Vacíos hasta registrar/crear usuarios |

> Nota UX: `AuthModal` permite elegir cualquier rol al registrarse (incluido
> `admin`/`security`), por lo que la app sigue siendo utilizable de inmediato.

---

## 5. Cómo restaurar la demo (opcional)

Con el **Cambio #02** no hace falta restaurar nada: si Mongo está conectado, la app se siembra sola
al arrancar. Alternativas manuales:

1. **MongoDB:** `mongosh --quiet mongodb://localhost:27017/uniminuto_acceso datos_seed_memoria/importar-a-mongo.js`
   y conectar la capa de datos ya implementada (se hace sola al arrancar).
2. **Diagnóstico local:** copiar el contenido de `seed-data.json` al store de memoria.

---

## 6. Verificación inicial (Cambio #01)

- [x] `npm run lint` (`tsc --noEmit`) → **sin errores**.
- [x] Servidor reiniciado en `http://localhost:3000`.
- [x] `GET /api/users` → `[]` (antes del #02).
- [x] `GET /api/access-logs` → `[]` (antes del #02).
- La verificación final (con Mongo) está en la **sección 8.3**.

---

## 7. Notas y pendientes

- El CRUD real ahora usa **MongoDB Atlas** (Cambio #02); el store en memoria quedó como fallback.
  Las **sesiones siguen en memoria** (no migradas a la colección `sessions` TTL de Mongo).
---

## 8. Cambio #02 — "Conectar el CRUD real a MongoDB (datos_seed_memoria como fuente)"

### 8.1 Resumen
El CRUD que antes operaba solo sobre el store en memoria ahora opera contra **MongoDB Atlas**
(base `uniminuto_acceso`) cuando hay conexión, con **fallback a memoria** si no la hay. Los datos
semilla del **cambio #01** (`datos_seed_memoria/seed-data.json`) son la fuente inicial: al arrancar
el servidor y con Mongo conectado, si las colecciones están vacías, se siembran 6 usuarios y 6 logs.

### 8.2 Cambios aplicados

| Archivo | Cambio |
|---|---|
| `src/db/index.ts` | Importa `mongoose`, `UserModel`/`AccessLogModel` y `seed-data.json` (`resolveJsonModule`). Nueva función `mongoReady()` decide el back-end. Mappers `toMongoUser`/`fromMongoUser`/`toMongoLog`/`fromMongoLog` (campo clave de negocio `businessId` = `usr-*`/`log-*`). `seedDatabaseFromDatosSeed()` siembra si está vacío. Todos los CRUD (`findUserByEmail/Id/DocumentId`, `getAllUsers`, `createUser`, `updateUser`, `deleteUser`, `getAccessLogs`, `addAccessLog`, `getSystemStats`) tienen rama Mongo + rama memoria. |
| `src/db/mongo/models.ts` | Añade `businessId` (único) a `User` y `AccessLog`; `userId` de `AccessLog`/`Session` pasa a `String` (refiere al `businessId`). |
| `server.ts` | `import 'dotenv/config'` (carga `MONGODB_URI` real). `authenticateToken` ahora es async y resuelve el usuario con `findUserById`. Tras `connectToMongoDB()` llama a `seedDatabaseFromDatosSeed()`. `/api/db-status` usa `getAllUsers()`/`getAccessLogs()` en vez de `store`. |
| `tsconfig.json` | Añade `resolveJsonModule: true` (import del JSON de semilla). |

### 8.3 Verificación (en vivo, contra Atlas)
- [x] `/api/mongodb/status` → `isConnected: true`.
- [x] Auto-seed: `/api/db-status` → `usersCount: 6, logsCount: 6`.
- [x] **Create:** `POST /api/users` → `usr-mufye1cd` creado.
- [x] **Read:** `GET /api/users/:id` → lo devuelve.
- [x] **Persistencia:** reinicio del servidor → el usuario **sobrevive** (prueba de que vive en Mongo, no en memoria).
- [x] **Update:** `PUT /api/users/:id` → cambia `phone`.
- [x] **Delete:** `DELETE /api/users/:id` → `success: true`; `usersCount` vuelve a 6.
- [x] `npm run lint` (`tsc --noEmit`) sin errores.

### 8.4 Notas
- Las **sesiones siguen en memoria** (7 días); el cambio no las migró a la colección `sessions` (TTL) de Mongo.
- Si el `.env` se comparte con credenciales reales de Atlas, **rotarlas**.
- `seedData.ts` (MONGO_SEED_*) queda como utilidad manual; el seed automático usa `datos_seed_memoria`.