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

// ============================================================================
// POLÍTICA DE CONTRASEÑAS
// Basada en NIST SP 800-63B: exigimos longitud + variedad (3 de 4 categorías)
// + bloqueo de contraseñas comunes. Es más usable que exigir "todo obligatorio"
// porque evita que la gente escriba "Password1!" y ya.
// ============================================================================

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;

/** Categorías de caracteres (los 4 grupos que se cuentan para la regla 3-de-4) */
export type PasswordChecks = {
  minLength: boolean;
  maxLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  notCommon: boolean;
  notRepeated: boolean;
};

/** Lista negra mínima de contraseñas comunes. Se compara en minúsculas. */
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwerty', 'qwerty123', 'admin', 'admin123', 'admin1234', 'root',
  'letmein', 'welcome', 'welcome1', 'uniminuto', 'uniminuto1', 'uniminuto2026',
  'contraseña', 'contrasena', 'contraseña123', 'colombia', 'colombia2026',
  'ibague', 'ibague2026', 'uniminutoibague', 'estudiante', 'docente',
  'abc123', 'abc12345', 'abcd1234', 'abcdefgh', 'asdfghjkl',
]);

/**
 * Analiza la contraseña y devuelve el desglose de qué cumple y qué no.
 * Útil para feedback en vivo en el frontend.
 */
export function checkPassword(plain: string): PasswordChecks {
  const p = plain ?? '';
  const lower = p.toLowerCase().trim();

  // "noRepeated": evita cosas como "aaaaaaaaaa" o "1111111111"
  const isAllSameChar = p.length > 0 && /^(.)\1+$/.test(p);

  return {
    minLength: p.length >= MIN_PASSWORD_LENGTH,
    maxLength: p.length <= MAX_PASSWORD_LENGTH,
    hasUpper: /[A-Z]/.test(p),
    hasLower: /[a-z]/.test(p),
    hasNumber: /[0-9]/.test(p),
    hasSymbol: /[^A-Za-z0-9]/.test(p),
    notCommon: !COMMON_PASSWORDS.has(lower),
    notRepeated: !isAllSameChar,
  };
}

/**
 * Cuenta cuántas categorías distintas de caracteres tiene la contraseña.
 * Las 4 categorías son: mayúscula, minúscula, número, símbolo.
 */
function countCharacterCategories(checks: PasswordChecks): number {
  return [checks.hasUpper, checks.hasLower, checks.hasNumber, checks.hasSymbol]
    .filter(Boolean).length;
}

/**
 * Valida la contraseña contra la política completa.
 * Devuelve `null` si es válida, o un mensaje descriptivo del primer fallo.
 *
 * Política aplicada:
 *  - Entre 10 y 128 caracteres
 *  - Al menos 3 de estas 4 categorías: mayúscula, minúscula, número, símbolo
 *  - No está en la lista de contraseñas comunes
 *  - No es un solo carácter repetido (ej: "aaaaaaaaaa")
 */
export function validatePasswordStrength(plain: string): string | null {
  if (!plain || typeof plain !== 'string') {
    return 'La contraseña es obligatoria';
  }

  const checks = checkPassword(plain);

  if (!checks.minLength) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  if (!checks.maxLength) {
    return `La contraseña no puede tener más de ${MAX_PASSWORD_LENGTH} caracteres`;
  }
  if (!checks.notRepeated) {
    return 'La contraseña no puede ser un solo carácter repetido';
  }
  if (!checks.notCommon) {
    return 'Esa contraseña es demasiado común. Elige una más segura.';
  }

  const categories = countCharacterCategories(checks);
  if (categories < 3) {
    return 'La contraseña debe combinar al menos 3 de: mayúsculas, minúsculas, números y símbolos';
  }

  return null;
}

// ============================================================================
// HASHING Y VERIFICACIÓN (scrypt)
// ============================================================================

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