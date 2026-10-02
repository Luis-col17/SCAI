import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, RefreshCw, Upload, X, Image as ImageIcon } from 'lucide-react';
import type { UserProfile } from '../types.ts';
import { getStoredToken, AVATAR_FALLBACK } from '../lib/api.ts';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
  userId: string;
  userName: string;
  currentAvatarUrl?: string;
  onUserUpdated?: (user: UserProfile) => void;
  onRefresh: () => void;
}

export const AvatarModal: React.FC<AvatarModalProps> = ({
  isOpen,
  onClose,
  darkMode = false,
  userId,
  userName,
  currentAvatarUrl,
  onUserUpdated,
  onRefresh,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stagedPreview, setStagedPreview] = useState<string | null>(null);
  const [pendingDataUrl, setPendingDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<'reading' | 'uploading' | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStagedPreview(null);
      setPendingDataUrl(null);
      setBusy(null);
      setProgress(0);
      setError(null);
      setNotice(null);
      setDragOver(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, busy, onClose]);

  if (!isOpen) return null;

  const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada'));
      reader.readAsDataURL(file);
    });

  const pickFile = (file: File | undefined) => {
    if (!file || busy) return;
    setError(null);
    setNotice(null);

    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen (JPG, PNG o WEBP).');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('La imagen supera el máximo de 5 MB.');
      return;
    }

    const run = async () => {
      setBusy('reading');
      setProgress(0);
      try {
        const dataUrl = await readAsDataUrl(file);
        setPendingDataUrl(dataUrl);
        setStagedPreview(dataUrl);
        setProgress(100);
      } catch (err: any) {
        setError(err.message || 'Error al leer el archivo');
      } finally {
        setBusy(null);
      }
    };
    void run();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    pickFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const handleUpload = () => {
    if (!pendingDataUrl || busy) return;
    setError(null);
    setNotice(null);
    setBusy('uploading');
    setProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/users/${userId}/avatar`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    const token = getStoredToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      let payload: { user?: UserProfile; error?: string } | null = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload?.user) {
        onUserUpdated?.(payload.user);
        onRefresh();
        setNotice('Foto de perfil actualizada correctamente.');
        setBusy(null);
        window.setTimeout(() => onClose(), 900);
      } else {
        setError(payload?.error || 'No se pudo guardar la foto de perfil.');
        setBusy(null);
        setProgress(0);
      }
    };
    xhr.onerror = () => {
      setError('Error de red al subir la foto. Intenta de nuevo.');
      setBusy(null);
      setProgress(0);
    };
    xhr.send(JSON.stringify({ dataUrl: pendingDataUrl }));
  };

  const preview = stagedPreview || currentAvatarUrl || AVATAR_FALLBACK;
  const newPhoto = Boolean(stagedPreview);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className={`border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl transition-colors ${
        darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-4 ${
          darkMode ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${
              darkMode ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">Foto de perfil</h3>
              <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Actualiza la foto de {userName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy !== null}
            aria-label="Cerrar"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors font-bold text-sm disabled:opacity-40 ${
              darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <img
              src={preview}
              alt="Vista previa del perfil"
              className={`w-24 h-28 object-cover rounded-2xl border-2 shadow-sm ${
                darkMode ? 'border-slate-700' : 'border-slate-200'
              }`}
            />
            {newPhoto && (
              <span className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border whitespace-nowrap ${
                darkMode ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                Nueva foto
              </span>
            )}
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); if (!busy) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !busy && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-amber-500 bg-amber-500/10'
              : darkMode
                ? 'border-slate-700 hover:border-slate-600 bg-slate-950'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50'
          } ${busy ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleInputChange}
          />
          <Upload className={`w-6 h-6 mx-auto mb-1 ${darkMode ? 'text-amber-400' : 'text-blue-900'}`} />
          <p className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            Haz clic o arrastra una imagen
          </p>
          <p className={`text-[10px] font-medium ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            JPG, PNG o WEBP · máx. 5 MB
          </p>
        </div>

        {/* Progress */}
        {busy === 'reading' && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
            Preparando archivo…
          </div>
        )}
        {busy === 'uploading' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-black">
              <span className={`${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Subiendo foto…</span>
              <span className="text-amber-500 font-mono">{progress}%</span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-150 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Messages */}
        {notice && (
          <p className={`flex items-center gap-1.5 text-xs font-semibold ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
            <Check className="w-3.5 h-3.5 shrink-0" />
            {notice}
          </p>
        )}
        {error && (
          <p className={`text-xs font-semibold ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>
            {error}
          </p>
        )}

        {/* Footer */}
        <div className={`flex items-center justify-end gap-2 pt-1 border-t ${
          darkMode ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy !== null}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide border transition-colors disabled:opacity-40 ${
              darkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!newPhoto || busy !== null}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              darkMode
                ? 'bg-amber-950 text-amber-300 border-amber-800 hover:bg-amber-900'
                : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
            }`}
          >
            {busy === 'uploading' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5" />
            )}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};