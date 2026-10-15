import React, { useState } from 'react';
import {
  User,
  Phone,
  GraduationCap,
  Save,
  X,
  Lock,
  Camera,
  KeyRound,
  ShieldCheck,
  Mail,
  CreditCard,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import type { UserProfile } from '../types';
import { authFetch, AVATAR_FALLBACK } from '../lib/api';

interface EditProfileViewProps {
  currentUser: UserProfile;
  onCancel: () => void;
  onUserUpdated: (updatedUser: UserProfile) => void;
  onOpenAvatarModal: () => void;
  onOpenChangePassword: () => void;
  darkMode: boolean;
}

export const EditProfileView: React.FC<EditProfileViewProps> = ({
  currentUser,
  onCancel,
  onUserUpdated,
  onOpenAvatarModal,
  onOpenChangePassword,
  darkMode,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [program, setProgram] = useState(currentUser.program || '');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Detectar si hubo cambios para encender el botón de guardar
  const hasChanges =
    name !== currentUser.name ||
    phone !== (currentUser.phone || '') ||
    program !== (currentUser.program || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await authFetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, program }),
      });

      if (res.ok) {
        const updated = await res.json();
        onUserUpdated(updated);
        setMessage({ type: 'success', text: '¡Información actualizada con éxito!' });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.message || 'Error al actualizar información.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión con el servidor.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 animate-in fade-in duration-300">
      
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className={`text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Editar Información Personal
        </h1>
        <p className={`text-xs sm:text-sm mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Actualiza tus datos de contacto. Los cambios se verán reflejados al instante en la vista previa de tu carné.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* 📝 COLUMNA IZQUIERDA: Formulario de datos (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">

          {/* Banner informativo de campos bloqueados */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 backdrop-blur-sm transition-all ${
            darkMode
              ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}>
            <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="font-bold block mb-0.5">Datos institucionales protegidos</strong>
              Tu cédula/carné, correo institucional y rol de acceso son administrados por coordinación académica y no se pueden modificar directamente.
            </div>
          </div>

          {/* Mensaje de respuesta (Success/Error) */}
          {message && (
            <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
              <span>{message.text}</span>
            </div>
          )}

          {/* Formulario Principal */}
          <form onSubmit={handleSubmit} className={`p-6 sm:p-8 rounded-3xl border shadow-xl transition-colors backdrop-blur-sm ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-200'
          }`}>
            <div className="space-y-5">
              
              {/* Campo Nombre Completo */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Nombre Completo <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Tu nombre completo"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border transition-all focus:outline-none focus:ring-2 ${
                      darkMode
                        ? 'bg-slate-950/60 border-slate-800 text-white focus:ring-blue-500/50 focus:border-blue-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/30 focus:border-blue-600'
                    }`}
                  />
                </div>
                <p className={`text-[10px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Mínimo 3 caracteres. Usa tu nombre tal como figura en tu documento.
                </p>
              </div>

              {/* Campo Teléfono */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Teléfono / Celular <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <Phone className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej: 3001234567"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border transition-all focus:outline-none focus:ring-2 ${
                      darkMode
                        ? 'bg-slate-950/60 border-slate-800 text-white focus:ring-blue-500/50 focus:border-blue-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/30 focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>

              {/* Campo Programa / Facultad */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Programa / Facultad
                </label>
                <div className="relative">
                  <GraduationCap className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    placeholder="Ej: Ingeniería de Sistemas"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border transition-all focus:outline-none focus:ring-2 ${
                      darkMode
                        ? 'bg-slate-950/60 border-slate-800 text-white focus:ring-blue-500/50 focus:border-blue-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/30 focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Acciones de guardar / cancelar */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-200/20">
              <button
                type="button"
                onClick={onCancel}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  darkMode
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
                <span>Cancelar</span>
              </button>

              <button
                type="submit"
                disabled={!hasChanges || saving}
                className={`flex items-center gap-2 px-7 py-3 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95 ${
                  hasChanges && !saving
                    ? 'bg-blue-900 hover:bg-blue-800 text-white shadow-blue-900/30 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed shadow-none'
                }`}
              >
                <Save className={`w-4 h-4 ${hasChanges ? 'text-amber-400' : ''}`} />
                <span>{saving ? 'Guardando...' : 'Guardar cambios'}</span>
              </button>
            </div>
          </form>

          {/* Sección de Seguridad de la cuenta */}
          <div className={`p-6 rounded-3xl border shadow-xl transition-colors backdrop-blur-sm ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-200'
          }`}>
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Seguridad de la cuenta
            </h3>

            <button
              type="button"
              onClick={onOpenChangePassword}
              className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all group ${
                darkMode
                  ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-105 ${
                  darkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
                }`}>
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-xs font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Cambiar mi contraseña
                  </p>
                  <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Recomendado si sospechas que tu cuenta fue comprometida.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* 🎴 COLUMNA DERECHA: Vista Previa del Carné (5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-24">
          <div className={`p-6 rounded-3xl border shadow-2xl transition-all backdrop-blur-sm ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-200'
          }`}>
            
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200/20">
              <span className={`text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                darkMode ? 'bg-blue-950/80 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-900 border-blue-200'
              }`}>
                Vista Previa en Vivo
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Actualizando en tiempo real" />
            </div>

            {/* Tarjeta Visual de Perfil / Carné */}
            <div className="flex flex-col items-center text-center">
              
              {/* Avatar con botón de cambio de foto */}
              <div className="relative group mb-4">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-500 to-blue-600 blur-sm opacity-70 group-hover:opacity-100 transition-opacity" />
                <img
                  src={currentUser.avatarUrl || AVATAR_FALLBACK}
                  alt={name || 'Usuario'}
                  className="relative w-24 h-24 rounded-full object-cover ring-4 ring-slate-950 shadow-xl"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={onOpenAvatarModal}
                  title="Cambiar foto de perfil"
                  className="absolute bottom-0 right-0 p-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg ring-2 ring-slate-950 transition-transform hover:scale-110 active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Nombre e Identidad */}
              <h2 className={`text-lg font-black tracking-tight max-w-[220px] truncate ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {name || 'Tu Nombre'}
              </h2>
              
              <span className={`mt-1 inline-block text-[10px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full border ${
                darkMode ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-900 border-blue-200'
              }`}>
                {currentUser.role === 'student' ? 'Estudiante' : currentUser.role}
              </span>

              {/* Datos del Carné */}
              <div className="w-full mt-6 pt-5 border-t border-slate-200/20 space-y-3 text-left">
                
                <div className="flex items-center gap-3 text-xs">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="overflow-hidden">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Correo</p>
                    <p className={`font-semibold truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{currentUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Cédula / Carné</p>
                    <p className={`font-semibold font-mono ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{currentUser.documentId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Teléfono</p>
                    <p className={`font-semibold ${phone ? (darkMode ? 'text-slate-200' : 'text-slate-800') : 'text-slate-400 italic'}`}>
                      {phone || 'Sin registrar'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Programa</p>
                    <p className={`font-semibold ${program ? (darkMode ? 'text-slate-200' : 'text-slate-800') : 'text-slate-400 italic'}`}>
                      {program || 'Sin registrar'}
                    </p>
                  </div>
                </div>

              </div>

              {/* Pie de tarjeta */}
              <div className={`w-full mt-6 p-3 rounded-2xl border text-[10px] text-center ${
                darkMode ? 'bg-slate-950/50 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                UNIMINUTO • Sede Ibagué
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};