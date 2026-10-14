/**
 * SCRIPT DE INICIALIZACIÓN MONGODB (mongosh / MongoDB Atlas / Compass)
 * Proyecto: "Aplicación móvil con visión artificial para el control y gestión del acceso
 *            peatonal por reconocimiento facial en la Corporación Universitaria Minuto de Dios – Sede Ibagué"
 * Investigador: Dilan González • Ingeniería de Sistemas
 * Año: 2026
 *
 * Modo de uso en consola de comandos:
 *   mongosh "mongodb://localhost:27017/uniminuto_acceso" < init-mongo.js
 * O bien, abre MongoDB Compass -> pestaña MONGOSH abajo -> pega este archivo completo.
 */

db = db.getSiblingDB("uniminuto_acceso");
print("==================================================================");
print(">>> INICIALIZANDO BASE DE DATOS MONGODB: CONTROL PEATONAL FACIAL <<<");
print("==================================================================");

// 1. Limpieza de colecciones
db.users.drop();
db.access_logs.drop();
db.sessions.drop();
db.entry_points.drop();

// -------------------------------------------------------------
// COLECCIÓN 1: users (Comunidad Universitaria y Perfil Biométrico)
// -------------------------------------------------------------
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "passwordHash", "role", "documentId", "status"],
      properties: {
        name: { bsonType: "string", description: "Nombre y apellido completo" },
        email: { bsonType: "string", pattern: "^.+@.+\\..+$", description: "Correo institucional @uniminuto.edu.co" },
        passwordHash: { bsonType: "string" },
        role: { enum: ["admin", "security", "student", "teacher", "staff", "visitor"] },
        documentId: { bsonType: "string", description: "Cédula o carné institucional único" },
        facultyOrDept: { bsonType: ["string", "null"] },
        phone: { bsonType: ["string", "null"] },
        avatarUrl: { bsonType: ["string", "null"] },
        status: { enum: ["active", "suspended"] },
        biometricProfile: {
          bsonType: "object",
          properties: {
            facialEmbeddings: { bsonType: "array", description: "Vector biométrico para visión artificial" },
            enrolledAt: { bsonType: "date" },
            photoUrl: { bsonType: "string" }
          }
        },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ documentId: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ status: 1 });
db.users.createIndex({ name: "text", facultyOrDept: "text" });

