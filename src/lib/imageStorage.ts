import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export type ImageProvider = 'cloudinary' | 'local';

export type StoredImage = {
  url: string;
  publicId: string;
  provider: ImageProvider;
};

const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const LOCAL_ROOT = path.resolve(process.cwd(), 'uploads');

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export function parseDataUrl(dataUrl: unknown): { buffer: Buffer; mime: string; ext: string } {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw new Error('Formato de imagen inválido: se esperaba un data URL base64');
  }

  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) {
    throw new Error('Formato de imagen inválido: se esperaba un data URL base64');
  }

  const mime = match[1].toLowerCase();
  const ext = ALLOWED_TYPES[mime];
  if (!ext) {
    throw new Error('Formato no permitido. Usa una imagen JPG, PNG o WEBP');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) {
    throw new Error('La imagen enviada está vacía');
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error('La imagen supera el máximo de 5 MB');
  }

  return { buffer, mime, ext };
}

function signParams(params: Record<string, string>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

async function uploadToCloudinary(
  buffer: Buffer,
  mime: string,
  folder: string,
  publicId: string
): Promise<StoredImage> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME as string;
  const apiKey = process.env.CLOUDINARY_API_KEY as string;
  const apiSecret = process.env.CLOUDINARY_API_SECRET as string;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params: Record<string, string> = {
    folder,
    overwrite: 'true',
    public_id: publicId,
    timestamp,
  };

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buffer)], { type: mime }), `${publicId}`);
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('signature', signParams(params, apiSecret));
  for (const [key, value] of Object.entries(params)) {
    if (key !== 'timestamp') form.append(key, value);
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });

  const payload: any = await response.json().catch(() => null);
  if (!response.ok || !payload?.secure_url) {
    const detail = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(`No se pudo subir la imagen a Cloudinary: ${detail}`);
  }

  return {
    url: payload.secure_url as string,
    publicId: (payload.public_id as string) || publicId,
    provider: 'cloudinary',
  };
}

async function uploadToDisk(
  buffer: Buffer,
  ext: string,
  folder: string,
  publicId: string
): Promise<StoredImage> {
  const targetDir = path.join(LOCAL_ROOT, folder);
  await fs.mkdir(targetDir, { recursive: true });

  const fileName = `${publicId}.${ext}`;
  await fs.writeFile(path.join(targetDir, fileName), buffer);

  return {
    url: `/uploads/${folder}/${fileName}`,
    publicId: `local/${folder}/${fileName}`,
    provider: 'local',
  };
}

export async function storeImage(options: {
  dataUrl: unknown;
  folder: string;
  publicId: string;
}): Promise<StoredImage> {
  const { buffer, mime, ext } = parseDataUrl(options.dataUrl);
  const publicId = options.publicId.replace(/[^a-zA-Z0-9_-]/g, '_');

  if (isCloudinaryConfigured()) {
    return uploadToCloudinary(buffer, mime, options.folder, publicId);
  }
  return uploadToDisk(buffer, ext, options.folder, publicId);
}

export type RemoveResult = { ok: boolean; reason?: string; publicId: string };

/**
 * Borra una imagen del almacenamiento configurado.
 *
 * No lanza excepción: el llamador siempre debe limpiar su referencia en la base
 * aunque el archivo externo no se borre. Por eso devuelve el resultado y avisa
 * por consola qué quedó huérfano, en vez de fallar en silencio.
 */
export async function removeImage(publicId?: string): Promise<RemoveResult> {
  if (!publicId) return { ok: true, publicId: '' };

  if (publicId.startsWith('local/')) {
    const relative = publicId.slice('local/'.length);
    const target = path.resolve(LOCAL_ROOT, relative);
    if (!target.startsWith(LOCAL_ROOT + path.sep)) {
      const reason = 'ruta fuera de uploads/';
      console.warn(`[Almacen] No se borró ${publicId}: ${reason}`);
      return { ok: false, reason, publicId };
    }
    try {
      await fs.unlink(target);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        console.warn(`[Almacen] No se borró ${publicId}: ${error?.message}`);
        return { ok: false, reason: error?.message, publicId };
      }
    }
    return { ok: true, publicId };
  }

  if (!isCloudinaryConfigured()) {
    const reason = 'Cloudinary no está configurado';
    console.warn(`[Almacen] No se borró ${publicId}: ${reason}`);
    return { ok: false, reason, publicId };
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME as string;
  const apiKey = process.env.CLOUDINARY_API_KEY as string;
  const apiSecret = process.env.CLOUDINARY_API_SECRET as string;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  // Cloudinary exige que TODO parámetro enviado esté incluido en la firma.
  // Antes se mandaba 'invalidate' sin firmarlo y el borrado fallaba siempre.
  const params: Record<string, string> = {
    public_id: publicId,
    timestamp,
    invalidate: 'true',
  };

  const form = new FormData();
  form.append('public_id', publicId);
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('invalidate', 'true');
  form.append('signature', signParams(params, apiSecret));

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      body: form,
    });
    const payload: any = await response.json().catch(() => null);
    // Un borrado correcto responde { result: 'ok' }. "not found" o un error
    // vienen con HTTP 200, así que hay que mirar el cuerpo, no solo el código.
    if (!response.ok || payload?.result !== 'ok') {
      const reason = payload?.error?.message || `HTTP ${response.status} ${JSON.stringify(payload ?? {})}`;
      console.warn(`[Cloudinary] No se borró ${publicId}: ${reason}`);
      return { ok: false, reason, publicId };
    }
    return { ok: true, publicId };
  } catch (error: any) {
    const reason = error?.message || 'error de red';
    console.warn(`[Cloudinary] No se borró ${publicId}: ${reason}`);
    return { ok: false, reason, publicId };
  }
}
