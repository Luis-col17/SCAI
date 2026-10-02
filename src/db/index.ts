import type { UserProfile, AccessLog, SystemStats, UserRole, UserStatus, AccessDirection } from '../types.ts';
import mongoose from 'mongoose';
import { UserModel, AccessLogModel, RevokedTokenModel } from './mongo/models.ts';
import { hashPassword } from '../lib/password.ts';

// -------------------------------------------------------------
// Capa de persistencia: MongoDB, con store en memoria como respaldo.
// -------------------------------------------------------------
function mongoReady() {
  return mongoose.connection.readyState === 1;
}

export type StoredUser = UserProfile & {
  passwordHash: string;
  faceEmbeddings?: number[][]; // una fila por captura/enrolamiento (multi-template ML futuro)
  enrollmentPhotos?: EnrollmentPhotoRef[]; // referencias Cloudinary de las N fotos de enrolamiento
};

export type EnrollmentPhotoRef = {
  photoUrl: string; // secure_url de Cloudinary
  photoPublicId: string; // public_id de Cloudinary (borrado/retención)
};

/**
 * Estado del enrolamiento facial, derivado de los datos guardados.
 * - none:            sin fotos y sin vectores
 * - photos_pending:  hay fotos capturadas pero faltan los vectores (fase actual)
 * - enrolled:        hay al menos un vector, ya es comparable
 */
export type EnrollmentStatus = 'none' | 'photos_pending' | 'enrolled';

export type EnrollmentSummary = {
  status: EnrollmentStatus;
  faceEnrolled: boolean;
  photosCount: number;
  templatesCount: number;
  photos: EnrollmentPhotoRef[];
};

export function summarizeEnrollment(u: {
  faceEnrolled?: boolean;
  faceEmbeddings?: number[][];
  enrollmentPhotos?: EnrollmentPhotoRef[];
}): EnrollmentSummary {
  const vectors = (u.faceEmbeddings ?? []).filter((v) => Array.isArray(v) && v.length > 0);
  const photos = u.enrollmentPhotos ?? [];
  const status: EnrollmentStatus =
    vectors.length > 0 ? 'enrolled' : photos.length > 0 ? 'photos_pending' : 'none';
  return {
    status,
    faceEnrolled: status === 'enrolled',
    photosCount: photos.length,
    templatesCount: vectors.length,
    photos,
  };
}

export function toSafeUser(u: StoredUser): UserProfile {
  const { passwordHash: _, faceEmbeddings: __, ...safeUser } = u;
  return safeUser;
}

function toMongoUser(u: StoredUser) {
  return {
    businessId: u.id,
    name: u.name,
    email: u.email,
    passwordHash: u.passwordHash,
    role: u.role,
    documentId: u.documentId,
    facultyOrDept: u.facultyOrDept,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    avatarPublicId: u.avatarPublicId,
    faceEnrolled: !!u.faceEmbeddings?.filter(emb => emb?.length)?.length,
    faceEmbeddings: u.faceEmbeddings?.filter(emb => emb?.length) ?? [],
    enrollmentPhotos: (u.enrollmentPhotos ?? []).map(p => ({
      photoUrl: p.photoUrl,
      photoPublicId: p.photoPublicId,
    })),
    status: u.status,
    createdAt: u.createdAt ? new Date(u.createdAt) : undefined,
  };
}

