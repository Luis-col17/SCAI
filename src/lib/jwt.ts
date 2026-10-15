import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import type { UserRole } from '../types.ts';

export type SessionClaims = {
  userId: string;
  role: UserRole;
  name: string;
  documentId: string;
  jti: string;
  issuedAt: Date;
  expiresAt: Date;
};

// ⏱ TTL bajado de 24h a 8h: reduce ventana de ataque si roban el token.
// Si el usuario necesita más, el frontend puede renovar pidiendo login de nuevo.
const SESSION_TTL_SECONDS = 8 * 60 * 60;

const ISSUER = 'uniminuto-acceso';
const AUDIENCE = 'uniminuto-app';
const ALGORITHM = 'HS256' as const;

// 🔒 HS256 requiere mínimo 256 bits = 32 bytes. Menos que esto es crackeable.
const MIN_SECRET_LENGTH = 32;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error('Falta configurar SESSION_SECRET en el archivo .env');
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET demasiado corto (${secret.length} chars). ` +
      `Requiere al menos ${MIN_SECRET_LENGTH} caracteres. ` +
      `Genera uno con: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
    );
  }
  return secret;
}

export function signSessionToken(user: {
  id: string;
  role: UserRole;
  name: string;
  documentId: string;
}): { token: string; expiresAt: Date; jti: string } {
  const iatSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((iatSeconds + SESSION_TTL_SECONDS) * 1000);
  const jti = crypto.randomUUID();

  const token = jwt.sign(
    {
      role: user.role,
      // 🔒 SEGURIDAD: no incluimos name ni documentId en el JWT.
      // El JWT está firmado pero NO encriptado: cualquiera con el token
      // puede leer el payload en jwt.io. La cédula es dato sensible
      // (Ley 1581) y no debe viajar en el token.
      // Estos datos se obtienen del endpoint /api/auth/me (que consulta la DB).
    },
    getSecret(),
    {
      algorithm: ALGORITHM,
      subject: user.id,
      expiresIn: SESSION_TTL_SECONDS,
      issuer: ISSUER,
      audience: AUDIENCE,
      jwtid: jti,
    }
  );

  return { token, expiresAt, jti };
}

export function verifySessionToken(token: string): SessionClaims | null {
  let payload: jwt.JwtPayload | string;
  try {
    payload = jwt.verify(token, getSecret(), {
      algorithms: [ALGORITHM], // solo HS256, rechaza alg=none y confusion
      issuer: ISSUER,
      audience: AUDIENCE,
      clockTolerance: 5, // tolera 5s de desfase de reloj entre servidores
    });
  } catch {
    return null;
  }

  if (typeof payload !== 'object' || !payload.sub) {
    return null;
  }

  return {
    userId: payload.sub,
    role: payload.role as UserRole,
    name: String(payload.name ?? ''),
    documentId: String(payload.documentId ?? ''),
    jti: String(payload.jti ?? ''),
    issuedAt: new Date((payload.iat ?? 0) * 1000),
    expiresAt: new Date((payload.exp ?? 0) * 1000),
  };
}

export function sessionTtlSeconds(): number {
  return SESSION_TTL_SECONDS;
}