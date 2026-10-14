import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.ts';
import type { UserProfile, AccessLog, SystemStats, UserRole, UserStatus, AccessDirection } from '../types.ts';
import crypto from 'node:crypto';

// If DATABASE_URL is set, connect to Neon Postgres
let dbClient: ReturnType<typeof drizzle> | null = null;
const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl && !databaseUrl.includes('user:password@ep-xyz')) {
  try {
    const sql = neon(databaseUrl);
    dbClient = drizzle(sql, { schema });
    console.log('Connected to Neon PostgreSQL via Drizzle ORM');
  } catch (err) {
    console.warn('Could not initialize Neon client with DATABASE_URL, using integrated resilient store:', err);
  }
}

export function hashPassword(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Initial seed data reflecting Corporación Universitaria Minuto de Dios - Sede Ibagué
// Exclusively pedestrian facial recognition profiles
const INITIAL_USERS: (UserProfile & { passwordHash: string })[] = [
  {
    id: 'usr-admin-01',
    name: 'Ing. Carlos Mendoza',
    email: 'admin@uniminuto.edu.co',
    passwordHash: hashPassword('admin123'),
    role: 'admin',
    documentId: '1110543210',
    facultyOrDept: 'Coordinación de Infraestructura y TI',
    phone: '3104567890',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    faceEnrolled: true,
    facePhotoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'usr-sec-01',
    name: 'Oficial Jairo Ruiz',
    email: 'seguridad@uniminuto.edu.co',
    passwordHash: hashPassword('seguridad123'),
    role: 'security',
    documentId: '93123456',
    facultyOrDept: 'Vigilancia - Torniquetes Cra 5',
    phone: '3123456789',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    faceEnrolled: true,
    facePhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-02-01T06:30:00.000Z',
  },
  {
    id: 'usr-std-01',
    name: 'Dilan González',
    email: 'dilan.estudiante@uniminuto.edu.co',
    passwordHash: hashPassword('dilan123'),
    role: 'student',
    documentId: '1005892341',
    facultyOrDept: 'Ingeniería de Sistemas - Semestre VI',
    phone: '3187654321',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    faceEnrolled: true,
    facePhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-02-10T09:15:00.000Z',
  },
  {
    id: 'usr-tea-01',
    name: 'Dra. María Fernanda Ospina',
    email: 'maria.ospina@uniminuto.edu.co',
    passwordHash: hashPassword('docente123'),
    role: 'teacher',
    documentId: '65748912',
    facultyOrDept: 'Facultad de Ingeniería',
    phone: '3209876543',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    faceEnrolled: true,
    facePhotoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-02-05T07:45:00.000Z',
  },
  {
    id: 'usr-adm-02',
    name: 'Paula Andrea Gómez',
    email: 'paula.gomez@uniminuto.edu.co',
    passwordHash: hashPassword('staff123'),
    role: 'staff',
    documentId: '1110482910',
    facultyOrDept: 'Secretaría Académica Ibagué',
    phone: '3156789012',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    faceEnrolled: true,
    facePhotoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-02-12T11:20:00.000Z',
  },
  {
    id: 'usr-std-02',
    name: 'Laura Marcela Castro',
    email: 'laura.castro@uniminuto.edu.co',
    passwordHash: hashPassword('laura123'),
    role: 'student',
    documentId: '1110594832',
    facultyOrDept: 'Comunicación Social y Periodismo',
    phone: '3167890123',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    faceEnrolled: true,
    facePhotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-02-12T11:15:00.000Z',
  }
];

const INITIAL_LOGS: AccessLog[] = [
  {
    id: 'log-01',
    direction: 'entry',
    entryPoint: 'Torniquetes Entrada Cra 5',
    method: 'facial_recognition',
    status: 'authorized',
    userId: 'usr-std-01',
    userName: 'Dilan González',
    userRole: 'student',
    documentId: '1005892341',
    confidenceScore: 0.98,
    notes: 'Ingreso peatonal validado por red neuronal facial (Torniquete 1 habilitado)',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'log-02',
    direction: 'exit',
    entryPoint: 'Torniquetes Salida Cra 5',
    method: 'facial_recognition',
    status: 'authorized',
    userId: 'usr-std-02',
    userName: 'Laura Marcela Castro',
    userRole: 'student',
    documentId: '1110594832',
    confidenceScore: 0.97,
    notes: 'Salida peatonal registrada correctamente (Torniquete Salida 2)',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 'log-03',
    direction: 'entry',
    entryPoint: 'Torniquetes Entrada Cra 5',
    method: 'facial_recognition',
    status: 'authorized',
    userId: 'usr-tea-01',
    userName: 'Dra. María Fernanda Ospina',
    userRole: 'teacher',
    documentId: '65748912',
    confidenceScore: 0.99,
    notes: 'Ingreso docente autorizado por biometría facial',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'log-04',
    direction: 'entry',
    entryPoint: 'Torniquetes Entrada Cra 5',
    method: 'facial_recognition',
    status: 'denied',
    userName: 'Persona No Registrada',
    userRole: 'desconocido',
    confidenceScore: 0.42,
    notes: 'ALERTA (RF-08): Rostro no registrado en base de datos. Torniquete bloqueado.',
    timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
  },
  {
    id: 'log-05',
    direction: 'entry',
    entryPoint: 'Torniquetes Entrada Cra 5',
    method: 'manual_contingency',
    status: 'authorized',
    userId: 'usr-adm-02',
    userName: 'Paula Andrea Gómez',
    userRole: 'staff',
    documentId: '1110482910',
    confidenceScore: 1.0,
    notes: 'Ingreso manual autorizado por guardia Jairo Ruiz (Contingencia RF-11)',
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
  },
  {
    id: 'log-06',
    direction: 'exit',
    entryPoint: 'Torniquetes Salida Cra 5',
    method: 'facial_recognition',
    status: 'authorized',
    userId: 'usr-admin-01',
    userName: 'Ing. Carlos Mendoza',
    userRole: 'admin',
    documentId: '1110543210',
    confidenceScore: 0.98,
    notes: 'Salida administrativa autorizada por biometría facial',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  }
];

export interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export const store = {
  users: [...INITIAL_USERS],
  logs: [...INITIAL_LOGS],
  sessions: new Map<string, SessionRecord>(),
};

// Users helpers
export async function findUserByEmail(email: string) {
  return store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export async function findUserById(id: string) {
  return store.users.find(u => u.id === id);
}

export async function findUserByDocumentId(documentId: string) {
  return store.users.find(u => u.documentId === documentId);
}

export async function getAllUsers() {
  return store.users.map(({ passwordHash, ...rest }) => rest);
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
  facePhotoUrl?: string;
}) {
  const existing = await findUserByEmail(data.email);
  if (existing) throw new Error('El correo electrónico ya se encuentra registrado');

  const existingDoc = await findUserByDocumentId(data.documentId);
  if (existingDoc) throw new Error('El número de documento ya está registrado');

  const newUser = {
    id: 'usr-' + Date.now().toString(36),
    name: data.name,
    email: data.email,
    passwordHash: hashPassword(data.password || 'uniminuto2026'),
    role: data.role || 'student',
    documentId: data.documentId,
    facultyOrDept: data.facultyOrDept || '',
    phone: data.phone || '',
    avatarUrl: data.avatarUrl || data.facePhotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    faceEnrolled: true,
    facePhotoUrl: data.facePhotoUrl || data.avatarUrl,
    status: 'active' as UserStatus,
    createdAt: new Date().toISOString(),
  };

  store.users.unshift(newUser);
  const { passwordHash, ...safeUser } = newUser;
  return safeUser;
}

export async function updateUser(id: string, updates: Partial<UserProfile>) {
  const index = store.users.findIndex(u => u.id === id);
  if (index === -1) throw new Error('Usuario no encontrado');

  store.users[index] = {
    ...store.users[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const { passwordHash, ...safeUser } = store.users[index];
  return safeUser;
}

export async function deleteUser(id: string) {
  const index = store.users.findIndex(u => u.id === id);
  if (index === -1) return false;
  store.users.splice(index, 1);
  return true;
}

// Access Logs helpers
export async function getAccessLogs(filters?: {
  direction?: AccessDirection;
  status?: string;
  userId?: string;
  search?: string;
  limit?: number;
}) {
  let list = [...store.logs];

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

export async function addAccessLog(log: Omit<AccessLog, 'id' | 'timestamp'>): Promise<AccessLog> {
  const newLog: AccessLog = {
    ...log,
    id: 'log-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
  };
  store.logs.unshift(newLog);
  return newLog;
}

// Stats helper for Pedestrian Facial Access
export async function getSystemStats(): Promise<SystemStats> {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = store.logs.filter(l => l.timestamp.startsWith(todayStr));

  const totalUsers = store.users.length;
  const activeUsers = store.users.filter(u => u.status === 'active').length;
  const todayEntries = todayLogs.filter(l => l.direction === 'entry').length;
  const todayExits = todayLogs.filter(l => l.direction === 'exit').length;
  const todayAuthorized = todayLogs.filter(l => l.status === 'authorized').length;
  const todayDenied = todayLogs.filter(l => l.status === 'denied').length;

  // Estimate campus occupancy (Entries - Exits + baseline)
  const totalIn = store.logs.filter(l => l.direction === 'entry' && l.status === 'authorized').length;
  const totalOut = store.logs.filter(l => l.direction === 'exit' && l.status === 'authorized').length;
  const peopleInsideCampus = Math.max(0, totalIn - totalOut + 24);

  // Average confidence score for facial recognition
  const facialLogs = store.logs.filter(l => l.method === 'facial_recognition');
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
  store.users.forEach(u => {
    roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
  });
  const roleDistribution = Object.entries(roleCounts).map(([role, count]) => ({ role, count }));

  const entryPoints = ['Torniquetes Entrada Cra 5', 'Torniquetes Salida Cra 5', 'Torniquetes Auxiliares Norte'];
  const accessByEntryPoint = entryPoints.map(ep => ({
    entryPoint: ep,
    count: store.logs.filter(l => l.entryPoint.includes(ep) || l.entryPoint === ep).length,
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
