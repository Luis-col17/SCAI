import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  Lock,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldAlert,
} from 'lucide-react';
import { authFetch } from '../lib/api.ts';
import { PasswordRequirements } from './PasswordRequirements.tsx';
import type { PasswordChecks } from './PasswordRequirements.tsx';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordChanged: () => void;
  darkMode?: boolean;
}

// Mismos checks que usa el registro (AuthModal) para mantener coherencia
const EMPTY_CHECKS: PasswordChecks = {
  minLength: false,
  maxLength: true,
  hasUpper: false,
  hasLower: false,
  hasNumber: false,
  hasSymbol: false,
  notCommon: true,
  notRepeated: true,
};

function computePasswordChecks(value: string): PasswordChecks {
  const p = value ?? '';
  const lower = p.toLowerCase().trim();
  const isAllSameChar = p.length > 0 && /^(.)\1+$/.test(p);

  const common = new Set([
    'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
    'qwerty', 'qwerty123', 'admin', 'admin123', 'admin1234', 'root',
    'letmein', 'welcome', 'welcome1', 'uniminuto', 'uniminuto1', 'uniminuto2026',
    'contraseña', 'contrasena', 'contraseña123', 'colombia', 'colombia2026',
    'ibague', 'ibague2026', 'uniminutoibague', 'estudiante', 'docente',
    'abc123', 'abc12345', 'abcd1234', 'abcdefgh', 'asdfghjkl',
  ]);

  return {
    minLength: p.length >= 10,
    maxLength: p.length <= 128,
    hasUpper: /[A-Z]/.test(p),
    hasLower: /[a-z]/.test(p),
    hasNumber: /[0-9]/.test(p),
    hasSymbol: /[^A-Za-z0-9]/.test(p),
    notCommon: !common.has(lower),
    notRepeated: !isAllSameChar,
  };
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onPasswordChanged,
  darkMode = false,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [passwordChecks, setPasswordChecks] = useState<PasswordChecks>(EMPTY_CHECKS);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Resetear al abrir
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setError(null);
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  // Recalcular checks al escribir la nueva contraseña
  useEffect(() => {
    setPasswordChecks(computePasswordChecks(newPassword));
  }, [newPassword]);

  // Escape para cerrar
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading && !success) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, loading, success, onClose]);

  if (!isOpen) return null;

  // Validación local
  const categoriesMet =
    [passwordChecks.hasUpper, passwordChecks.hasLower, passwordChecks.hasNumber, passwordChecks.hasSymbol]
      .filter(Boolean).length >= 3;

  const newPasswordIsValid =
    passwordChecks.minLength &&
    passwordChecks.maxLength &&
    passwordChecks.notCommon &&
    passwordChecks.notRepeated &&
    categoriesMet;

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const notSameAsCurrent = newPassword.length > 0 && newPassword !== currentPassword;
  const currentFilled = currentPassword.length > 0;

  const canSubmit =
    !loading &&
    currentFilled &&
    newPasswordIsValid &&
    passwordsMatch &&
    notSameAsCurrent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setLoading(true);

    try {
      const res = await authFetch('/api/users/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar la contraseña');

      // Éxito: mostrar banner y notificar al padre para que cierre sesión
      setSuccess(true);

      // Esperar 2 segundos y ejecutar el callback (que hará logout)
      setTimeout(() => {
        onPasswordChanged();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 sm:p-8 relative transition-colors ${
          darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Close button */}
        {!success && (
          <button
            onClick={onClose}
            disabled={loading}
            className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
              darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Estado 1: Formulario */}
        {!success ? (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl border mb-3 ${
                  darkMode ? 'bg-amber-950 text-amber-400 border-amber-800' : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}
              >
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black tracking-tight">
                Cambiar Contraseña
              </h2>
              <p className={`text-xs mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Por seguridad, deberás iniciar sesión de nuevo
              </p>
            </div>

            {/* Aviso de seguridad */}
            <div
              className={`mb-5 p-3 rounded-xl border text-[11px] leading-relaxed flex items-start gap-2 ${
                darkMode ? 'bg-blue-950/40 border-blue-800 text-blue-200' : 'bg-blue-50 border-blue-300 text-blue-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-0.5">Cierre de sesión global</strong>
                Al cambiar tu contraseña, se cerrarán <strong>todas</strong> tus sesiones activas (incluida esta) en todos tus dispositivos.
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-2.5 text-xs text-rose-800 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Contraseña actual */}
              <div>
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Contraseña actual <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    required
                    autoFocus
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Tu contraseña actual"
                    className={`w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:outline-hidden ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-cyan-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    tabIndex={-1}
                    className={`absolute right-2 top-2 p-1 rounded-lg transition-colors ${
                      darkMode ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Nueva contraseña */}
              <div>
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Nueva contraseña <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nueva contraseña"
                    className={`w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:outline-hidden ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-cyan-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    tabIndex={-1}
                    className={`absolute right-2 top-2 p-1 rounded-lg transition-colors ${
                      darkMode ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Feedback visual de la política */}
                {newPassword.length > 0 && (
                  <PasswordRequirements
                    checks={passwordChecks}
                    darkMode={darkMode}
                    minLength={10}
                  />
                )}

                {/* Aviso si es igual a la actual */}
                {newPassword.length > 0 && currentPassword.length > 0 && !notSameAsCurrent && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    La nueva contraseña no puede ser igual a la actual
                  </p>
                )}
              </div>

              {/* Confirmar nueva contraseña */}
              <div>
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Confirmar nueva contraseña <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    className={`w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:outline-hidden ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-cyan-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    className={`absolute right-2 top-2 p-1 rounded-lg transition-colors ${
                      darkMode ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Aviso si no coinciden */}
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Las contraseñas no coinciden
                  </p>
                )}

                {/* Confirmación verde si coinciden */}
                {passwordsMatch && (
                  <p className="text-[11px] text-emerald-500 font-semibold mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Las contraseñas coinciden
                  </p>
                )}
              </div>

              {/* Botones */}
              <div className={`flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-3 border-t ${
                darkMode ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Cambiando...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Cambiar contraseña</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Estado 2: Éxito */
          <div className="text-center py-4 animate-in fade-in zoom-in-95 duration-300">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-full border-2 mb-4 ${
                darkMode ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-600 border-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              ¡Contraseña actualizada!
            </h2>
            <p className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Todas tus sesiones activas han sido cerradas por seguridad.
            </p>

            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                darkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-2 font-bold">
                <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                <span>Cerrando sesión...</span>
              </div>
              <p>Serás redirigido al inicio de sesión automáticamente.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};