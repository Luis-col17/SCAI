/**
 * Límite de intentos de inicio de sesión (anti fuerza bruta).
 *
 * Almacenamiento en memoria: el contador se reinicia al reiniciar el proceso.
 * Es suficiente mientras el servidor corra como una sola instancia; si se
 * escala horizontalmente hay que mover estos contadores a Redis o Mongo.
 *
 * Dos niveles de bloqueo (ventana fija de 15 min):
 *  - Por cuenta + IP:  MAX_ACCOUNT_FAILURES fallos -> bloqueo.
 *  - Por IP (global):  MAX_IP_FAILURES fallos     -> bloqueo (evita distribuir).
 *
 * Un login correcto reinicia el contador de la cuenta e "alivia" el contador
 * global de la IP, para no castigar a quienes comparten NAT en el campus.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ACCOUNT_FAILURES = 5;
const MAX_IP_FAILURES = 20;
export const LOGIN_FAILURE_EXTRA_DELAY_MS = 400;

interface Bucket {
  count: number;
  windowStart: number;
  lockUntil: number;
}

const buckets = new Map<string, Bucket>();

function bucketKey(parts: string[]): string {
  return parts.join('|');
}

function getBucket(name: string, now: number): Bucket {
  let item = buckets.get(name);
  if (!item) {
    item = { count: 0, windowStart: now, lockUntil: 0 };
    buckets.set(name, item);
    return item;
  }
  if (now - item.windowStart >= WINDOW_MS) {
    item.count = 0;
    item.windowStart = now;
    item.lockUntil = 0;
  }
  return item;
}

function accountName(email: string, ip: string): string {
  return bucketKey(['acct', ip, email.toLowerCase().trim()]);
}

function ipName(ip: string): string {
  return bucketKey(['ip', ip]);
}

export interface LoginAttemptCheck {
  allowed: boolean;
  retryAfterSeconds?: number;
  remaining: number;
}

/** Comprueba si un intento de login debe dejarse pasar. */
export function checkLoginAttempt(email: string, ip: string): LoginAttemptCheck {
  const now = Date.now();
  const account = getBucket(accountName(email, ip), now);
  const ipBucket = getBucket(ipName(ip), now);

  for (const item of [account, ipBucket]) {
    if (item.lockUntil > now) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((item.lockUntil - now) / 1000)),
        remaining: 0,
      };
    }
  }

  return {
    allowed: true,
    remaining: Math.max(
      0,
      Math.min(MAX_ACCOUNT_FAILURES - account.count, MAX_IP_FAILURES - ipBucket.count)
    ),
  };
}

/** Registra un fallo (contraseña o correo inválidos). */
export function recordLoginFailure(email: string, ip: string) {
  const now = Date.now();
  const account = getBucket(accountName(email, ip), now);
  const ipBucket = getBucket(ipName(ip), now);

  account.count += 1;
  ipBucket.count += 1;

  if (account.count >= MAX_ACCOUNT_FAILURES) account.lockUntil = now + WINDOW_MS;
  if (ipBucket.count >= MAX_IP_FAILURES) ipBucket.lockUntil = now + WINDOW_MS;
}

/** Registra un login correcto: limpia la cuenta y alivia la presión de la IP. */
export function recordLoginSuccess(email: string, ip: string) {
  const now = Date.now();
  const account = getBucket(accountName(email, ip), now);
  account.count = 0;
  account.lockUntil = 0;

  const ipBucket = getBucket(ipName(ip), now);
  ipBucket.count = Math.max(0, ipBucket.count - 2);
}