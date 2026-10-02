/**
 * Costura hacia el servicio de visión artificial (Python) que producirá los
 * vectores faciales. Hoy el servicio NO existe: este módulo no inventa vectores
 * falsos, solo deja el punto de conexión preparado.
 *
 * Cuando exista el servicio en Python:
 *   1. se implementa POST {FACE_SERVICE_URL}/embed  ->  { vectors: number[][] }
 *   2. se define FACE_SERVICE_URL en .env
 *   3. el resto del sistema (enrolamiento, comparación, umbral) ya funciona
 *      sin cambios.
 *
 * El reconocimiento del torniquete sigue siendo una simulación del lado del
 * cliente hasta que este servicio responda.
 */

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL?.trim();
const FACE_SERVICE_TIMEOUT_MS = Number(process.env.FACE_SERVICE_TIMEOUT_MS) || 8000;

export type FaceServiceStatus = {
  configured: boolean;
  url: string | null;
  reason: string | null;
};

export function getFaceServiceStatus(): FaceServiceStatus {
  if (!FACE_SERVICE_URL) {
    return {
      configured: false,
      url: null,
      reason: 'FACE_SERVICE_URL no esta definido en .env',
    };
  }
  return { configured: true, url: FACE_SERVICE_URL, reason: null };
}

/** Valida que cada vector sea una lista de numeros finitos. */
function isValidVector(v: unknown): v is number[] {
  return Array.isArray(v) && v.length > 0 && v.every((n) => typeof n === 'number' && Number.isFinite(n));
}

/**
 * Pide al servicio de IA un vector por cada imagen (data URL o URL).
 * Se espera una respuesta { vectors: number[][] } con la misma longitud que
 * `images`. Devuelve null si el servicio no esta configurado o no responde:
 * el enrolamiento guarda entonces las fotos y queda como "pendiente de vectores".
 */
export async function requestFaceEmbeddings(images: string[]): Promise<number[][] | null> {
  if (!FACE_SERVICE_URL || images.length === 0) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FACE_SERVICE_TIMEOUT_MS);
  try {
    const response = await fetch(`${FACE_SERVICE_URL.replace(/\/$/, '')}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images }),
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const data: any = await response.json();
    const vectors = data?.vectors;
    if (!Array.isArray(vectors) || vectors.length !== images.length) return null;
    if (!vectors.every(isValidVector)) return null;
    return vectors;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Distancia coseno entre dos vectores (0 = identicos, 1 = opuestos). */
export function cosineDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return 1;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 1;
  return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
}
