const TOKEN_KEY = 'accessToken';

/**
 * IMAGEN DE RESPALDO del perfil (cuando no hay foto).
 * Archivo local: public/img/none_profile.jpg
 * Cambia esta URL y se actualizará en todo el sistema.
 */
export const AVATAR_FALLBACK = '/img/none_profile.jpg';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * fetch con la cabecera Authorization. Úsalo en toda llamada a /api
 * que no sea sign-in, sign-up ni una descarga con <a href>.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
