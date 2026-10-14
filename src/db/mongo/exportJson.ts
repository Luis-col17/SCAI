import {
  MONGO_SEED_USERS,
  MONGO_SEED_LOGS,
  MONGO_SEED_ENTRY_POINTS,
  generateMongoShellScript,
} from './seedData.ts';

export function getMongoCollectionsExport() {
  return {
    database: 'uniminuto_acceso',
    system: 'Control de Acceso Peatonal con Reconocimiento Facial - UNIMINUTO Sede Ibagué',
    exportedAt: new Date().toISOString(),
    collections: {
      users: MONGO_SEED_USERS.map((u) => ({
        ...u,
        _id: { $oid: u._id.toString() },
        createdAt: { $date: u.createdAt.toISOString() },
        updatedAt: { $date: u.updatedAt.toISOString() },
        biometricProfile: u.biometricProfile
          ? {
              ...u.biometricProfile,
              enrolledAt: { $date: u.biometricProfile.enrolledAt.toISOString() },
            }
          : undefined,
      })),
      entry_points: MONGO_SEED_ENTRY_POINTS.map((ep) => ({
        ...ep,
        _id: { $oid: ep._id.toString() },
      })),
      access_logs: MONGO_SEED_LOGS.map((l) => ({
        ...l,
        _id: { $oid: l._id.toString() },
        userId: l.userId ? { $oid: l.userId.toString() } : undefined,
        timestamp: { $date: l.timestamp.toISOString() },
      })),
    },
    mongoShellScript: generateMongoShellScript(),
  };
}
