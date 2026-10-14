import mongoose from 'mongoose';

export interface MongoStatus {
  isConnected: boolean;
  readyState: number; // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  stateDescription: string;
  host?: string;
  databaseName?: string;
  configuredUri?: string;
  error?: string;
}

let isConnecting = false;

const STATE_NAMES: Record<number, string> = {
  0: 'Desconectado',
  1: 'Conectado (Listo)',
  2: 'Conectando...',
  3: 'Desconectando...',
};

/**
 * Obtiene el estado actual de la conexión MongoDB
 */
export function getMongoConnectionStatus(): MongoStatus {
  const readyState = mongoose.connection.readyState;
  const mongoUri = process.env.MONGODB_URI || '';
  
  // Ocultar credenciales si hay URI
  const maskedUri = mongoUri
    ? mongoUri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)@/, '$1*****@')
    : undefined;

  return {
    isConnected: readyState === 1,
    readyState,
    stateDescription: STATE_NAMES[readyState] || 'Desconocido',
    host: mongoose.connection.host || undefined,
    databaseName: mongoose.connection.name || 'uniminuto_acceso',
    configuredUri: maskedUri,
  };
}

/**
 * Conecta a MongoDB utilizando la variable de entorno MONGODB_URI
 */
export async function connectToMongoDB(customUri?: string): Promise<boolean> {
  const uri = customUri || process.env.MONGODB_URI;

  if (!uri) {
    // Si no está configurada, no fallar ruidosamente: la app funciona con el store integrado
    return false;
  }

  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (isConnecting) {
    return false;
  }

  isConnecting = true;

  try {
    console.log('[MongoDB] Intentando conectar a la base de datos Uniminuto...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      dbName: 'uniminuto_acceso',
    });

    console.log(`[MongoDB] ¡Conexión exitosa a MongoDB! Base de datos: ${mongoose.connection.name}`);
    return true;
  } catch (err: any) {
    console.warn('[MongoDB] Aviso de conexión:', err?.message || err);
    return false;
  } finally {
    isConnecting = false;
  }
}
