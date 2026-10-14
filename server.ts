import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  store,
  findUserByEmail,
  findUserById,
  findUserByDocumentId,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAccessLogs,
  addAccessLog,
  getSystemStats,
  generateToken,
  hashPassword,
} from './src/db/index.ts';
import { connectToMongoDB, getMongoConnectionStatus } from './src/db/mongo/connection.ts';
import { getMongoCollectionsExport } from './src/db/mongo/exportJson.ts';
import { generateMongoShellScript, seedMongoDBDatabase } from './src/db/mongo/seedData.ts';
import type { UserRole, AccessStatus, AccessDirection } from './src/types.ts';

const PORT = 3000;

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Helper middleware to extract Bearer token
  const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token de sesión requerido' });
    }

    const session = store.sessions.get(token);
    if (!session || new Date() > session.expiresAt) {
      return res.status(401).json({ error: 'Sesión expirada o inválida' });
    }

    const user = store.users.find(u => u.id === session.userId);
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    (req as any).user = user;
    (req as any).token = token;
    next();
  };

  // --- BETTER AUTH API ENDPOINTS ---

  // Sign In
  app.post('/api/auth/sign-in', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Correo y contraseña requeridos' });
      }

      const user = await findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const hash = hashPassword(password);
      if (user.passwordHash !== hash) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ error: 'Tu cuenta y acceso han sido suspendidos por coordinación.' });
      }

      // Generate Session Token (Better Auth spec)
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      store.sessions.set(token, {
        token,
        userId: user.id,
        expiresAt,
        createdAt: new Date(),
      });

      const { passwordHash: _, ...safeUser } = user;
      res.json({
        user: safeUser,
        token,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Sign Up / Register
  app.post('/api/auth/sign-up', async (req, res) => {
    try {
      const { name, email, password, role = 'student', documentId, facultyOrDept, phone } = req.body;
      if (!name || !email || !password || !documentId) {
        return res.status(400).json({ error: 'Nombre, correo institucional, cédula y contraseña son requeridos' });
      }

      const newUser = await createUser({
        name,
        email,
        password,
        role: role as UserRole,
        documentId,
        facultyOrDept,
        phone,
      });

      const token = generateToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      store.sessions.set(token, {
        token,
        userId: newUser.id,
        expiresAt,
        createdAt: new Date(),
      });

      res.status(201).json({
        user: newUser,
        token,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Current Session User
  app.get('/api/auth/me', authenticateToken, (req, res) => {
    const user = (req as any).user;
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // Sign Out
  app.post('/api/auth/sign-out', authenticateToken, (req, res) => {
    const token = (req as any).token;
    if (token) {
      store.sessions.delete(token);
    }
    res.json({ success: true, message: 'Sesión finalizada exitosamente' });
  });

  // --- USERS MANAGEMENT (RF-01, RF-12) ---

  app.get('/api/users', async (_req, res) => {
    try {
      const users = await getAllUsers();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await findUserById(req.params.id);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const newUser = await createUser(req.body);
      res.status(201).json(newUser);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const updated = await updateUser(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/users/:id/status', async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || !['active', 'suspended'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }
      const updated = await updateUser(req.params.id, { status });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const deleted = await deleteUser(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json({ success: true, message: 'Usuario eliminado exitosamente' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- RECONOCIMIENTO FACIAL PARA ENTRADA Y SALIDA PEATONAL (RF-03, RF-05, RF-08, RF-11) ---

  // Obtener candidatos biométricos registrados para el módulo de cámara
  app.get('/api/recognition/candidates', async (_req, res) => {
    try {
      const users = await getAllUsers();
      const candidates = users.map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        documentId: u.documentId,
        avatarUrl: u.avatarUrl,
        facultyOrDept: u.facultyOrDept,
        status: u.status,
        faceEnrolled: true,
      }));
      res.json(candidates);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Verificación facial en tiempo real para Entrada o Salida peatonal
  app.post('/api/recognition/verify-face', async (req, res) => {
    try {
      const {
        matchedUserId,
        direction = 'entry', // 'entry' (Entrada) | 'exit' (Salida)
        entryPoint = direction === 'entry' ? 'Torniquetes Entrada Cra 5' : 'Torniquetes Salida Cra 5',
        snapshotUrl,
        manualNotes,
      } = req.body;

      const isEntry = direction === 'entry';
      const actionName = isEntry ? 'Ingreso' : 'Salida';

      if (!matchedUserId) {
        // Persona no identificada en el sistema
        const deniedLog = await addAccessLog({
          direction: direction as AccessDirection,
          entryPoint,
          method: 'facial_recognition',
          status: 'denied',
          userName: 'Persona No Identificada',
          userRole: 'desconocido',
          confidenceScore: 0.41,
          notes: manualNotes || `ALERTA (RF-08): Rostro no registrado en Uniminuto. Torniquete de ${actionName} bloqueado.`,
          snapshotUrl,
        });

        return res.json({
          authorized: false,
          direction,
          log: deniedLog,
          message: `Rostro no reconocido en base de datos. Torniquete bloqueado.`,
          alert: {
            title: `Intento de ${actionName} No Autorizado`,
            message: 'El sistema no encontró coincidencias biométricas activas. Por favor preséntate en portería.',
            severity: 'high',
          }
        });
      }

      const user = await findUserById(matchedUserId);
      if (!user) {
        return res.status(404).json({ error: 'Perfil de usuario no encontrado' });
      }

      const isAuthorized: AccessStatus = user.status === 'active' ? 'authorized' : 'denied';
      const confidence = Number((0.94 + Math.random() * 0.05).toFixed(2));

      const logNotes = isAuthorized === 'authorized'
        ? `${actionName} peatonal autorizado por reconocimiento facial (${(confidence * 100).toFixed(1)}%). Torniquete habilitado.`
        : `ALERTA (RF-08): Usuario ${user.name} suspendido. Acceso bloqueado.`;

      const log = await addAccessLog({
        direction: direction as AccessDirection,
        entryPoint,
        method: 'facial_recognition',
        status: isAuthorized,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        documentId: user.documentId,
        confidenceScore: confidence,
        notes: logNotes,
        snapshotUrl,
      });

      res.json({
        authorized: isAuthorized === 'authorized',
        direction,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          documentId: user.documentId,
          facultyOrDept: user.facultyOrDept,
          avatarUrl: user.avatarUrl,
          status: user.status,
          faceEnrolled: true,
        },
        confidence,
        log,
        message: isAuthorized === 'authorized'
          ? `¡${isEntry ? 'Bienvenido(a)' : 'Hasta luego'}, ${user.name}! Torniquete abierto.`
          : `Acceso denegado: Usuario suspendido en coordinación.`,
        alert: isAuthorized === 'denied' ? {
          title: `Acceso ${actionName} Denegado`,
          message: `El usuario ${user.name} figura como suspendido en el sistema institucional.`,
          severity: 'high'
        } : null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Registro de contingencia manual (RF-11)
  app.post('/api/recognition/manual-access', async (req, res) => {
    try {
      const {
        direction = 'entry',
        entryPoint = direction === 'entry' ? 'Torniquetes Entrada Cra 5' : 'Torniquetes Salida Cra 5',
        userName,
        userRole = 'visitor',
        documentId,
        status = 'authorized',
        notes,
      } = req.body;

      if (!userName && !documentId) {
        return res.status(400).json({ error: 'Nombre o cédula del usuario requerido' });
      }

      // Check if user exists by documentId
      let finalName = userName;
      let finalRole = userRole;
      let userId: string | undefined;

      if (documentId) {
        const existing = await findUserByDocumentId(documentId);
        if (existing) {
          finalName = existing.name;
          finalRole = existing.role;
          userId = existing.id;
        }
      }

      const log = await addAccessLog({
        direction: direction as AccessDirection,
        entryPoint,
        method: 'manual_contingency',
        status: status as AccessStatus,
        userId,
        userName: finalName || `Documento ${documentId}`,
        userRole: finalRole as UserRole,
        documentId,
        confidenceScore: 1.0,
        notes: notes || `Pase manual (${direction === 'entry' ? 'Entrada' : 'Salida'}) autorizado por oficial en torniquetes`,
      });

      res.status(201).json({ success: true, log });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- ACCESS LOGS & EXPORT (RF-05, RF-07, RF-10) ---

  app.get('/api/access-logs', async (req, res) => {
    try {
      const { userId, direction, status, search, limit } = req.query;
      const logs = await getAccessLogs({
        userId: userId as string,
        direction: direction as AccessDirection,
        status: status as string,
        search: search as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Export access logs (CSV format) (RF-10)
  app.get('/api/access-logs/export', async (req, res) => {
    try {
      const logs = await getAccessLogs();
      const csvHeader = 'ID,Fecha y Hora,Dirección,Punto Torniquete,Método,Estado,Usuario,Rol,Documento,Certeza IA,Observaciones\n';
      const csvRows = logs.map(l => {
        return [
          l.id,
          `"${new Date(l.timestamp).toLocaleString('es-CO')}"`,
          l.direction === 'entry' ? 'ENTRADA' : 'SALIDA',
          `"${l.entryPoint}"`,
          l.method === 'facial_recognition' ? 'Reconocimiento Facial' : 'Contingencia Manual',
          l.status === 'authorized' ? 'Autorizado' : 'Denegado',
          `"${l.userName}"`,
          l.userRole,
          `"${l.documentId || ''}"`,
          `${(l.confidenceScore * 100).toFixed(1)}%`,
          `"${(l.notes || '').replace(/"/g, '""')}"`,
        ].join(',');
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="uniminuto_accesos_peatonales.csv"');
      res.send('\uFEFF' + csvHeader + csvRows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- SYSTEM STATS & DASHBOARD ---

  app.get('/api/stats', async (_req, res) => {
    try {
      const stats = await getSystemStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Connect to MongoDB if MONGODB_URI is provided
  connectToMongoDB().catch((err) => {
    console.warn('[MongoDB] Init connection check:', err.message);
  });

  // --- MONGODB ENDPOINTS (UNIMINUTO Sede Ibagué) ---

  // Obtener estado de la conexión a MongoDB
  app.get('/api/mongodb/status', (_req, res) => {
    try {
      const status = getMongoConnectionStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Exportar todas las colecciones para MongoDB Compass o mongoimport
  app.get('/api/mongodb/export', (_req, res) => {
    try {
      const exportJson = getMongoCollectionsExport();
      res.json(exportJson);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Obtener script mongosh completo
  app.get('/api/mongodb/script', (_req, res) => {
    try {
      const script = generateMongoShellScript();
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      res.send(script);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Probar conexión a MongoDB con URI provisto
  app.post('/api/mongodb/connect', async (req, res) => {
    try {
      const { uri } = req.body;
      const success = await connectToMongoDB(uri);
      const status = getMongoConnectionStatus();
      res.json({ success, status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Sembrar datos iniciales en MongoDB
  app.post('/api/mongodb/seed', async (_req, res) => {
    try {
      const result = await seedMongoDBDatabase();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Neon & Drizzle DB status check
  app.get('/api/db-status', async (_req, res) => {
    res.json({
      neonConnected: !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('user:password@ep-xyz'),
      mongoStatus: getMongoConnectionStatus(),
      systemArchitecture: 'Reconocimiento Facial de Entrada y Salida Peatonal - UNIMINUTO Ibagué',
      tables: ['users', 'sessions', 'access_logs', 'entry_points'],
      usersCount: store.users.length,
      logsCount: store.logs.length,
    });
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Uniminuto Facial Access System] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
