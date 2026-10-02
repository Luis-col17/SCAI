import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: crypto.ScryptOptions
) => Promise<Buffer>;

// scrypt con N=2^16, r=8, p=1 -> ~64 MB por hash. Es el minimo recomendado por
// OWASP para scrypt y hace la fuerza bruta ~(billones de veces) mas cara que SHA-256.
const PARAMS = { N: 2 ** 16, r: 8, p: 1 };
const KEYLEN = 64;
const MAXMEM = 160 * 1024 * 1024;

export const MIN_PASSWORD_LENGTH = 8;

export function validatePasswordStrength(plain: string): string | null {
  if (!plain || plain.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  return null;
}

/** Genera un hash con sal aleatoria: scrypt$N$r$p$sal(base64)$hash(base64) */
export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(plain.normalize('NFKC'), salt, KEYLEN, { ...PARAMS, maxmem: MAXMEM });
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

function legacySha256(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

/**
 * Verifica una contraseña contra el hash guardado.
 * Si el hash es el SHA-256 antiguo sin sal, la acepta y avisa con
 * `needsRehash` para poder migrarla silenciosamente al iniciar sesión.
 */
export async function verifyPassword(
  plain: string,
  stored: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!stored) return { valid: false, needsRehash: false };
  const candidate = plain.normalize('NFKC');

  if (stored.startsWith('scrypt$')) {
    const [, n, r, p, saltB64, hashB64] = stored.split('$');
    try {
      const salt = Buffer.from(saltB64, 'base64');
      const expected = Buffer.from(hashB64, 'base64');
      const derived = await scryptAsync(candidate, salt, expected.length, {
        N: Number(n),
        r: Number(r),
        p: Number(p),
        maxmem: MAXMEM,
      });
      const valid = derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
      return { valid, needsRehash: false };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  // Formato heredado: SHA-256 sin sal, 64 hex.
  const expected = Buffer.from(legacySha256(candidate), 'hex');
  const storedBuf = /^[0-9a-f]{64}$/i.test(stored) ? Buffer.from(stored, 'hex') : null;
  const valid = storedBuf !== null && storedBuf.length === expected.length && crypto.timingSafeEqual(storedBuf, expected);
  return { valid, needsRehash: valid };
}

/** Alias actualizado del hash SHA-256 que existia antes de la migracion. */
export function isLegacyHash(stored: string): boolean {
  return /^[0-9a-f]{64}$/i.test(stored || '');
}
