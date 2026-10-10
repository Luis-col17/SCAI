import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { UserRole, UserProfile } from '../types.ts';
import { PasswordRequirements } from './PasswordRequirements.tsx';
import type { PasswordChecks } from './PasswordRequirements.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile, token: string) => void;
  darkMode?: boolean;
}

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

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  darkMode = false,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔒 Mostrar/ocultar contraseña
  const [showPassword, setShowPassword] = useState(false);

  // 🛡️ Estado del análisis de la contraseña (para feedback en vivo)
  const [passwordChecks, setPasswordChecks] = useState<PasswordChecks>(EMPTY_CHECKS);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [documentId, setDocumentId] = useState('');
  const [facultyOrDept, setFacultyOrDept] = useState('');
  const [phone, setPhone] = useState('');

  // Recalcular checks cuando cambia la contraseña
  useEffect(() => {
    setPasswordChecks(computePasswordChecks(password));
  }, [password]);

  if (!isOpen) return null;

  // ¿Está lista la contraseña para registrarse?
  const categoriesMet =
    [passwordChecks.hasUpper, passwordChecks.hasLower, passwordChecks.hasNumber, passwordChecks.hasSymbol].filter(Boolean).length >= 3;
  const passwordIsValid =
    passwordChecks.minLength &&
    passwordChecks.maxLength &&
    passwordChecks.notCommon &&
    passwordChecks.notRepeated &&
    categoriesMet;

  const submitDisabled = loading || (mode === 'register' && !passwordIsValid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitDisabled) return;

    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/sign-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
        onLoginSuccess(data.user, data.token);
        onClose();
      } else {
        const res = await fetch('/api/auth/sign-up', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            password,
            role,
            documentId,
            facultyOrDept,
            phone,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al registrar usuario');
        onLoginSuccess(data.user, data.token);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="auth-modal-dialog"
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden p-6 sm:p-8 relative transition-colors ${
          darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${
            darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl border mb-3 shadow-xs ${
              darkMode ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black tracking-tight">
            {mode === 'login' ? 'Iniciar Sesión Institucional' : 'Registro en el Sistema'}
          </h2>
          <p className={`text-xs mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            UNIMINUTO Sede Ibagué • Autenticación Segura
          </p>
        </div>

        {/* Tab switch */}
        <div
          className={`flex p-1 rounded-xl border mb-5 ${
            darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'login'
                ? darkMode
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-900 text-white shadow-xs'
                : darkMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'register'
                ? darkMode
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-900 text-white shadow-xs'
                : darkMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Registrarse con Rol
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-2.5 text-xs text-rose-800 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <div>
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre completo"
                    className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-hidden ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Rol Institucional
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className={`w-full px-2.5 py-2 border rounded-xl text-xs focus:outline-hidden ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-900'
                    }`}
                  >
                    <option value="student">Estudiante</option>
                    <option value="teacher">Docente</option>
                    <option value="staff">Administrativo</option>
                    <option value="security">Vigilancia</option>
                    <option value="admin">Administrador</option>
                    <option value="visitor">Visitante</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Cédula / Carné ID
                  </label>
                  <input
                    type="text"
                    required
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    placeholder="1005892341"
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-hidden ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                    }`}
                  />
                </div>
              </div>

              {/* 🎓 Programa / Facultad — SELECT con optgroups */}
              <div>
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Programa / Facultad
                </label>
                <select
                  required
                  value={facultyOrDept}
                  onChange={(e) => setFacultyOrDept(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-hidden ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-900'
                  }`}
                >
                  <option value="" disabled>
                    Selecciona tu programa o dependencia
                  </option>

                  <optgroup label="Pregrado">
                    <option value="Administración de Empresas">Administración de Empresas</option>
                    <option value="Administración en Salud Ocupacional">Administración en Salud Ocupacional</option>
                    <option value="Contaduría Pública">Contaduría Pública</option>
                    <option value="Ingeniería de Sistemas">Ingeniería de Sistemas</option>
                    <option value="Ingeniería Civil">Ingeniería Civil</option>
                    <option value="Ingeniería de Software">Ingeniería de Software</option>
                    <option value="Ingeniería Industrial">Ingeniería Industrial</option>
                    <option value="Psicología">Psicología</option>
                    <option value="Trabajo Social">Trabajo Social</option>
                    <option value="Comunicación Social y Periodismo">Comunicación Social y Periodismo</option>
                    <option value="Licenciatura en Educación Infantil">Licenciatura en Educación Infantil</option>
                  </optgroup>

                  <optgroup label="Posgrado">
                    <option value="Especialización en Gerencia de Proyectos">Especialización en Gerencia de Proyectos</option>
                    <option value="Especialización en Gerencia de la SST">Especialización en Gerencia de la SST</option>
                  </optgroup>

                  <optgroup label="Administrativos">
                    <option value="Coordinación Académica">Coordinación Académica</option>
                    <option value="Coordinación Administrativa">Coordinación Administrativa</option>
                    <option value="Bienestar Universitario">Bienestar Universitario</option>
                    <option value="Registro y Admisiones">Registro y Admisiones</option>
                    <option value="Biblioteca">Biblioteca</option>
                    <option value="Talento Humano">Talento Humano</option>
                    <option value="Sistemas y Tecnología">Sistemas y Tecnología</option>
                  </optgroup>

                  <optgroup label="Otros">
                    <option value="Visitante externo">Visitante externo</option>
                    <option value="Otro">Otro</option>
                  </optgroup>
                </select>
              </div>
            </>
          )}

          <div>
            <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Correo Electrónico Institucional
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@uniminuto.edu.co"
                className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-hidden ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                }`}
              />
            </div>
          </div>

          {/* 🔒 Contraseña con toggle mostrar/ocultar */}
          <div>
            <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Contraseña
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-9 pr-10 py-2 border rounded-xl text-xs focus:outline-hidden ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className={`absolute right-2 top-1.5 p-1 rounded-lg transition-colors ${
                  darkMode
                    ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* 🛡️ Feedback visual SOLO en modo registro y cuando hay texto */}
            {mode === 'register' && password.length > 0 && (
              <PasswordRequirements
                checks={passwordChecks}
                darkMode={darkMode}
                minLength={10}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={submitDisabled}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs tracking-wide transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading
              ? 'Procesando...'
              : mode === 'login'
                ? 'Iniciar Sesión'
                : 'Crear Cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
};