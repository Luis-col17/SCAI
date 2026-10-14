import mongoose from 'mongoose';
import { UserModel, AccessLogModel, EntryPointModel } from './models.ts';
import { hashPassword } from '../index.ts';

export const MONGO_SEED_USERS = [
  {
    _id: new mongoose.Types.ObjectId('65f1a1000000000000000001'),
    name: 'Ing. Carlos Mendoza',
    email: 'admin@uniminuto.edu.co',
    passwordHash: hashPassword('admin123'),
    role: 'admin',
    documentId: '1110543210',
    facultyOrDept: 'Coordinación de Infraestructura y TI',
    phone: '3104567890',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    biometricProfile: {
      facialEmbeddings: [0.12, -0.45, 0.88, 0.23, -0.09, 0.67],
      enrolledAt: new Date('2026-01-15T08:00:00Z'),
      photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    },
    createdAt: new Date('2026-01-15T08:00:00Z'),
    updatedAt: new Date('2026-01-15T08:00:00Z'),
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a1000000000000000002'),
    name: 'Oficial Jairo Ruiz',
    email: 'seguridad@uniminuto.edu.co',
    passwordHash: hashPassword('seguridad123'),
    role: 'security',
    documentId: '93123456',
    facultyOrDept: 'Vigilancia - Torniquetes Cra 5',
    phone: '3123456789',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    biometricProfile: {
      facialEmbeddings: [0.05, -0.21, 0.44, 0.76, -0.32, 0.15],
      enrolledAt: new Date('2026-02-01T06:30:00Z'),
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    createdAt: new Date('2026-02-01T06:30:00Z'),
    updatedAt: new Date('2026-02-01T06:30:00Z'),
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a1000000000000000003'),
    name: 'Dilan González',
    email: 'dilan.estudiante@uniminuto.edu.co',
    passwordHash: hashPassword('dilan123'),
    role: 'student',
    documentId: '1005892341',
    facultyOrDept: 'Ingeniería de Sistemas - Semestre VI',
    phone: '3187654321',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    biometricProfile: {
      facialEmbeddings: [-0.34, 0.82, -0.19, 0.42, 0.65, -0.11],
      enrolledAt: new Date('2026-02-10T10:00:00Z'),
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    createdAt: new Date('2026-02-10T10:00:00Z'),
    updatedAt: new Date('2026-02-10T10:00:00Z'),
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a1000000000000000004'),
    name: 'Dra. María Fernanda Ospina',
    email: 'maria.ospina@uniminuto.edu.co',
    passwordHash: hashPassword('docente123'),
    role: 'teacher',
    documentId: '65748912',
    facultyOrDept: 'Facultad de Ingeniería',
    phone: '3209876543',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    biometricProfile: {
      facialEmbeddings: [0.18, 0.33, -0.52, 0.29, -0.14, 0.81],
      enrolledAt: new Date('2026-01-20T09:00:00Z'),
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    },
    createdAt: new Date('2026-01-20T09:00:00Z'),
    updatedAt: new Date('2026-01-20T09:00:00Z'),
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a1000000000000000005'),
    name: 'Laura Marcela Castro',
    email: 'laura.castro@uniminuto.edu.co',
    passwordHash: hashPassword('laura123'),
    role: 'student',
    documentId: '1110594832',
    facultyOrDept: 'Comunicación Social y Periodismo',
    phone: '3167890123',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    biometricProfile: {
      facialEmbeddings: [0.45, -0.12, 0.67, -0.38, 0.22, 0.54],
      enrolledAt: new Date('2026-02-12T11:15:00Z'),
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
    createdAt: new Date('2026-02-12T11:15:00Z'),
    updatedAt: new Date('2026-02-12T11:15:00Z'),
  },
];

export const MONGO_SEED_ENTRY_POINTS = [
  {
    _id: new mongoose.Types.ObjectId('65f1c3000000000000000001'),
    code: 'IBG-P-01',
    name: 'Torniquetes Entrada Carrera 5 (Cámara Facial 1)',
    campus: 'UNIMINUTO Sede Ibagué',
    gateType: 'pedestrian',
    cameraUrl: 'rtsp://cam-entrada-cra5.ibague.uniminuto.edu.co/live',
    barrierControllerIp: '192.168.10.21',
    isActive: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65f1c3000000000000000002'),
    code: 'IBG-P-02',
    name: 'Torniquetes Salida Carrera 5 (Cámara Facial 2)',
    campus: 'UNIMINUTO Sede Ibagué',
    gateType: 'pedestrian',
    cameraUrl: 'rtsp://cam-salida-cra5.ibague.uniminuto.edu.co/live',
    barrierControllerIp: '192.168.10.22',
    isActive: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65f1c3000000000000000003'),
    code: 'IBG-P-03',
    name: 'Torniquetes Peatonales Norte (Cámara Facial 3)',
    campus: 'UNIMINUTO Sede Ibagué',
    gateType: 'pedestrian',
    cameraUrl: 'rtsp://cam-norte-peatonal.ibague.uniminuto.edu.co/live',
    barrierControllerIp: '192.168.10.23',
    isActive: true,
  },
];

export const MONGO_SEED_LOGS = [
  {
    _id: new mongoose.Types.ObjectId('65f1d4000000000000000001'),
    direction: 'entry',
    entryPoint: 'Torniquetes Entrada Carrera 5',
    method: 'facial_recognition',
    status: 'authorized',
    userId: new mongoose.Types.ObjectId('65f1a1000000000000000003'),
    userName: 'Dilan González',
    userRole: 'student',
    documentId: '1005892341',
    confidenceScore: 0.98,
    notes: 'Ingreso peatonal validado por IA facial (98%). Torniquete 1 habilitado.',
    alertTriggered: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
  },
  {
    _id: new mongoose.Types.ObjectId('65f1d4000000000000000002'),
    direction: 'exit',
    entryPoint: 'Torniquetes Salida Carrera 5',
    method: 'facial_recognition',
    status: 'authorized',
    userId: new mongoose.Types.ObjectId('65f1a1000000000000000005'),
    userName: 'Laura Marcela Castro',
    userRole: 'student',
    documentId: '1110594832',
    confidenceScore: 0.97,
    notes: 'Salida peatonal registrada por biometría facial',
    alertTriggered: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
  },
  {
    _id: new mongoose.Types.ObjectId('65f1d4000000000000000003'),
    direction: 'entry',
    entryPoint: 'Torniquetes Entrada Carrera 5',
    method: 'facial_recognition',
    status: 'denied',
    userName: 'Persona No Registrada',
    userRole: 'desconocido',
    confidenceScore: 0.41,
    notes: 'ALERTA (RF-08): Rostro sin correspondencia en la base de datos institucional. Torniquete bloqueado.',
    alertTriggered: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
  },
];

export async function seedMongoDBDatabase() {
  try {
    if (mongoose.connection.readyState !== 1) {
      return { success: false, error: 'MongoDB no está conectado' };
    }

    await UserModel.deleteMany({});
    await EntryPointModel.deleteMany({});
    await AccessLogModel.deleteMany({});

    await UserModel.insertMany(MONGO_SEED_USERS);
    await EntryPointModel.insertMany(MONGO_SEED_ENTRY_POINTS);
    await AccessLogModel.insertMany(MONGO_SEED_LOGS);

    return {
      success: true,
      message: 'Base de datos MongoDB sembrada exitosamente con perfiles de reconocimiento facial peatonal',
      counts: {
        users: await UserModel.countDocuments(),
        entry_points: await EntryPointModel.countDocuments(),
        access_logs: await AccessLogModel.countDocuments(),
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function generateMongoShellScript(): string {
  return `/**
 * SCRIPT DE INICIALIZACIÓN MONGODB (mongosh / MongoDB Atlas)
 * Proyecto: "Control y Gestión del Acceso Peatonal por Reconocimiento Facial"
 * Corporación Universitaria Minuto de Dios - UNIMINUTO Sede Ibagué (2026)
 * Investigador: Dilan González • Ingeniería de Sistemas
 */

db = db.getSiblingDB("uniminuto_acceso");
print(">>> INICIALIZANDO COLECCIONES DE ACCESO FACIAL PEATONAL <<<");

db.users.drop();
db.access_logs.drop();
db.sessions.drop();
db.entry_points.drop();

// 1. Colección users
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "passwordHash", "role", "documentId", "status"],
      properties: {
        name: { bsonType: "string" },
        email: { bsonType: "string", pattern: "^.+@.+\\\\..+$" },
        passwordHash: { bsonType: "string" },
        role: { enum: ["admin", "security", "student", "teacher", "staff", "visitor"] },
        documentId: { bsonType: "string" },
        facultyOrDept: { bsonType: ["string", "null"] },
        phone: { bsonType: ["string", "null"] },
        avatarUrl: { bsonType: ["string", "null"] },
        status: { enum: ["active", "suspended"] },
        biometricProfile: {
          bsonType: "object",
          properties: {
            facialEmbeddings: { bsonType: "array" },
            enrolledAt: { bsonType: "date" },
            photoUrl: { bsonType: "string" }
          }
        }
      }
    }
  }
});

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ documentId: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ status: 1 });

// 2. Colección access_logs
db.createCollection("access_logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["direction", "entryPoint", "method", "status", "userName", "userRole", "confidenceScore"],
      properties: {
        direction: { enum: ["entry", "exit"] },
        entryPoint: { bsonType: "string" },
        method: { enum: ["facial_recognition", "manual_contingency", "qr_code"] },
        status: { enum: ["authorized", "denied"] },
        userId: { bsonType: ["objectId", "null"] },
        userName: { bsonType: "string" },
        userRole: { bsonType: "string" },
        documentId: { bsonType: ["string", "null"] },
        confidenceScore: { bsonType: "double", minimum: 0.0, maximum: 1.0 },
        notes: { bsonType: ["string", "null"] },
        snapshotUrl: { bsonType: ["string", "null"] },
        alertTriggered: { bsonType: "bool" },
        timestamp: { bsonType: "date" }
      }
    }
  }
});

db.access_logs.createIndex({ timestamp: -1, entryPoint: 1 });
db.access_logs.createIndex({ direction: 1, timestamp: -1 });

// 3. Colección sessions con TTL
db.createCollection("sessions");
db.sessions.createIndex({ token: 1 }, { unique: true });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 4. Colección entry_points
db.createCollection("entry_points");
db.entry_points.createIndex({ code: 1 }, { unique: true });

// Insertar datos iniciales
const usersData = ${JSON.stringify(MONGO_SEED_USERS, null, 2)};
usersData.forEach(u => {
  u._id = new ObjectId(u._id);
  if (u.biometricProfile && u.biometricProfile.enrolledAt) {
    u.biometricProfile.enrolledAt = new Date(u.biometricProfile.enrolledAt);
  }
  u.createdAt = new Date(u.createdAt);
  u.updatedAt = new Date(u.updatedAt);
  db.users.insertOne(u);
});

const entryPointsData = ${JSON.stringify(MONGO_SEED_ENTRY_POINTS, null, 2)};
entryPointsData.forEach(ep => {
  ep._id = new ObjectId(ep._id);
  db.entry_points.insertOne(ep);
});

const logsData = ${JSON.stringify(MONGO_SEED_LOGS, null, 2)};
logsData.forEach(l => {
  l._id = new ObjectId(l._id);
  if (l.userId) l.userId = new ObjectId(l.userId);
  l.timestamp = new Date(l.timestamp);
  db.access_logs.insertOne(l);
});

print("------------------------------------------------------------------");
print("Colección 'users':       " + db.users.countDocuments());
print("Colección 'entry_points':" + db.entry_points.countDocuments());
print("Colección 'access_logs': " + db.access_logs.countDocuments());
print("==================================================================");
`;
}
