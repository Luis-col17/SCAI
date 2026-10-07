import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, Loader2, RefreshCw, Trash2, Upload, X, ScanFace, TriangleAlert, Info } from 'lucide-react';
import { authFetch } from '../lib/api.ts';

type EnrollmentStatus = 'none' | 'photos_pending' | 'enrolled';

type EnrollmentPhoto = { photoUrl: string; photoPublicId: string };

type Enrollment = {
  status: EnrollmentStatus;
  faceEnrolled: boolean;
  photosCount: number;
  templatesCount: number;
  photos: EnrollmentPhoto[];
};

type FaceService = { configured: boolean; url: string | null; reason: string | null };

interface FaceEnrollmentProps {
  userId: string;
  darkMode?: boolean;
  onRefresh?: () => void;
}

const MAX_PHOTOS = 5;
const MAX_DIMENSION = 720;
const JPEG_QUALITY = 0.82;
const MIN_ENROLLMENT_PHOTOS = 3;

const RECOMMENDATIONS = [
  { icon: '☀️', title: 'Buena iluminación', desc: 'Luz frontal suave, evita sombras duras o contraluz' },
  { icon: '🧱', title: 'Fondo neutro', desc: 'Pared lisa, sin objetos ni personas detrás' },
  { icon: '👓', title: 'Sin accesorios', desc: 'Quita gafas, gorras o elementos que cubran la cara' },
  { icon: '👁️', title: 'Mira a la cámara', desc: 'Mantén la mirada fija en el objetivo' },
  { icon: '📏', title: 'Distancia adecuada', desc: 'Mantente a 50-80 cm de la cámara' },
  { icon: '😐', title: 'Expresión neutra', desc: 'Relaja la cara, no sonrías ni frunzas el ceño' },
] as const;

const ENROLLMENT_POSES = [
  { id: 'front', label: 'Frontal', instruction: 'Mira de frente a la cámara', passed: false, icon: '👁️' },
  { id: 'right', label: 'Perfil derecho', instruction: 'Gira ligeramente la cabeza a la derecha', passed: false, icon: '➡️' },
  { id: 'left', label: 'Perfil izquierdo', instruction: 'Gira ligeramente la cabeza a la izquierda', passed: false, icon: '⬅️' },
  { id: 'up', label: 'Mentón arriba', instruction: 'Levanta ligeramente el mentón', passed: false, icon: '⬆️' },
  { id: 'down', label: 'Mentón abajo', instruction: 'Baja ligeramente el mentón', passed: false, icon: '⬇️' },
] as const;

const STATUS_COPY: Record<EnrollmentStatus, { label: string; detail: string; tone: 'warn' | 'pending' | 'ok' }> = {
  none: {
    label: 'Sin enrolar',
    detail: 'Captura entre 3 y 5 fotos de tu rostro para registrarlo en los torniquetes.',
    tone: 'warn',
  },
  photos_pending: {
    label: 'Fotos guardadas, vectores pendientes',
    detail: 'Tus fotos están almacenadas, pero falta el motor de IA que genera los vectores.',
    tone: 'pending',
  },
  enrolled: {
    label: 'Rostro enrolado',
    detail: 'Tus vectores están listos y ya puede compararse con los del torniquete.',
    tone: 'ok',
  },
};

/** Redimensiona y comprime a JPEG para no enviar fotos de 5 MB por foto. */
async function toCompactDataUrl(source: Blob): Promise<string> {
  const bitmapUrl = URL.createObjectURL(source);
  try {
    const image = await loadImage(bitmapUrl);
    return drawScaled(image, image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen'));
    img.src = src;
  });
}

/**
 * Dibuja una fuente en un canvas de maximo MAX_DIMENSION y devuelve un JPEG.
 * `width`/`height` se pasan aparte a proposito: en un <video> las propiedades
 * `.width`/`.height` son los atributos HTML (0 si no se definieron), no el
 * tamaño real del video, que vive en `.videoWidth`/`.videoHeight`.
 */
