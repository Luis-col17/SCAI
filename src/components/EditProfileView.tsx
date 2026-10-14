import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User as UserIcon,
  Phone,
  GraduationCap,
  Mail,
  CreditCard,
  Shield,
  Camera,
  AlertCircle,
  CheckCircle2,
  Save,
  X,
  Eye,
  KeyRound,
  ChevronRight,
} from 'lucide-react';
import type { UserProfile, UserRole } from '../types.ts';
import { authFetch, AVATAR_FALLBACK } from '../lib/api.ts';

interface EditProfileViewProps {
  currentUser: UserProfile;
  onCancel: () => void;
  onUserUpdated: (user: UserProfile) => void;
  onOpenAvatarModal?: () => void;
  onOpenChangePassword?: () => void;
  darkMode?: boolean;
}

// Etiqueta legible por rol (para la badge del preview)
const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  security: 'Vigilancia',
  student: 'Estudiante',
  teacher: 'Docente',
  staff: 'Administrativo',
  visitor: 'Visitante',
};

// Colores de badge por rol
const roleBadgeClass = (role: UserRole, darkMode: boolean): string => {
  const map: Record<UserRole, { light: string; dark: string }> = {
    admin: { light: 'bg-rose-100 text-rose-800 border-rose-200', dark: 'bg-rose-950 text-rose-300 border-rose-800' },
    security: { light: 'bg-amber-100 text-amber-800 border-amber-300', dark: 'bg-amber-950 text-amber-300 border-amber-800' },
    student: { light: 'bg-blue-100 text-blue-800 border-blue-200', dark: 'bg-blue-950 text-blue-300 border-blue-800' },
    teacher: { light: 'bg-purple-100 text-purple-800 border-purple-200', dark: 'bg-purple-950 text-purple-300 border-purple-800' },
    staff: { light: 'bg-emerald-100 text-emerald-800 border-emerald-200', dark: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
    visitor: { light: 'bg-slate-100 text-slate-700 border-slate-200', dark: 'bg-slate-900 text-slate-300 border-slate-700' },
  };
  return darkMode ? map[role].dark : map[role].light;
};

export const EditProfileView: React.FC<EditProfileViewProps> = ({
  currentUser,
  onCancel,
  onUserUpdated,
  onOpenAvatarModal,
  onOpenChangePassword,
  darkMode = false,
}) => {
  const [name, setName] = useState(currentUser.name || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [facultyOrDept, setFacultyOrDept] = useState(currentUser.facultyOrDept || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 🔄 Restaurar estado si el usuario cambia (por si acaso)
  useEffect(() => {
    setName(currentUser.name || '');
    setPhone(currentUser.phone || '');
    setFacultyOrDept(currentUser.facultyOrDept || '');
    setError(null);
    setSuccess(false);
  }, [currentUser.id]);

  // 🎨 ¿Hay cambios sin guardar?
  const hasChanges =
    name.trim() !== (currentUser.name || '') ||
    phone.trim() !== (currentUser.phone || '') ||
    facultyOrDept.trim() !== (currentUser.facultyOrDept || '');

  // ⌨️ Escape cancela
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onCancel]);

  // 🛡️ Salir con confirmación si hay cambios
  const handleCancel = () => {
    if (hasChanges && !loading) {
      if (!confirm('¿Descartar los cambios sin guardar?')) return;
    }
    onCancel();
  };

  // 💾 Guardar cambios
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;

    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const res = await authFetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          facultyOrDept: facultyOrDept.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar el perfil');

      setSuccess(true);
      onUserUpdated(data.user);

      // Cerrar la vista después de un momento
      setTimeout(() => {
        onCancel();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  // 📊 Nombre para el preview en vivo
  const previewName = name.trim() || currentUser.name;
  const previewFaculty = facultyOrDept.trim() || currentUser.facultyOrDept || 'Sin programa asignado';
  const previewPhone = phone.trim() || currentUser.phone || 'Sin teléfono';

  return (
    <div className="w-full max-w-7xl mx-auto py-4 lg:py-8 animate-in fade-in duration-200">

      {/* ─────── Botón Volver (arriba) ─────── */}
      <button
        onClick={handleCancel}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-colors mb-6 ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al portal</span>
      </button>

      {/* ─────── Header ─────── */}
      <div className="mb-8">
        <h1 className={`text-3xl lg:text-4xl font-black tracking-tight mb-2 ${
          darkMode ? 'text-white' : 'text-slate-900'
        }`}>
          Editar información
        </h1>
        <p className={`text-sm lg:text-base ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Actualiza tus datos personales. Los cambios se ven reflejados al instante en la vista previa.
        </p>
      </div>

      {/* ─────── Layout 2 columnas ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">

        {/* ═══════ COLUMNA IZQUIERDA: Formulario ═══════ */}
        <div className="lg:col-span-2">
          <div className={`p-8 lg:p-10 rounded-3xl border shadow-lg backdrop-blur-sm ${
            darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
          }`}>

            {/* Aviso de campos bloqueados */}
            <div className={`mb-6 p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
              darkMode
                ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-0.5">Datos institucionales bloqueados</strong>
                Tu cédula, correo y rol son datos críticos y solo pueden ser modificados por coordinación.
              </div>
            </div>

            {/* Success banner */}
            {success && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center gap-3 text-sm text-emerald-800 font-medium animate-in fade-in duration-200">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                <span>¡Perfil actualizado correctamente!</span>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-300 flex items-start gap-3 text-sm text-rose-800 font-medium">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Nombre completo */}
              <div>
                <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Nombre Completo <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-4 top-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre completo"
                    minLength={3}
                    maxLength={80}
                    className={`w-full pl-11 pr-4 py-3.5 border rounded-2xl text-sm focus:outline-hidden transition-colors ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-cyan-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                    }`}
                  />
                </div>
                <p className={`text-[11px] mt-1.5 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  Mínimo 3 caracteres, máximo 80.
                </p>
              </div>

              {/* Teléfono */}
              <div>
                <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Teléfono <span className={`font-normal normal-case ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>(opcional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-4 top-4 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej: 3001234567"
                    maxLength={15}
                    className={`w-full pl-11 pr-4 py-3.5 border rounded-2xl text-sm focus:outline-hidden transition-colors ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-cyan-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                    }`}
                  />
                </div>
                <p className={`text-[11px] mt-1.5 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  Entre 7 y 15 dígitos. Sin espacios ni guiones.
                </p>
              </div>

              {/* Programa / Facultad */}
              <div>
                <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Programa / Facultad
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 absolute left-4 top-4 text-slate-400" />
                  <input
                    type="text"
                    value={facultyOrDept}
                    onChange={(e) => setFacultyOrDept(e.target.value)}
                    placeholder="Ej: Ingeniería de Sistemas"
                    maxLength={120}
                    className={`w-full pl-11 pr-4 py-3.5 border rounded-2xl text-sm focus:outline-hidden transition-colors ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-cyan-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                    }`}
                  />
                </div>
              </div>

              {/* Botones */}
              <div className={`flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t ${
                darkMode ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                    darkMode
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <X className="w-4 h-4" />
                  <span>Cancelar</span>
                </button>
                <button
                  type="submit"
                  disabled={loading || !hasChanges}
                  className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-black transition-all shadow-lg hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar cambios</span>
                    </>
                  )}
                </button>
              </div>

              {hasChanges && !loading && (
                <p className={`text-xs text-center pt-1 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                  Tienes cambios sin guardar
                </p>
              )}
            </form>

            {/* ─────── Cambiar contraseña (acción separada) ─────── */}
            {onOpenChangePassword && (
              <div className={`mt-8 pt-6 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <KeyRound className={`w-4 h-4 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                  <h3 className={`text-xs font-black uppercase tracking-wider ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Seguridad de la cuenta
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={onOpenChangePassword}
                  className={`w-full flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all text-left group ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 hover:border-amber-700 hover:bg-slate-900'
                      : 'bg-slate-50 border-slate-200 hover:border-amber-300 hover:bg-amber-50/40'
                  }`}
                >
                  <div className="flex-1">
                    <p className={`text-sm font-bold mb-0.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Cambiar mi contraseña
                    </p>
                    <p className={`text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      Recomendado si sospechas que tu cuenta fue comprometida.
                      Al cambiarla, se cerrarán todas tus sesiones activas.
                    </p>
                  </div>
                  <ChevronRight className={`w-5 h-5 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                    darkMode ? 'text-slate-600' : 'text-slate-400'
                  }`} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ═══════ COLUMNA DERECHA: Preview en vivo ═══════ */}
        <div className="lg:col-span-1">
          <div className={`p-6 lg:p-8 rounded-3xl border shadow-lg sticky top-24 backdrop-blur-sm ${
            darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
          }`}>

            {/* Header del preview */}
            <div className="flex items-center gap-2 mb-6">
              <Eye className={`w-4 h-4 ${darkMode ? 'text-cyan-400' : 'text-blue-900'}`} />
              <h2 className={`text-xs font-black uppercase tracking-wider ${
                darkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Vista previa
              </h2>
            </div>

            {/* Foto + botón cambiar */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <img
                  src={currentUser.avatarUrl || AVATAR_FALLBACK}
                  alt={previewName}
                  className="w-28 h-28 rounded-full object-cover ring-4 ring-cyan-500/30 shadow-2xl"
                  referrerPolicy="no-referrer"
                />
                {onOpenAvatarModal && (
                  <button
                    type="button"
                    onClick={onOpenAvatarModal}
                    title="Cambiar foto de perfil"
                    className={`absolute -bottom-1 -right-1 w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-lg transition-transform hover:scale-110 ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-cyan-400 hover:bg-slate-700'
                        : 'bg-white border-slate-200 text-blue-900 hover:bg-slate-50'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Nombre en vivo */}
              <h3 className={`text-lg font-black text-center leading-tight ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {previewName}
              </h3>

              {/* Rol badge */}
              <span className={`inline-block mt-2 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                roleBadgeClass(currentUser.role, darkMode)
              }`}>
                {ROLE_LABELS[currentUser.role] || currentUser.role}
              </span>
            </div>

            {/* Separador */}
            <div className={`border-t my-4 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`} />

            {/* Datos del preview */}
            <div className="space-y-3 text-xs">

              <div className="flex items-start gap-3">
                <Mail className={`w-4 h-4 shrink-0 mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Correo
                  </p>
                  <p className={`font-mono truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {currentUser.email}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CreditCard className={`w-4 h-4 shrink-0 mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Cédula / Carné
                  </p>
                  <p className={`font-mono ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {currentUser.documentId}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className={`w-4 h-4 shrink-0 mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Teléfono
                  </p>
                  <p className={`font-mono ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {previewPhone}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <GraduationCap className={`w-4 h-4 shrink-0 mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Programa / Facultad
                  </p>
                  <p className={`${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {previewFaculty}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className={`w-4 h-4 shrink-0 mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Estado de la cuenta
                  </p>
                  <p className={`font-bold ${currentUser.status === 'active' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    ● {currentUser.status === 'active' ? 'Activa' : 'Suspendida'}
                  </p>
                </div>
              </div>
            </div>

            {/* Aviso de solo lectura */}
            <div className={`mt-6 p-3 rounded-xl border text-[10px] leading-relaxed ${
              darkMode ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              Los campos en gris (correo, cédula, rol) son de solo lectura y no se pueden modificar desde aquí.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};