// -------------------------------------------------------------
// COLECCIÓN 2: access_logs (Bitácora de Entradas y Salidas Peatonales)
// -------------------------------------------------------------
db.createCollection("access_logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["direction", "entryPoint", "method", "status", "userName", "userRole", "confidenceScore"],
      properties: {
        direction: { enum: ["entry", "exit"], description: "Entrada o Salida del campus" },
        entryPoint: { bsonType: "string", description: "Torniquetes Carrera 5, Torniquetes Norte, etc." },
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
db.access_logs.createIndex({ status: 1 });
db.access_logs.createIndex({ userId: 1 });

// -------------------------------------------------------------
// COLECCIÓN 3: sessions (Sesiones con auto-expiración TTL)
// -------------------------------------------------------------
db.createCollection("sessions");
db.sessions.createIndex({ token: 1 }, { unique: true });
db.sessions.createIndex({ userId: 1 });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// -------------------------------------------------------------
// COLECCIÓN 4: entry_points (Torniquetes Físicos y Cámaras Faciales)
// -------------------------------------------------------------
db.createCollection("entry_points");
db.entry_points.createIndex({ code: 1 }, { unique: true });

// -------------------------------------------------------------
// DATOS SEMILLA UNIMINUTO SEDE IBAGUÉ
// -------------------------------------------------------------
const idCarlos = new ObjectId("65f1a1000000000000000001");
const idJairo  = new ObjectId("65f1a1000000000000000002");
const idDilan  = new ObjectId("65f1a1000000000000000003");
const idProfe  = new ObjectId("65f1a1000000000000000004");
const idLaura  = new ObjectId("65f1a1000000000000000005");

db.users.insertMany([
  {
    _id: idCarlos,
    name: "Ing. Carlos Mendoza",
    email: "admin@uniminuto.edu.co",
    passwordHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
    role: "admin",
    documentId: "1110543210",
    facultyOrDept: "Coordinación de Infraestructura y TI",
    phone: "3104567890",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    status: "active",
    biometricProfile: {
      facialEmbeddings: [0.12, -0.45, 0.88, 0.23],
      enrolledAt: new Date("2026-01-15T08:00:00Z"),
      photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"
    },
    createdAt: new Date("2026-01-15T08:00:00Z"),
    updatedAt: new Date("2026-01-15T08:00:00Z")
  },
  {
    _id: idJairo,
    name: "Oficial Jairo Ruiz",
    email: "seguridad@uniminuto.edu.co",
    passwordHash: "04f8996da763b7a969b1028ee3007569eaf3a635486ddab211d512c85b9df8fb",
    role: "security",
    documentId: "93123456",
    facultyOrDept: "Vigilancia - Torniquetes Cra 5",
    phone: "3123456789",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    status: "active",
    biometricProfile: {
      facialEmbeddings: [0.05, -0.21, 0.44, 0.76],
      enrolledAt: new Date("2026-02-01T06:30:00Z"),
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
    },
    createdAt: new Date("2026-02-01T06:30:00Z"),
    updatedAt: new Date("2026-02-01T06:30:00Z")
  },
  {
    _id: idDilan,
    name: "Dilan González",
    email: "dilan.estudiante@uniminuto.edu.co",
    passwordHash: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f",
    role: "student",
    documentId: "1005892341",
    facultyOrDept: "Ingeniería de Sistemas - Semestre VI",
    phone: "3187654321",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    status: "active",
    biometricProfile: {
      facialEmbeddings: [-0.34, 0.82, -0.19, 0.42],
      enrolledAt: new Date("2026-02-10T10:00:00Z"),
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    },
    createdAt: new Date("2026-02-10T10:00:00Z"),
    updatedAt: new Date("2026-02-10T10:00:00Z")
  },
  {
    _id: idProfe,
    name: "Dra. María Fernanda Ospina",
    email: "maria.ospina@uniminuto.edu.co",
    passwordHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
    role: "teacher",
    documentId: "65748912",
    facultyOrDept: "Facultad de Ingeniería",
    phone: "3209876543",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    status: "active",
    biometricProfile: {
      facialEmbeddings: [0.18, 0.33, -0.52, 0.29],
      enrolledAt: new Date("2026-01-20T09:00:00Z"),
      photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80"
    },
    createdAt: new Date("2026-01-20T09:00:00Z"),
    updatedAt: new Date("2026-01-20T09:00:00Z")
  },
  {
    _id: idLaura,
    name: "Laura Marcela Castro",
    email: "laura.castro@uniminuto.edu.co",
    passwordHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
    role: "student",
    documentId: "1110594832",
    facultyOrDept: "Comunicación Social y Periodismo",
    phone: "3167890123",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    status: "active",
    biometricProfile: {
      facialEmbeddings: [0.45, -0.12, 0.67, -0.38],
      enrolledAt: new Date("2026-02-12T11:15:00Z"),
      photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"
    },
    createdAt: new Date("2026-02-12T11:15:00Z"),
    updatedAt: new Date("2026-02-12T11:15:00Z")
  }
]);

db.entry_points.insertMany([
  {
    code: "IBG-P-01",
    name: "Torniquetes Entrada Carrera 5 (Cámara Facial 1)",
    campus: "UNIMINUTO Sede Ibagué",
    gateType: "pedestrian",
    cameraUrl: "rtsp://cam-entrada-cra5.ibague.uniminuto.edu.co/live",
    barrierControllerIp: "192.168.10.21",
    isActive: true
  },
  {
    code: "IBG-P-02",
    name: "Torniquetes Salida Carrera 5 (Cámara Facial 2)",
    campus: "UNIMINUTO Sede Ibagué",
    gateType: "pedestrian",
    cameraUrl: "rtsp://cam-salida-cra5.ibague.uniminuto.edu.co/live",
    barrierControllerIp: "192.168.10.22",
    isActive: true
  }
]);

db.access_logs.insertMany([
  {
    direction: "entry",
    entryPoint: "Torniquetes Entrada Carrera 5",
    method: "facial_recognition",
    status: "authorized",
    userId: idDilan,
    userName: "Dilan González",
    userRole: "student",
    documentId: "1005892341",
    confidenceScore: 0.98,
    notes: "Ingreso peatonal validado por IA facial (98%). Torniquete 1 habilitado.",
    alertTriggered: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 20)
  },
  {
    direction: "exit",
    entryPoint: "Torniquetes Salida Carrera 5",
    method: "facial_recognition",
    status: "authorized",
    userId: idLaura,
    userName: "Laura Marcela Castro",
    userRole: "student",
    documentId: "1110594832",
    confidenceScore: 0.97,
    notes: "Salida peatonal registrada por biometría facial",
    alertTriggered: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 45)
  },
  {
    direction: "entry",
    entryPoint: "Torniquetes Entrada Carrera 5",
    method: "facial_recognition",
    status: "denied",
    userName: "Persona No Registrada",
    userRole: "desconocido",
    confidenceScore: 0.41,
    notes: "ALERTA (RF-08): Rostro sin correspondencia en la base de datos institucional. Torniquete bloqueado.",
    alertTriggered: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 90)
  }
]);

print("------------------------------------------------------------------");
print(">>> BASE DE DATOS MONGODB CONFIGURADA CON ÉXITO <<<");
print("Colección 'users':       " + db.users.countDocuments() + " personas");
print("Colección 'entry_points':" + db.entry_points.countDocuments() + " torniquetes");
print("Colección 'access_logs': " + db.access_logs.countDocuments() + " registros");
print("==================================================================");
