import mongoose, { Schema, Model } from 'mongoose';
import type { UserRole, UserStatus, AccessDirection, AccessMethod, AccessStatus } from '../../types.ts';

// -------------------------------------------------------------
// 1. USUARIOS (users collection)
// -------------------------------------------------------------
export interface IUser {
  businessId?: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  documentId: string;
  facultyOrDept?: string;
  phone?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  faceEnrolled?: boolean;
  faceEmbeddings?: number[][];
  enrollmentPhotos?: {
    photoUrl: string;
    photoPublicId: string;
  }[];
  status: UserStatus;
  lastEnrollmentAt?: Date;
  sessionInvalidBefore?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export const UserMongoSchema = new Schema<IUser>(
  {
    businessId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
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
    avatarPublicId: {
      type: String,
    },
    faceEnrolled: {
      type: Boolean,
      default: false,
    },
    faceEmbeddings: {
      type: [[Number]], // una fila por captura/enrolamiento → motor ML multi-template (futuro)
      default: undefined,
    },
    enrollmentPhotos: {
      type: [
        new Schema(
          {
            photoUrl: { type: String }, // secure_url de Cloudinary
            photoPublicId: { type: String }, // public_id de Cloudinary (retención/borrado)
          },
          { _id: false }
        ),
      ],
      default: undefined,
    },
        status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
      index: true,
    },
    lastEnrollmentAt: {
      type: Date,
      default: null,
    },
    sessionInvalidBefore: {
      type: Date,
      default: null,
      index: true,
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
  businessId?: string; // id de negocio ('log-*', usado por el frontend)
  direction: AccessDirection; // 'entry' | 'exit'
  entryPoint: string;
  entryPointId?: string; // ref. al code del torniquete (entry_points.code), robusto a renombres
  method: AccessMethod;
  status: AccessStatus;
  userId?: string | null; // businessId del usuario ('usr-*')
  userName: string;
  userRole: UserRole | 'desconocido';
  documentId?: string;
  confidenceScore: number;
  notes?: string;
  snapshotUrl?: string;
  snapshotPublicId?: string; // public_id de Cloudinary (captura del escaneo)
  alertTriggered: boolean;
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export const AccessLogMongoSchema = new Schema<IAccessLog>(
  {
    businessId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
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
    entryPointId: {
      type: String,
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
      type: String,
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
    snapshotPublicId: {
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
// 3. TORNIQUETES Y PUNTOS PEATONALES (entry_points collection)
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

// -------------------------------------------------------------
// 5. TOKENS REVOCADOS (revoked_tokens collection con TTL automático)
// -------------------------------------------------------------
export interface IRevokedToken {
  jti: string; // identificador único del JWT (claim 'jti')
  userId: string; // businessId del usuario ('usr-*')
  expiresAt: Date; // expiración natural del token: Mongo lo borra solo
  revokedAt: Date;
}

export const RevokedTokenMongoSchema = new Schema<IRevokedToken>(
  {
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0, // TTL: el registro desaparece cuando el token habría expirado
    },
    revokedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'revoked_tokens',
  }
);

// Singletons para modelos Mongoose
export const UserModel: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserMongoSchema);

export const AccessLogModel: Model<IAccessLog> =
  (mongoose.models.AccessLog as Model<IAccessLog>) ||
  mongoose.model<IAccessLog>('AccessLog', AccessLogMongoSchema);

export const EntryPointModel: Model<IEntryPoint> =
  (mongoose.models.EntryPoint as Model<IEntryPoint>) ||
  mongoose.model<IEntryPoint>('EntryPoint', EntryPointMongoSchema);

export const RevokedTokenModel: Model<IRevokedToken> =
  (mongoose.models.RevokedToken as Model<IRevokedToken>) ||
  mongoose.model<IRevokedToken>('RevokedToken', RevokedTokenMongoSchema);