function drawScaled(
  source: CanvasImageSource,
  width: number,
  height: number,
  mirror = true
): string {
  if (!width || !height) throw new Error('La imagen no tiene dimensiones');
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no permite procesar la imagen');
  if (mirror) {
    // La vista previa es en espejo, el recorte debe coincidir con lo que ve el usuario.
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

export const FaceEnrollment: React.FC<FaceEnrollmentProps> = ({ userId, darkMode = false, onRefresh }) => {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [faceService, setFaceService] = useState<FaceService | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shots, setShots] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [captureDelay, setCaptureDelay] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track which pose indices have been captured (for minimum 3 check)
  const capturedPoseIndices = useRef<Set<number>>(new Set());

  const card = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const chip = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200';

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/users/${userId}/face-enrollment`);
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'No se pudo consultar el enrolamiento');
        return;
      }
      setEnrollment(data.enrollment);
      setFaceService(data.faceService);
      setError(null);
    } catch {
      setError('No se pudo consultar el enrolamiento');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
    setShowRecommendations(false);
    setCurrentPoseIndex(0);
    setCapturing(false);
    setCaptureDelay(false);
    capturedPoseIndices.current.clear();
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Este navegador no permite usar la camara');
      return;
    }
    setShots([]);
    setCurrentPoseIndex(0);
    setCapturing(false);
    setCaptureDelay(false);
    capturedPoseIndices.current.clear();
    setShowRecommendations(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      setError(null);
    } catch {
      setCameraError('No se pudo abrir la camara. Revisa el permiso del navegador o sube una imagen.');
    }
  };

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [cameraOn]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    if (capturing || captureDelay) return; // Evitar doble captura

    setCapturing(true);
    // Capturar frame actual
    const photoDataUrl = drawScaled(video, video.videoWidth, video.videoHeight, true);
    const newShotIndex = shots.length;
    setShots(prev => {
      const newShots = [...prev, photoDataUrl];
      return newShots.slice(0, MAX_PHOTOS);
    });
    capturedPoseIndices.current.add(currentPoseIndex);

    // Esperar 1 segundo antes de avanzar a la siguiente pose
    setCaptureDelay(true);
    setTimeout(() => {
      const nextIndex = currentPoseIndex + 1;
      if (nextIndex < ENROLLMENT_POSES.length && newShotIndex < MAX_PHOTOS - 1) {
        setCurrentPoseIndex(nextIndex);
      }
      setCaptureDelay(false);
      setCapturing(false);
    }, 1000);
  };

  const addFromFile = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const accepted = Array.from(files)
      .filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
      .slice(0, MAX_PHOTOS);
    if (accepted.length === 0) {
      setError('Solo se aceptan imagenes JPG, PNG o WEBP');
      return;
    }
    const compacted = await Promise.all(accepted.map((file) => toCompactDataUrl(file)));
    setShots(prev => [...prev, ...compacted].slice(0, MAX_PHOTOS));
  };

  const submit = async () => {
    if (shots.length < MIN_ENROLLMENT_PHOTOS || !consent) {
      setError(`Se requieren mínimo ${MIN_ENROLLMENT_PHOTOS} fotos para enrolar el rostro. Captura las poses restantes.`);
      return;
    }
    // Aviso local: un canvas vacio produce 'data:,' y el servidor lo rechaza
    // con un 400 dificil de entender si no se dice que foto fue.
    const invalid = shots.findIndex(
      (shot) => typeof shot !== 'string' || !/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(shot)
    );
    if (invalid !== -1) {
      setError(`La foto ${invalid + 1} salio vacia o dana. Borrala y vuelve a capturarla.`);
      return;
    }
    stopCamera();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await authFetch(`/api/users/${userId}/face-enrollment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrls: shots, consent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'No se pudo guardar el enrolamiento');
        return;
      }
      setEnrollment(data.enrollment);
      setShots([]);
      setConsent(false);
      setNotice(data.pendingReason || 'Rostro enrolado correctamente.');
      if (data.orphanedPhotos?.length) {
        setNotice(`${data.pendingReason || 'Rostro enrolado.'} ${data.orphanedPhotos.length} foto(s) anterior(es) quedaron en el almacen externo.`);
      }
      await loadState();
      onRefresh?.();
    } catch {
      setError('No se pudo guardar el enrolamiento');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    stopCamera();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await authFetch(`/api/users/${userId}/face-enrollment`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'No se pudo eliminar el enrolamiento');
        return;
      }
      setEnrollment(data.enrollment);
      setNotice(
        data.orphanedPhotos?.length
          ? `Se eliminaron ${data.deletedPhotos} foto(s) del registro, pero ${data.orphanedPhotos.length} quedaron en el almacen externo: hay que borrarlas a mano.`
          : `Se eliminaron ${data.deletedPhotos} foto(s) y sus vectores.`
      );
    } catch {
      setError('No se pudo eliminar el enrolamiento');
    } finally {
      setBusy(false);
    }
  };

  const status = enrollment?.status ?? 'none';
  const copy = STATUS_COPY[status];
  const toneClass =
    copy.tone === 'ok'
      ? darkMode ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
      : copy.tone === 'pending'
        ? darkMode ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-900 border-amber-300'
        : darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-50 text-slate-700 border-slate-300';

  return (
    <div className={`rounded-2xl border p-3 space-y-3 ${card}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <ScanFace className="w-4 h-4" />
            Rostro del campus
          </h4>
          <p className={`text-[9px] leading-tight mt-0.5 ${muted}`}>{copy.detail}</p>
        </div>
        <span className={`shrink-0 text-[9px] font-black uppercase px-2 py-1 rounded-full border ${toneClass}`}>
          {loading ? '...' : copy.label}
        </span>
      </div>

      {enrollment && enrollment.photosCount > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {enrollment.photos.map((photo) => (
            <img
              key={photo.photoPublicId}
              src={photo.photoUrl}
              alt="Foto de enrolamiento"
              className="w-14 h-14 rounded-lg object-cover border border-slate-300 shrink-0"
            />
          ))}
        </div>
      )}

      {enrollment && enrollment.photosCount > 0 && (
        <p className={`text-[9px] font-mono ${muted}`}>
          {enrollment.photosCount} foto(s) · {enrollment.templatesCount} vector(es)
        </p>
      )}

      {faceService && !faceService.configured && (
        <div className={`flex items-start gap-1.5 text-[9px] leading-tight p-2 rounded-lg border ${darkMode ? 'bg-amber-950/40 text-amber-300 border-amber-900' : 'bg-amber-50 text-amber-900 border-amber-200'
          }`}>
          <Info className="w-3 h-3 shrink-0 mt-px" />
          <span>El motor de IA (Python) todavia no esta conectado: las fotos quedaran guardadas, pero el reconocimiento no se activara.</span>
        </div>
      )}

      {showRecommendations && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                <Info className="w-5 h-5 text-blue-500 mr-2" />
                Recomendaciones para mejor captura
              </h3>
              <button
                onClick={() => {
                  setShowRecommendations(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {RECOMMENDATIONS.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <span className="text-2xl shrink-0">{rec.icon}</span>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{rec.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{rec.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setShowRecommendations(false);
              }}
              className="w-full mt-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition-colors"
            >
              Continuar a la cámara →
            </button>
          </div>
        </div>
      )}

      {cameraOn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-4 space-y-3 animate-in zoom-in-95 duration-200">
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video ref={videoRef} playsInline muted className="w-full aspect-4/3 object-cover transform -scale-x-100" />
              {/* Overlay de pose actual */}
              {ENROLLMENT_POSES[currentPoseIndex] && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-40 h-52 rounded-[50%] border-2 border-dashed border-amber-400/80" />
                  <div className="absolute top-4 text-center text-white text-sm font-medium bg-black/70 px-3 py-1 rounded">
                    {ENROLLMENT_POSES[currentPoseIndex].icon ?? '👁️'} {ENROLLMENT_POSES[currentPoseIndex].label}
                  </div>
                  <div className="absolute bottom-4 text-center text-white text-xs bg-black/70 px-3 py-1 rounded">
                    {ENROLLMENT_POSES[currentPoseIndex].instruction}
                  </div>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-52 rounded-[50%] border-2 border-dashed border-amber-400/80" />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={capture}
                disabled={shots.length >= MAX_PHOTOS || capturing || captureDelay}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase border disabled:opacity-50 ${darkMode ? 'bg-amber-500 text-blue-950 border-amber-400' : 'bg-amber-400 text-blue-950 border-amber-500'
                  }`}
              >
                <Camera className="w-3.5 h-3.5" />
                {capturing ? 'Capturando...' : `Capturar (${shots.length + 1}/${MAX_PHOTOS})`}
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${chip}`}
              >
                Cerrar
              </button>
            </div>
            {/* Mostrar progreso de poses */}
            <div className="text-[8px] text-slate-500 dark:text-slate-400 mt-1 text-center">
              Pose {currentPoseIndex + 1} de {ENROLLMENT_POSES.length} · {shots.length}/{MAX_PHOTOS} fotos capturadas
              {captureDelay && ' · Capturada, preparando siguiente pose...'}
            </div>
          </div>
        </div>
      )}

      {!cameraOn && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={startCamera}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${darkMode ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Abrir camara
          </button>
        </div>
      )}

      {shots.length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {shots.map((shot, index) => (
              <div key={index} className="relative shrink-0">
                <img src={shot} alt={`Captura ${index + 1}`} className="w-14 h-14 rounded-lg object-cover border border-slate-300" />
              </div>
            ))}
          </div>

          <label className={`flex items-start gap-2 text-[9px] leading-tight p-2 rounded-lg border cursor-pointer ${chip}`}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-0.5 accent-amber-500"
            />
            <span>
              Autorizo el tratamiento de mis datos biometricos (fotos y vectores) para el control de acceso del campus, conforme a la Ley 1581 de 2012.
            </span>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={!consent || busy}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase border disabled:opacity-50 ${darkMode ? 'bg-amber-500 text-blue-950 border-amber-400' : 'bg-amber-400 text-blue-950 border-amber-500'
                }`}
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {status === 'none' ? 'Enrolar rostro' : 'Reemplazar fotos'}
            </button>
            <button
              type="button"
              onClick={() => { setShots([]); setConsent(false); }}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${chip}`}
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {enrollment && enrollment.photosCount > 0 && (
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase border disabled:opacity-50 ${darkMode ? 'bg-red-950/60 text-red-300 border-red-900 hover:bg-red-900/60' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
            }`}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Eliminar mi enrolamiento
        </button>
      )}

      {error && (
        <p className="flex items-start gap-1.5 text-[9px] leading-tight p-2 rounded-lg border bg-red-50 text-red-700 border-red-200">
          <TriangleAlert className="w-3 h-3 shrink-0 mt-px" />
          {error}
        </p>
      )}
      {cameraError && (
        <p className="flex items-start gap-1.5 text-[9px] leading-tight p-2 rounded-lg border bg-red-50 text-red-700 border-red-200">
          <TriangleAlert className="w-3 h-3 shrink-0 mt-px" />
          {cameraError}
        </p>
      )}
      {notice && (
        <p className="flex items-start gap-1.5 text-[9px] leading-tight p-2 rounded-lg border bg-emerald-50 text-emerald-800 border-emerald-200">
          <RefreshCw className="w-3 h-3 shrink-0 mt-px" />
          {notice}
        </p>
      )}
    </div>
  );
};
