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
 *
 * El plan gratuito de Atlas pausa el clúster tras 7 días sin uso y al primer
 * arranque tarda más de 5 s en aceptar conexiones. Con un solo intento la app
 * caía al store en memoria y parecía una base vacía, así que se reintenta.
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

  const attempts = [
    { timeoutMS: 12000, waitBefore: 0 },
    { timeoutMS: 20000, waitBefore: 3000 },
  ];
  let lastError = '';

  try {
    for (const [index, attempt] of attempts.entries()) {
      if (attempt.waitBefore) {
        await new Promise(resolve => setTimeout(resolve, attempt.waitBefore));
      }
      try {
        console.log(
          `[MongoDB] Conectando a Uniminuto (intento ${index + 1}/${attempts.length}, espera ${attempt.timeoutMS} ms)...`
        );
        await mongoose.connect(uri, {
          serverSelectionTimeoutMS: attempt.timeoutMS,
          dbName: 'uniminuto_acceso',
        });

        console.log(`[MongoDB] ¡Conexión exitosa a MongoDB! Base de datos: ${mongoose.connection.name}`);
        return true;
      } catch (err: any) {
        lastError = err?.message || String(err);
        console.warn(`[MongoDB] Intento ${index + 1} fallido: ${lastError}`);
      }
    }

    console.warn('[MongoDB] Conexión no disponible. La app queda en MODO MEMORIA:');
    console.warn('[MongoDB] los datos de esta sesión NO se guardan y se pierden al reiniciar.');
    console.warn('[MongoDB] Revisa la red, la lista de acceso IP en Atlas o usa "Reintentar conexión" en el panel.');
    void lastError;
    return false;
  } finally {
    isConnecting = false;
  }
}
