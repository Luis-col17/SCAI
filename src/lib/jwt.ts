import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import type { UserRole } from '../types.ts';

export type SessionClaims = {
  userId: string;
  role: UserRole;
  name: string;
  documentId: string;
  jti: string;
  expiresAt: Date;
};

const SESSION_TTL_SECONDS = 24 * 60 * 60;
const ISSUER = 'uniminuto-acceso';
const AUDIENCE = 'uniminuto-app';
const ALGORITHM = 'HS256' as const;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error('Falta configurar SESSION_SECRET en el archivo .env');
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
      name: user.name,
      documentId: user.documentId,
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
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: AUDIENCE,
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
    expiresAt: new Date((payload.exp ?? 0) * 1000),
  };
}

export function sessionTtlSeconds(): number {
  return SESSION_TTL_SECONDS;
}