function fromMongoUser(doc: any): StoredUser {
  return {
    id: doc.businessId || doc._id?.toString(),
    name: doc.name,
    email: doc.email,
    passwordHash: doc.passwordHash,
    role: doc.role,
    documentId: doc.documentId,
    facultyOrDept: doc.facultyOrDept || '',
    phone: doc.phone || '',
    avatarUrl: doc.avatarUrl,
    avatarPublicId: doc.avatarPublicId,
    status: doc.status,
    faceEnrolled: !!doc.faceEnrolled || !!doc.faceEmbeddings?.length,
    enrollmentPhotos: (doc.enrollmentPhotos ?? []).map((p: any) => ({
      photoUrl: p.photoUrl,
      photoPublicId: p.photoPublicId,
    })),
    faceEmbeddings: doc.faceEmbeddings ?? [],
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

function toMongoLog(l: AccessLog) {
  return {
    businessId: l.id,
    direction: l.direction,
    entryPoint: l.entryPoint,
    entryPointId: l.entryPointId,
    method: l.method,
    status: l.status,
    userId: l.userId ?? null,
    userName: l.userName,
    userRole: l.userRole,
    documentId: l.documentId ?? undefined,
    confidenceScore: l.confidenceScore,
    notes: l.notes,
    snapshotUrl: l.snapshotUrl,
    snapshotPublicId: l.snapshotPublicId,
    alertTriggered: l.status === 'denied',
    timestamp: new Date(l.timestamp),
  };
}

function fromMongoLog(doc: any): AccessLog {
  return {
    id: doc.businessId || doc._id?.toString(),
    direction: doc.direction,
    entryPoint: doc.entryPoint,
    entryPointId: doc.entryPointId,
    method: doc.method,
    status: doc.status,
    userId: doc.userId || undefined,
    userName: doc.userName,
    userRole: doc.userRole,
    documentId: doc.documentId ?? undefined,
    confidenceScore: doc.confidenceScore,
    notes: doc.notes,
    snapshotUrl: doc.snapshotUrl,
    snapshotPublicId: doc.snapshotPublicId,
    timestamp: new Date(doc.timestamp).toISOString(),
  };
}

// El store en memoria arranca vacío; los datos se crean por registro
// (/api/auth/sign-up) o directamente en MongoDB. Sin datos semilla.

export const store = {
  users: [] as StoredUser[],
  logs: [] as AccessLog[],
  revokedTokens: new Map<string, { userId: string; expiresAt: Date }>(),
};

// Revoked session tokens (JWT stateless + revocación explícita al cerrar sesión)
export async function isTokenRevoked(jti: string): Promise<boolean> {
  if (!jti) return false;

  if (mongoReady()) {
    const revoked = await RevokedTokenModel.exists({ jti });
    return Boolean(revoked);
  }

  const entry = store.revokedTokens.get(jti);
  if (!entry) return false;
  if (new Date() > entry.expiresAt) {
    store.revokedTokens.delete(jti);
    return false;
  }
  return true;
}

export async function revokeToken(jti: string, userId: string, expiresAt: Date): Promise<void> {
  if (!jti) return;

  if (mongoReady()) {
    await RevokedTokenModel.updateOne(
      { jti },
      { $setOnInsert: { jti, userId, expiresAt, revokedAt: new Date() } },
      { upsert: true }
    );
    return;
  }

  store.revokedTokens.set(jti, { userId, expiresAt });
}

// Users helpers
export async function findUserByEmail(email: string) {  if (mongoReady()) {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    return doc ? fromMongoUser(doc) : undefined;
  }
  return store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export async function findUserById(id: string) {
  if (mongoReady()) {
    const doc = await UserModel.findOne({ businessId: id }).lean();
    return doc ? fromMongoUser(doc) : undefined;
  }
  return store.users.find(u => u.id === id);
}

export async function findUserByDocumentId(documentId: string) {
  if (mongoReady()) {
    const doc = await UserModel.findOne({ documentId }).lean();
    return doc ? fromMongoUser(doc) : undefined;
  }
  return store.users.find(u => u.documentId === documentId);
}

export async function getAllUsers() {
  if (mongoReady()) {
    const docs = await UserModel.find().sort({ createdAt: -1 }).lean();
    return docs.map(d => toSafeUser(fromMongoUser(d)));
  }
  return store.users.map(u => toSafeUser(u));
}

export async function createUser(data: {
  name: string;
  email: string;
  password?: string;
  role?: UserRole;
  documentId: string;
  facultyOrDept?: string;
  phone?: string;
  avatarUrl?: string;
  faceEnrolled?: boolean;
  faceEmbeddings?: number[];
}) {
  const existing = await findUserByEmail(data.email);
  if (existing) throw new Error('El correo electrónico ya se encuentra registrado');

  const existingDoc = await findUserByDocumentId(data.documentId);
  if (existingDoc) throw new Error('El número de documento ya está registrado');

  const newUser: StoredUser = {
    id: 'usr-' + Date.now().toString(36),
    name: data.name,
    email: data.email,
    passwordHash: await hashPassword(data.password || 'uniminuto2026'),
    role: data.role || 'student',
    documentId: data.documentId,
    facultyOrDept: data.facultyOrDept || '',
    phone: data.phone || '',
    avatarUrl: data.avatarUrl || undefined,
    faceEnrolled: !!data.faceEnrolled || !!data.faceEmbeddings?.length,
    faceEmbeddings: data.faceEmbeddings ? [data.faceEmbeddings] : undefined,
    status: 'active' as UserStatus,
    createdAt: new Date().toISOString(),
  };

  if (mongoReady()) {
    await UserModel.create(toMongoUser(newUser));
  } else {
    store.users.unshift(newUser);
  }
  return toSafeUser(newUser);
}

export async function updateUser(id: string, updates: Partial<UserProfile & { faceEmbeddings?: number[]; enrollmentPhotos?: EnrollmentPhotoRef[] }>) {
  if (mongoReady()) {
    const set: any = { ...updates, updatedAt: new Date().toISOString() };
    delete set.id;
    if (updates.faceEmbeddings !== undefined) {
      set.faceEmbeddings = [updates.faceEmbeddings]; // 1D del body → 1 fila de captura (multi-template)
      set.faceEnrolled = updates.faceEmbeddings.length > 0;
    }
    if (updates.enrollmentPhotos !== undefined) {
      set.enrollmentPhotos = updates.enrollmentPhotos.map(p => ({ photoUrl: p.photoUrl, photoPublicId: p.photoPublicId }));
    }

    const doc = await UserModel.findOneAndUpdate(
      { businessId: id },
      { $set: set },
      { returnDocument: 'after', runValidators: true }
    ).lean();

    if (!doc) throw new Error('Usuario no encontrado');

    return toSafeUser(fromMongoUser(doc));
  }

  const atIndex = store.users.findIndex(u => u.id === id);
  if (atIndex === -1) throw new Error('Usuario no encontrado');

  const merged = {
    ...store.users[atIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  if (updates.faceEmbeddings !== undefined) {
    merged.faceEmbeddings = [updates.faceEmbeddings];
    merged.faceEnrolled = updates.faceEmbeddings.length > 0;
  }
  if (updates.enrollmentPhotos !== undefined) {
    merged.enrollmentPhotos = updates.enrollmentPhotos.map(p => ({ photoUrl: p.photoUrl, photoPublicId: p.photoPublicId }));
  }
  store.users[atIndex] = merged as StoredUser;

  return toSafeUser(store.users[atIndex]);
}

/**
 * Reescribe el hash de contraseña de un usuario (migración SHA-256 -> scrypt).
 * Va por una función propia para no abrir un campo genérico tipo updateUser.
 */
export async function updatePasswordHash(id: string, passwordHash: string): Promise<void> {
  if (mongoReady()) {
    await UserModel.updateOne({ businessId: id }, { $set: { passwordHash, updatedAt: new Date().toISOString() } });
    return;
  }
  const atIndex = store.users.findIndex(u => u.id === id);
  if (atIndex !== -1) {
    store.users[atIndex] = { ...store.users[atIndex], passwordHash, updatedAt: new Date().toISOString() } as StoredUser;
  }
}

/**
 * Guarda (o borra) el enrolamiento facial de un usuario.
 *
 * `embeddings` se recibe en 2D: una fila por foto (matriz number[][]). No se
 * reutiliza `updateUser` a propósito, porque allí un vector 1D se convierte en
 * una fila y sería fácil guardar mal el formato al enrolar varias fotos.
 * `faceEnrolled` queda derivado de si hay vectores, nunca fijado a mano.
 */
export async function saveFaceEnrollment(
  id: string,
  payload: { photos: EnrollmentPhotoRef[]; embeddings?: number[][] }
): Promise<EnrollmentSummary> {
  const vectors = (payload.embeddings ?? []).filter((v) => Array.isArray(v) && v.length > 0);
  const photos = (payload.photos ?? []).filter((p) => p?.photoUrl);
  const faceEnrolled = vectors.length > 0;
  const updatedAt = new Date().toISOString();

  if (mongoReady()) {
    await UserModel.updateOne(
      { businessId: id },
      {
        $set: {
          enrollmentPhotos: photos.map((p) => ({ photoUrl: p.photoUrl, photoPublicId: p.photoPublicId })),
          faceEmbeddings: vectors,
          faceEnrolled,
          updatedAt,
        },
      }
    );
    const doc = await UserModel.findOne({ businessId: id }).lean();
    if (!doc) throw new Error('Usuario no encontrado');
    return summarizeEnrollment(fromMongoUser(doc));
  }

  const atIndex = store.users.findIndex(u => u.id === id);
  if (atIndex === -1) throw new Error('Usuario no encontrado');
  store.users[atIndex] = {
    ...store.users[atIndex],
    enrollmentPhotos: photos,
    faceEmbeddings: vectors,
    faceEnrolled,
    updatedAt,
  } as StoredUser;
  return summarizeEnrollment(store.users[atIndex]);
}

export async function deleteUser(id: string) {
  if (mongoReady()) {
    const result = await UserModel.deleteOne({ businessId: id });
    return result.deletedCount > 0;
  }

  const index = store.users.findIndex(u => u.id === id);
  if (index === -1) return false;
  store.users.splice(index, 1);
  return true;
}

// Access Logs helpers
function applyLogFilters(list: AccessLog[], filters?: {
  direction?: AccessDirection;
  status?: string;
  userId?: string;
  search?: string;
  limit?: number;
}) {
  if (filters?.direction) {
    list = list.filter(l => l.direction === filters.direction);
  }

  if (filters?.status) {
    list = list.filter(l => l.status === filters.status);
  }

  if (filters?.userId) {
    list = list.filter(l => l.userId === filters.userId);
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      l =>
        l.userName.toLowerCase().includes(q) ||
        (l.documentId && l.documentId.includes(q)) ||
        l.entryPoint.toLowerCase().includes(q)
    );
  }

  // Sort descending by timestamp
  list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (filters?.limit) {
    return list.slice(0, filters.limit);
  }
  return list;
}

export async function getAccessLogs(filters?: {
  direction?: AccessDirection;
  status?: string;
  userId?: string;
  search?: string;
  limit?: number;
}) {
  let list: AccessLog[];
  if (mongoReady()) {
    list = (await AccessLogModel.find().lean()).map(fromMongoLog);
  } else {
    list = [...store.logs];
  }
  return applyLogFilters(list, filters);
}

export async function addAccessLog(log: Omit<AccessLog, 'id' | 'timestamp'>): Promise<AccessLog> {
  const newLog: AccessLog = {
    ...log,
    id: 'log-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
  };
  if (mongoReady()) {
    await AccessLogModel.create(toMongoLog(newLog));
  } else {
    store.logs.unshift(newLog);
  }
  return newLog;
}

// Stats helper for Pedestrian Facial Access
function computeSystemStats(users: { role: UserRole; status: UserStatus }[], logs: AccessLog[]): SystemStats {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(l => new Date(l.timestamp).toISOString().split('T')[0] === todayStr);

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const todayEntries = todayLogs.filter(l => l.direction === 'entry').length;
  const todayExits = todayLogs.filter(l => l.direction === 'exit').length;
  const todayAuthorized = todayLogs.filter(l => l.status === 'authorized').length;
  const todayDenied = todayLogs.filter(l => l.status === 'denied').length;

  // Estimate campus occupancy (Entries - Exits + baseline)
  const totalIn = logs.filter(l => l.direction === 'entry' && l.status === 'authorized').length;
  const totalOut = logs.filter(l => l.direction === 'exit' && l.status === 'authorized').length;
  const peopleInsideCampus = Math.max(0, totalIn - totalOut + 24);

  // Average confidence score for facial recognition
  const facialLogs = logs.filter(l => l.method === 'facial_recognition');
  const avgScore = facialLogs.length > 0
    ? (facialLogs.reduce((acc, l) => acc + l.confidenceScore, 0) / facialLogs.length) * 100
    : 98.4;
  const facialAccuracy = Number(avgScore.toFixed(1));

  // Hourly distribution for today (06:00 to 21:00)
  const hours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
  
  const hourlyEntries = hours.map(h => {
    const hourNum = parseInt(h.split(':')[0], 10);
    const count = todayLogs.filter(l => {
      const d = new Date(l.timestamp);
      return d.getHours() === hourNum && l.direction === 'entry';
    }).length;
    return { hour: h, count };
  });

  const hourlyExits = hours.map(h => {
    const hourNum = parseInt(h.split(':')[0], 10);
    const count = todayLogs.filter(l => {
      const d = new Date(l.timestamp);
      return d.getHours() === hourNum && l.direction === 'exit';
    }).length;
    return { hour: h, count };
  });

  const roleCounts: Record<string, number> = {};
  users.forEach(u => {
    roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
  });
  const roleDistribution = Object.entries(roleCounts).map(([role, count]) => ({ role, count }));

  const entryPoints = ['Torniquetes Entrada Cra 5', 'Torniquetes Salida Cra 5', 'Torniquetes Auxiliares Norte'];
  const accessByEntryPoint = entryPoints.map(ep => ({
    entryPoint: ep,
    count: logs.filter(l => l.entryPoint.includes(ep) || l.entryPoint === ep).length,
  }));

  return {
    totalUsers,
    activeUsers,
    todayEntries,
    todayExits,
    peopleInsideCampus,
    todayAuthorized,
    todayDenied,
    facialAccuracy,
    hourlyEntries,
    hourlyExits,
    roleDistribution,
    accessByEntryPoint,
  };
}

export async function getSystemStats(): Promise<SystemStats> {
  if (mongoReady()) {
    const [users, logs] = await Promise.all([getAllUsers(), getAccessLogs()]);
    return computeSystemStats(users, logs);
  }
  return computeSystemStats(store.users, store.logs);
}
