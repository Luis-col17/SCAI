import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
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
  toSafeUser,
  isTokenRevoked,
  revokeToken,
  updatePasswordHash,
  saveFaceEnrollment,
  summarizeEnrollment,
} from './src/db/index.ts';
import { connectToMongoDB, getMongoConnectionStatus } from './src/db/mongo/connection.ts';
import { storeImage, removeImage, isCloudinaryConfigured, parseDataUrl } from './src/lib/imageStorage.ts';
import { signSessionToken, verifySessionToken } from './src/lib/jwt.ts';
import { hashPassword, verifyPassword, validatePasswordStrength } from './src/lib/password.ts';
import { getFaceServiceStatus, requestFaceEmbeddings } from './src/lib/faceService.ts';
import {
  checkLoginAttempt,
  recordLoginFailure,
  recordLoginSuccess,
  LOGIN_FAILURE_EXTRA_DELAY_MS,
} from './src/lib/rateLimit.ts';
import type { UserRole, AccessStatus, AccessDirection } from './src/types.ts';

  const PORT = 3000;
  // Multi-plantilla: varias fotos -> varios vectores por persona.
  const MAX_ENROLLMENT_PHOTOS = 5;

  /**
   * Intenta borrar imágenes del almacenamiento externo y devuelve cuáles
   * quedaron ahí. La referencia en la base se limpia igual: si Cloudinary falla,
   * el usuario sí dejó de estar enrolado, pero el archivo externo queda huérfano
   * y hay que avisar en la consola para limpiarlo a mano.
   */
  const purgeImages = async (publicIds: (string | undefined)[]): Promise<string[]> => {
    const orphans: string[] = [];
    for (const publicId of publicIds) {
      if (!publicId) continue;
      const result = await removeImage(publicId);
      if (!result.ok) orphans.push(publicId);
    }
    if (orphans.length > 0) {
      console.warn(
        `[Almacen] ${orphans.length} imagen(es) no se pudieron borrar y quedaron en el almacen externo: ${orphans.join(', ')}`
      );
    }
    return orphans;
  };

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads'), { maxAge: '7d' }));

  // Helper middleware to extract Bearer token
  const authenticateToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Token de sesión requerido' });
      }

      const claims = verifySessionToken(token);
      if (!claims) {
        return res.status(401).json({ error: 'Sesión expirada o inválida' });
      }

      if (await isTokenRevoked(claims.jti)) {
        return res.status(401).json({ error: 'La sesión fue cerrada. Inicia sesión nuevamente.' });
      }

      const user = await findUserById(claims.userId);
      if (!user) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ error: 'Tu cuenta y acceso han sido suspendidos por coordinación.' });
      }

      (req as any).user = user;
      (req as any).token = token;
      next();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  // Restringe una ruta (ya autenticada) a ciertos roles
  const requireRole = (...allowed: UserRole[]) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const user = (req as any).user as { role: UserRole } | undefined;
      if (!user) {
        return res.status(401).json({ error: 'Token de sesión requerido' });
      }
      if (!allowed.includes(user.role)) {
        return res.status(403).json({
          error: `Acceso restringido: requiere rol ${allowed.join(' o ')}`,
        });
      }
      next();
    };
  };

  const isAdmin = (req: express.Request) => (req as any).user?.role === 'admin';

  const requestIp = (req: express.Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || 'unknown';
  };

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  // --- BETTER AUTH API ENDPOINTS ---

  // Sign In
  app.post('/api/auth/sign-in', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Correo y contraseña requeridos' });
      }

      const ip = requestIp(req);
      const canonicalEmail = String(email).trim().toLowerCase();

      const check = checkLoginAttempt(canonicalEmail, ip);
      if (!check.allowed) {
        return res.status(429).json({
          error: `Demasiados intentos fallidos. Espera ${check.retryAfterSeconds} s e intenta de nuevo.`,
          retryAfterSeconds: check.retryAfterSeconds,
        });
      }

      const user = await findUserByEmail(canonicalEmail);
      if (!user) {
        // Mismo mensaje y trabajo aproximado tanto si el correo no existe
        // como si la contraseña falla, para no revelar qué cuentas hay.
        await verifyPassword(password, 'scrypt$65536$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA');
        recordLoginFailure(canonicalEmail, ip);
        await sleep(LOGIN_FAILURE_EXTRA_DELAY_MS);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const { valid, needsRehash } = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        recordLoginFailure(canonicalEmail, ip);
        await sleep(LOGIN_FAILURE_EXTRA_DELAY_MS);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      recordLoginSuccess(canonicalEmail, ip);

      if (user.status === 'suspended') {
        return res.status(403).json({ error: 'Tu cuenta y acceso han sido suspendidos por coordinación.' });
      }

      // Migración silenciosa: el primer login de una cuenta con el SHA-256
      // antiguo la reescribe con scrypt y sal.
      if (needsRehash) {
        try {
          await updatePasswordHash(user.id, await hashPassword(password));
          console.log(`[auth] Hash migrado a scrypt para ${user.email}`);
        } catch (err: any) {
          console.error('[auth] No se pudo migrar el hash:', err.message);
        }
      }

      // Generate signed session token (JWT, stateless)
      const { token, expiresAt } = signSessionToken({
        id: user.id,
        role: user.role,
        name: user.name,
        documentId: user.documentId,
      });

      const safeUser = toSafeUser(user);
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
      const { name, email, password, documentId, facultyOrDept, phone } = req.body;
      if (!name || !email || !password || !documentId) {
        return res.status(400).json({ error: 'Nombre, correo institucional, cédula y contraseña son requeridos' });
      }

      const weak = validatePasswordStrength(password);
      if (weak) {
        return res.status(400).json({ error: weak });
      }

      const newUser = await createUser({
        name,
        email,
        password,
        // El registro público es solo para estudiantes. Cualquier otro rol
        // lo concede coordinación (POST /api/users) o la administración.
        role: 'student',
        documentId,
        facultyOrDept,
        phone,
      });

      const { token, expiresAt } = signSessionToken({
        id: newUser.id,
        role: newUser.role,
        name: newUser.name,
        documentId: newUser.documentId,
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
    const safeUser = toSafeUser(user);
    res.json(safeUser);
  });

  // Sign Out: el JWT es stateless, así que revocamos su 'jti' para que muera al instante
  app.post('/api/auth/sign-out', authenticateToken, async (req, res) => {
    try {
      const token = (req as any).token as string;
      const claims = verifySessionToken(token);
      if (claims) {
        await revokeToken(claims.jti, claims.userId, claims.expiresAt);
      }
      res.json({ success: true, message: 'Sesión finalizada exitosamente' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- USERS MANAGEMENT (RF-01, RF-12) ---
  // Cualquier usuario autenticado puede ver el directorio (carné digital).
  app.get('/api/users', authenticateToken, async (_req, res) => {
    try {
      const users = await getAllUsers();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/users/:id', authenticateToken, async (req, res) => {
    try {
      const user = await findUserById(req.params.id);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
      const safeUser = toSafeUser(user);
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Crear usuarios: vigilancia/administración. Solo un admin puede crear otro admin.
  app.post('/api/users', authenticateToken, requireRole('admin', 'security'), async (req, res) => {
    try {
      const payload = { ...req.body };
      if (!isAdmin(req)) {
        if (payload.role === 'admin') {
          return res.status(403).json({ error: 'Solo un administrador puede crear cuentas de administrador' });
        }
        delete payload.role;
      }
      if (payload.password) {
        const weak = validatePasswordStrength(payload.password);
        if (weak) {
          return res.status(400).json({ error: weak });
        }
      }
      const newUser = await createUser(payload);
      res.status(201).json(newUser);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Editar usuarios: vigilancia/administración.
  // El rol solo lo cambia un admin, y nadie puede cambiar el suyo propio.
  app.put('/api/users/:id', authenticateToken, requireRole('admin', 'security'), async (req, res) => {
    try {
      const actor = (req as any).user as { id: string; role: UserRole };
      const payload = { ...req.body };

      if (payload.role !== undefined) {
        if (!isAdmin(req)) {
          return res.status(403).json({ error: 'Solo un administrador puede modificar roles' });
        }
        if (req.params.id === actor.id) {
          return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
        }
      }

      if (payload.status !== undefined && !isAdmin(req)) {
        return res.status(403).json({ error: 'Solo un administrador puede activar o suspender cuentas' });
      }

      delete payload.id;
      delete payload.passwordHash;

      const updated = await updateUser(req.params.id, payload);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/users/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
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

  // --- FOTO DE PERFIL (subida / edición) ---

  app.post('/api/users/:id/avatar', authenticateToken, async (req, res) => {
    try {
      const sessionUser = (req as any).user as { id: string; role: UserRole };
      const isOwner = sessionUser.id === req.params.id;
      const isPrivileged = sessionUser.role === 'admin' || sessionUser.role === 'security';

      if (!isOwner && !isPrivileged) {
        return res.status(403).json({ error: 'Solo puedes cambiar tu propia foto de perfil' });
      }

      const target = await findUserById(req.params.id);
      if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

      const stored = await storeImage({
        dataUrl: req.body?.dataUrl,
        folder: 'avatars',
        publicId: `avatar_${target.id}`,
      });

      const updated = await updateUser(target.id, {
        avatarUrl: stored.url,
        avatarPublicId: stored.publicId,
      });

      const previousAvatar = target.avatarPublicId && target.avatarPublicId !== stored.publicId ? target.avatarPublicId : undefined;
      const orphanedAvatars = await purgeImages([previousAvatar]);

      res.json({
        user: updated,
        avatarUrl: stored.url,
        provider: stored.provider,
        orphanedAvatars,
        storage: isCloudinaryConfigured() ? 'cloudinary' : 'local',
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/users/:id/avatar', authenticateToken, async (req, res) => {
    try {
      const sessionUser = (req as any).user as { id: string; role: UserRole };
      const isOwner = sessionUser.id === req.params.id;
      const isPrivileged = sessionUser.role === 'admin' || sessionUser.role === 'security';

      if (!isOwner && !isPrivileged) {
        return res.status(403).json({ error: 'Solo puedes quitar tu propia foto de perfil' });
      }

      const target = await findUserById(req.params.id);
      if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

      const updated = await updateUser(target.id, {
        avatarUrl: '',
        avatarPublicId: '',
      });

      const orphanedAvatars = await purgeImages([target.avatarPublicId]);

      res.json({ user: updated, orphanedAvatars });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

    // -----------------------------------------------------------------
    // ENROLAMIENTO FACIAL (captura de rostro -> fotos -> vectores)
    // Permiso: el propio usuario o un administrador. Seguridad queda
    // fuera a proposito: disposable biometrico de otra persona.
    // -----------------------------------------------------------------

    app.get('/api/users/:id/face-enrollment', authenticateToken, async (req, res) => {
      try {
        const sessionUser = (req as any).user as { id: string; role: UserRole };
        const isOwner = sessionUser.id === req.params.id;
        if (!isOwner && sessionUser.role !== 'admin') {
          return res.status(403).json({ error: 'Solo puedes ver tu propio enrolamiento facial' });
        }

        const target = await findUserById(req.params.id);
        if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

        res.json({
          enrollment: summarizeEnrollment(target),
          faceService: getFaceServiceStatus(),
          consentRequired: true,
        });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/users/:id/face-enrollment', authenticateToken, async (req, res) => {
      const savedPhotoIds: string[] = [];
      try {
        const sessionUser = (req as any).user as { id: string; role: UserRole };
        const isOwner = sessionUser.id === req.params.id;
        if (!isOwner && sessionUser.role !== 'admin') {
          return res.status(403).json({ error: 'Solo puedes enrolar tu propio rostro' });
        }

        const target = await findUserById(req.params.id);
        if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

        const dataUrls: unknown = req.body?.dataUrls;
        if (!Array.isArray(dataUrls) || dataUrls.length === 0) {
          return res.status(400).json({ error: 'Debes enviar al menos una foto' });
        }
        if (dataUrls.length > MAX_ENROLLMENT_PHOTOS) {
          return res.status(400).json({ error: `Maximo ${MAX_ENROLLMENT_PHOTOS} fotos por enrolamiento` });
        }
        if (req.body?.consent !== true) {
          return res.status(400).json({ error: 'Se requiere consentimiento para tratar datos biometricos' });
        }

        // Validar formato y tamano antes de subir nada.
        dataUrls.forEach((dataUrl: unknown, index: number) => {
          try {
            parseDataUrl(dataUrl);
          } catch (validationError: any) {
            const received = typeof dataUrl === 'string' ? dataUrl.slice(0, 40) : typeof dataUrl;
            throw new Error(`Foto ${index + 1} invalida (llego ${received}): ${validationError.message}`);
          }
        });

        const photos: { photoUrl: string; photoPublicId: string }[] = [];
        try {
          for (let i = 0; i < dataUrls.length; i++) {
            const stored = await storeImage({
              dataUrl: dataUrls[i] as string,
              folder: 'enrollment',
              publicId: `enroll_${target.id}_${Date.now()}_${i}`,
            });
            savedPhotoIds.push(stored.publicId);
            photos.push({ photoUrl: stored.url, photoPublicId: stored.publicId });
          }
        } catch (uploadError: any) {
          // Si una foto falla, se revierte lo ya subido para no dejar basura.
          await purgeImages(savedPhotoIds);
          throw uploadError;
        }

        // Vectores: el servicio de IA todavia no existe, quedan pendientes.
        const vectors = await requestFaceEmbeddings(dataUrls as string[]);

        const enrollment = await saveFaceEnrollment(target.id, { photos, embeddings: vectors ?? [] });

        // Las fotos anteriores dejan de ser necesarias: se borran del almacen.
        const previousPhotos = (target.enrollmentPhotos ?? [])
          .filter(old => !savedPhotoIds.includes(old.photoPublicId))
          .map(old => old.photoPublicId);
        const orphanedPhotos = await purgeImages(previousPhotos);

        res.status(201).json({
          enrollment,
          vectorsGenerated: vectors ? vectors.length : 0,
          pendingReason: vectors
            ? null
            : 'Las fotos se guardaron, pero faltan los vectores: el servicio de IA (Python) aun no esta implementado.',
          storage: isCloudinaryConfigured() ? 'cloudinary' : 'local',
          orphanedPhotos,
        });
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    });

    app.delete('/api/users/:id/face-enrollment', authenticateToken, async (req, res) => {
      try {
        const sessionUser = (req as any).user as { id: string; role: UserRole };
        const isOwner = sessionUser.id === req.params.id;
        if (!isOwner && sessionUser.role !== 'admin') {
          return res.status(403).json({ error: 'Solo puedes eliminar tu propio enrolamiento facial' });
        }

        const target = await findUserById(req.params.id);
        if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

        // El registro en la base se limpia siempre; lo que no se borre en el
        // almacen externo se reporta como huerfano para limpiarlo a mano.
        const orphanedPhotos = await purgeImages((target.enrollmentPhotos ?? []).map(p => p.photoPublicId));
        const enrollment = await saveFaceEnrollment(target.id, { photos: [], embeddings: [] });

        res.json({
          enrollment,
          deletedPhotos: (target.enrollmentPhotos ?? []).length,
          orphanedPhotos,
          notice: orphanedPhotos.length > 0
            ? `${orphanedPhotos.length} foto(s) quedaron en el almacen externo y deben borrarse a mano.`
            : null,
        });
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    });

    // Borrar usuarios es la operación más destructiva: solo administración.
  app.delete('/api/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      if (req.params.id === (req as any).user?.id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
      }
      const deleted = await deleteUser(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json({ success: true, message: 'Usuario eliminado exitosamente' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- RECONOCIMIENTO FACIAL PARA ENTRADA Y SALIDA PEATONAL (RF-03, RF-05, RF-08, RF-11) ---

    // Obtener candidatos biométricos registrados para el módulo de cámara
    app.get('/api/recognition/candidates', authenticateToken, requireRole('admin', 'security'), async (_req, res) => {
      try {
        const users = await getAllUsers();
        // Solo entran quienes tienen enrolment real: antes esto devolvía
        // faceEnrolled: true fijo y listaba a todo el mundo como inscrito.
        const candidates = users
          .map(u => {
            const enrollment = summarizeEnrollment(u);
            return {
              id: u.id,
              name: u.name,
              role: u.role,
              documentId: u.documentId,
              avatarUrl: u.avatarUrl,
              facultyOrDept: u.facultyOrDept,
              status: u.status,
              faceEnrolled: enrollment.status === 'enrolled',
              enrollmentStatus: enrollment.status,
              templatesCount: enrollment.templatesCount,
              photosCount: enrollment.photosCount,
            };
          })
          .filter(c => c.status === 'active')
          .sort((a, b) => a.name.localeCompare(b.name, 'es'));
        res.json(candidates);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

  // Verificación facial en tiempo real para Entrada o Salida peatonal
  app.post('/api/recognition/verify-face', authenticateToken, requireRole('admin', 'security'), async (req, res) => {
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

        // No se puede "reconocer" a quien no tiene enrolment real: sin vectores
        // no hay nada que comparar. Antes esta ruta aceptaba cualquier id.
        const enrollment = summarizeEnrollment(user);
        if (enrollment.status !== 'enrolled') {
          return res.status(409).json({
            error:
              enrollment.status === 'photos_pending'
                ? 'El usuario tiene fotos capturadas pero sin vectores: el reconocimiento facial no esta operativo todavia.'
                : 'El usuario no tiene enrolamiento facial registrado.',
            enrollmentStatus: enrollment.status,
            authorized: false,
          });
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
            faceEnrolled: enrollment.status === 'enrolled',
            enrollmentStatus: enrollment.status,
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
  app.post('/api/recognition/manual-access', authenticateToken, requireRole('admin', 'security'), async (req, res) => {
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

  app.get('/api/access-logs', authenticateToken, async (req, res) => {
    try {
      const { userId, direction, status, search, limit } = req.query;
      const sessionUser = (req as any).user as { id: string; role: UserRole };
      const isPrivileged = sessionUser.role === 'admin' || sessionUser.role === 'security';

      // Un estudiante solo puede consultar su propio historial.
      const effectiveUserId = isPrivileged ? (userId as string) : sessionUser.id;

      const logs = await getAccessLogs({
        userId: effectiveUserId,
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
  app.get('/api/access-logs/export', authenticateToken, requireRole('admin', 'security'), async (req, res) => {
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

  app.get('/api/stats', authenticateToken, async (_req, res) => {
    try {
      const stats = await getSystemStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Connect to MongoDB if MONGODB_URI is provided
  await connectToMongoDB();

  // --- MONGODB ENDPOINTS (UNIMINUTO Sede Ibagué) ---

  // Obtener estado de la conexión a MongoDB
  app.get('/api/mongodb/status', authenticateToken, requireRole('admin'), (_req, res) => {
    try {
      const status = getMongoConnectionStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Probar conexión a MongoDB con URI provisto
  // Reconfigurar la base de datos de toda la aplicación: solo administración.
  app.post('/api/mongodb/connect', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { uri } = req.body;
      const success = await connectToMongoDB(uri);
      const status = getMongoConnectionStatus();
      res.json({ success, status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
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
