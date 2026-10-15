import React, { useState } from 'react';
import { Lock, KeyRound, Eye, EyeOff, ShieldAlert, X, CheckCircle2 } from 'lucide-react';
import { authFetch } from '../lib/api';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordChanged: () => void;
  darkMode: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onPasswordChanged,
  darkMode,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Validación de fuerza básica
  const isMinLength = newPassword.length >= 6;
  const isMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isValid = currentPassword.length > 0 && isMinLength && isMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError(null);

    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        onPasswordChanged();
      } else {
        const data = await res.json();
        setError(data.message || 'Error al cambiar la contraseña.');
      }
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 ${
          darkMode
            ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-black/80'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-xl'
        }`}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-xl transition-colors ${
            darkMode
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header con ícono enmarcado */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border shadow-inner ${
              darkMode
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-amber-50 border-amber-200 text-amber-600'
            }`}>
              <KeyRound className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black tracking-tight">Cambiar Contraseña</h2>
            <p className={`text-xs mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Por seguridad, deberás iniciar sesión de nuevo tras el cambio.
            </p>
          </div>

          {/* Banner de aviso de cierre de sesión global */}
          <div className={`mb-6 p-3.5 rounded-2xl border text-xs flex items-start gap-3 ${
            darkMode
              ? 'bg-blue-950/40 border-blue-800/60 text-blue-300'
              : 'bg-blue-50/80 border-blue-200 text-blue-900'
          }`}>
            <ShieldAlert className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-bold block mb-0.5">Cierre de sesión global</strong>
              Al cambiar tu contraseña, se cerrarán <strong>todas</strong> tus sesiones activas en otros dispositivos.
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contraseña Actual */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Contraseña actual <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Tu contraseña actual"
                  required
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-medium border transition-all focus:outline-none focus:ring-2 ${
                    darkMode
                      ? 'bg-slate-950/60 border-slate-800 text-white focus:ring-blue-500/50 focus:border-blue-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/30 focus:border-blue-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Nueva Contraseña */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Nueva contraseña <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-medium border transition-all focus:outline-none focus:ring-2 ${
                    darkMode
                      ? 'bg-slate-950/60 border-slate-800 text-white focus:ring-blue-500/50 focus:border-blue-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/30 focus:border-blue-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar Nueva Contraseña */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Confirmar nueva contraseña <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  required
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-medium border transition-all focus:outline-none focus:ring-2 ${
                    darkMode
                      ? 'bg-slate-950/60 border-slate-800 text-white focus:ring-blue-500/50 focus:border-blue-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/30 focus:border-blue-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p className={`text-[11px] mt-1.5 flex items-center gap-1 font-semibold ${
                  isMatch ? 'text-emerald-500' : 'text-rose-500'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isMatch ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                </p>
              )}
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/20">
              <button
                type="button"
                onClick={onClose}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  darkMode
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={!isValid || loading}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95 ${
                  isValid && !loading
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 cursor-pointer'
                    : 'bg-slate-300 text-slate-500 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed shadow-none'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>{loading ? 'Actualizando...' : 'Cambiar contraseña'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};