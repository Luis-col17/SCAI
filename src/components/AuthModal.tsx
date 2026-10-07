import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  AlertCircle,
  KeyRound
} from 'lucide-react';
import type { UserRole, UserProfile } from '../types.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile, token: string) => void;
  darkMode?: boolean;
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

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [documentId, setDocumentId] = useState('');
  const [facultyOrDept, setFacultyOrDept] = useState('Ingeniería de Sistemas');
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl border mb-3 shadow-xs ${
            darkMode ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
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
        <div className={`flex p-1 rounded-xl border mb-5 ${
          darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'login'
                ? darkMode ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-900 text-white shadow-xs'
                : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'register'
                ? darkMode ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-900 text-white shadow-xs'
                : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
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
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Nombre Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre completo"
                    className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-hidden ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Rol Institucional</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className={`w-full px-2.5 py-2 border rounded-xl text-xs focus:outline-hidden ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-900'
                    }`}
                  >
                    <option value="student">Estudiante</option>
                    <option value="teacher">Docente</option>
                    <option value="staff">Administrativo</option>
                    <option value="security">Vigilancia</option>
                    <option value="visitor">Visitante</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Cédula / Carné ID</label>
                  <input
                    type="text"
                    required
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    placeholder="1005892341"
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-hidden ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Programa / Facultad</label>
                <input
                  type="text"
                  value={facultyOrDept}
                  onChange={(e) => setFacultyOrDept(e.target.value)}
                  placeholder="Ingeniería de Sistemas - Sede Ibagué"
                  className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-hidden ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                  }`}
                />
              </div>
            </>
          )}

          <div>
            <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Correo Electrónico Institucional</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@uniminuto.edu.co"
                className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-hidden ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Contraseña</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-hidden ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs tracking-wide transition-all shadow-md active:scale-95 disabled:opacity-50 mt-2"
          >
            {loading ? 'Procesando...' : mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
};
