export type UserRole = 'admin' | 'security' | 'student' | 'teacher' | 'staff' | 'visitor';

export type UserStatus = 'active' | 'suspended';

export type AccessDirection = 'entry' | 'exit'; // Entrada o Salida peatonal

export type AccessMethod = 'facial_recognition' | 'manual_contingency' | 'qr_code';

export type AccessStatus = 'authorized' | 'denied';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  documentId: string;
  facultyOrDept?: string;
  phone?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  status: UserStatus;
  faceEnrolled?: boolean;
  /** Fecha del último enrolamiento facial (se actualiza al POST exitoso). */
  lastEnrollmentAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AccessLog {
  id: string;
  direction: AccessDirection; // 'entry' (Entrada) | 'exit' (Salida)
  entryPoint: string; // e.g. "Torniquetes Entrada Cra 5", "Torniquetes Salida Cra 5"
  entryPointId?: string; // code del torniquete (entry_points.code)
  method: AccessMethod;
  status: AccessStatus;
  userId?: string;
  userName: string;
  userRole: UserRole | 'desconocido';
  documentId?: string;
  confidenceScore: number; // e.g. 0.98 (98%)
  notes?: string;
  snapshotUrl?: string;
  snapshotPublicId?: string; // public_id de Cloudinary de la captura
  timestamp: string;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
  expiresAt: string;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  todayEntries: number; // Total entradas registradas hoy
  todayExits: number; // Total salidas registradas hoy
  peopleInsideCampus: number; // Aforo actual estimado en campus
  todayAuthorized: number;
  todayDenied: number;
  facialAccuracy: number; // Porcentaje promedio de certeza IA
  hourlyEntries: { hour: string; count: number }[];
  hourlyExits: { hour: string; count: number }[];
  roleDistribution: { role: string; count: number }[];
  accessByEntryPoint: { entryPoint: string; count: number }[];
}

export interface RecognitionCandidate {
  id: string;
  name: string;
  role: UserRole;
  documentId: string;
  avatarUrl?: string;
  facultyOrDept?: string;
  status: UserStatus;
  faceEnrolled: boolean;
}
