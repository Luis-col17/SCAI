import mongoose, { Schema, Model } from 'mongoose';
import type { UserRole, UserStatus, AccessDirection, AccessMethod, AccessStatus } from '../../types.ts';

// -------------------------------------------------------------
// 1. USUARIOS (users collection)
// -------------------------------------------------------------
export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  documentId: string;
  facultyOrDept?: string;
  phone?: string;
  avatarUrl?: string;
  status: UserStatus;
  biometricProfile?: {
    facialEmbeddings?: number[];
    enrolledAt?: Date;
    photoUrl?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export const UserMongoSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'El correo institucional es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'security', 'student', 'teacher', 'staff', 'visitor'],
      default: 'student',
      required: true,
      index: true,
    },
    documentId: {
      type: String,
      required: [true, 'El número de cédula o carné es obligatorio'],
      unique: true,
      trim: true,
      index: true,
    },
    facultyOrDept: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
      index: true,
    },
    biometricProfile: {
      facialEmbeddings: {
        type: [Number],
        default: undefined,
      },
      enrolledAt: {
        type: Date,
        default: Date.now,
      },
      photoUrl: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

UserMongoSchema.index({ name: 'text', facultyOrDept: 'text' });

// -------------------------------------------------------------
// 2. BITÁCORA DE ACCESOS PEATONALES (access_logs collection)
// -------------------------------------------------------------
export interface IAccessLog {
  direction: AccessDirection; // 'entry' | 'exit'
  entryPoint: string;
  method: AccessMethod;
  status: AccessStatus;
  userId?: mongoose.Types.ObjectId | string | null;
  userName: string;
  userRole: UserRole | 'desconocido';
  documentId?: string;
  confidenceScore: number;
  notes?: string;
  snapshotUrl?: string;
  alertTriggered: boolean;
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export const AccessLogMongoSchema = new Schema<IAccessLog>(
  {
    direction: {
      type: String,
      enum: ['entry', 'exit'],
      required: true,
      index: true,
    },
    entryPoint: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    method: {
      type: String,
      enum: ['facial_recognition', 'manual_contingency', 'qr_code'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['authorized', 'denied'],
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    documentId: {
      type: String,
      trim: true,
      index: true,
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
      required: true,
      default: 0.95,
    },
    notes: {
      type: String,
      trim: true,
    },
    snapshotUrl: {
      type: String,
    },
    alertTriggered: {
      type: Boolean,
      default: false,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: -1,
    },
  },
  {
    timestamps: true,
    collection: 'access_logs',
  }
);

AccessLogMongoSchema.index({ timestamp: -1, entryPoint: 1 });
AccessLogMongoSchema.index({ direction: 1, timestamp: -1 });

// -------------------------------------------------------------
// 3. SESIONES DE USUARIO (sessions collection con TTL automático)
// -------------------------------------------------------------
export interface ISession {
  userId: mongoose.Types.ObjectId | string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
}

export const SessionMongoSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'sessions',
  }
);

// -------------------------------------------------------------
// 4. TORNIQUETES Y PUNTOS PEATONALES (entry_points collection)
// -------------------------------------------------------------
export interface IEntryPoint {
  code: string;
  name: string;
  campus: string;
  gateType: 'pedestrian';
  cameraUrl?: string;
  barrierControllerIp?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const EntryPointMongoSchema = new Schema<IEntryPoint>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    campus: {
      type: String,
      default: 'UNIMINUTO Sede Ibagué',
    },
    gateType: {
      type: String,
      enum: ['pedestrian'],
      default: 'pedestrian',
    },
    cameraUrl: String,
    barrierControllerIp: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'entry_points',
  }
);

// Singletons para modelos Mongoose
export const UserModel: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserMongoSchema);

export const AccessLogModel: Model<IAccessLog> =
  (mongoose.models.AccessLog as Model<IAccessLog>) ||
  mongoose.model<IAccessLog>('AccessLog', AccessLogMongoSchema);

export const SessionModel: Model<ISession> =
  (mongoose.models.Session as Model<ISession>) || mongoose.model<ISession>('Session', SessionMongoSchema);

export const EntryPointModel: Model<IEntryPoint> =
  (mongoose.models.EntryPoint as Model<IEntryPoint>) ||
  mongoose.model<IEntryPoint>('EntryPoint', EntryPointMongoSchema);
