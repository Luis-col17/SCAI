import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { MobileAppView } from './components/MobileAppView.tsx';
import { RecognitionCameraModule } from './components/RecognitionCameraModule.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { TechnicalInfoModal } from './components/TechnicalInfoModal.tsx';
import { storeToken, clearStoredToken } from './lib/api.ts';
import type { UserProfile, AccessLog, SystemStats } from './types.ts';
import { authFetch } from './lib/api.ts';
import { Shield, Lock, Smartphone, Camera, LayoutDashboard, Sparkles } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mobile' | 'camera' | 'admin'>('mobile');
  const [darkMode, setDarkMode] = useState(false);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isTechInfoOpen, setIsTechInfoOpen] = useState(false);

  // Global system collections
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Persistencia de sesión: el usuario autenticado se conserva al recargar la página.
  const SESSION_KEY = 'uniminuto_session';
  const restoredRef = useRef(false);

  // Load all system data
  const fetchData = async () => {
    try {
      const [usersRes, logsRes, statsRes] = await Promise.all([
        authFetch('/api/users'),
        authFetch('/api/access-logs'),
        authFetch('/api/stats'),
      ]);

      // Las rutas requieren sesión: si el token expiró o fue revocado, se limpia.
      if ((usersRes.status === 401 || usersRes.status === 403) && authToken) {
        clearStoredToken();
        localStorage.removeItem(SESSION_KEY);
        setCurrentUser(null);
        setAuthToken(null);
        return;
      }

      if (usersRes.ok) {
        const u = await usersRes.json();
        setUsers(u);
      }
      if (logsRes.ok) {
        setLogs(await logsRes.json());
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err) {
      console.error('Error cargando datos del sistema:', err);
    } finally {
      setLoading(false);
    }
  };

  // Restore persisted session (token + user) so a reload keeps the logged-in person
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.token && saved.user) {
          restoredRef.current = true;
          // authFetch() lee 'accessToken': sin esto, el resto de la app
          // consultaría la API sin cabecera Authorization y recibiría 401.
          storeToken(saved.token);
          setAuthToken(saved.token);
          setCurrentUser(saved.user);
          // Refresh the profile from the server (avoids stale role/name)
          fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${saved.token}` },
          })
            .then(async (r) => {
              if (r.ok) return r.json();
              // Token expirado o revocado: la sesión ya no vale
              if (r.status === 401 || r.status === 403) {
                clearStoredToken();
                localStorage.removeItem(SESSION_KEY);
                setAuthToken(null);
                setCurrentUser(null);
              }
              return null;
            })
            .then((fresh) => {
              if (fresh) {
                setCurrentUser(fresh);
                localStorage.setItem(
                  SESSION_KEY,
                  JSON.stringify({ user: fresh, token: saved.token })
                );
              }
            })
            .catch(() => {});
        }
      }
    } catch {
      clearStoredToken();
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  // Se recarga al cambiar la sesión: sin token no hay datos que traer.
  useEffect(() => {
    fetchData();
  }, [authToken]);

  // Login success
  const handleLoginSuccess = (user: UserProfile, token: string) => {
    restoredRef.current = true;
    setCurrentUser(user);
    setAuthToken(token);
    storeToken(token);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user, token }));
  };

  const handleLogout = () => {
    restoredRef.current = false;
    setCurrentUser(null);
    setAuthToken(null);
    clearStoredToken();
    localStorage.removeItem(SESSION_KEY);
  };

  // Keeps the session (and Navbar) in sync when the person edits their own profile
  const handleUserUpdated = (user: UserProfile) => {
    setCurrentUser(user);
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved?.token) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user, token: saved.token }));
      }
    } catch {
      // ignore persistence errors
    }
  };

  // Called whenever the vision camera logs a new entry or exit
  const handleNewAccessLog = (newLog: AccessLog) => {
    setLogs((prev) => [newLog, ...prev]);
    // Refresh stats
    authFetch('/api/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setStats(d);
      })
      .catch(() => {});
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-amber-400 selection:text-slate-900 transition-colors duration-200 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
            <div className="w-10 h-10 border-3 border-blue-900 border-t-amber-500 rounded-full animate-spin" />
            <p className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Iniciando sistema de control de acceso peatonal facial...
            </p>
          </div>
        ) : (
          <>
            {/* VIEW 1: MOBILE APP (Student / Teacher Personal Digital ID & Torniquete History) */}
            {activeTab === 'mobile' && (
              <div className="animate-in fade-in duration-200">
                {currentUser ? (
                  <div className="space-y-4">
                    <div className="text-center max-w-md mx-auto mb-2">
                      <span className={`text-[11px] font-mono font-bold uppercase tracking-widest px-3.5 py-1 rounded-full shadow-xs border ${
                        darkMode 
                          ? 'bg-amber-950/70 border-amber-800 text-amber-300' 
                          : 'bg-amber-100 border-amber-300 text-blue-950'
                      }`}>
                        Prototipo Móvil Peatonal • UNIMINUTO
                      </span>
                      <p className={`text-xs mt-2 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Sesión activa: <strong className={darkMode ? 'text-amber-400' : 'text-blue-950'}>{currentUser.name}</strong> ({currentUser.role})
                      </p>
                    </div>
                    
                    <MobileAppView
                      currentUser={currentUser}
                      onRefresh={fetchData}
                      onUserUpdated={handleUserUpdated}
                      darkMode={darkMode}
                    />
                  </div>
                ) : (
                  <div className={`max-w-md mx-auto p-8 rounded-3xl border text-center space-y-4 shadow-xl transition-colors ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto shadow-inner ${
                      darkMode ? 'bg-amber-950 text-amber-400 border-amber-800' : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}>
                      <Smartphone className="w-7 h-7" />
                    </div>
                    <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Inicia Sesión en Uniminuto Móvil
                    </h3>
                    <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Para ver tu carné digital, habilitación en torniquetes e historial de accesos peatonales, por favor inicia sesión.
                    </p>
                    <button
                      onClick={() => setIsAuthOpen(true)}
                      className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                    >
                      Iniciar Sesión Institucional
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: COMPUTER VISION & CAMERA RECOGNITION STATION */}
            {activeTab === 'camera' && (
              <div className="animate-in fade-in duration-200">
                <div className={`mb-4 p-4 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className={`text-base font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        Cámara de Reconocimiento Facial en Torniquetes
                      </h2>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold border ${
                        darkMode ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}>
                        RF-03 • Entrada y Salida Peatonal
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Visión artificial biométrica en tiempo real para apertura automática de torniquetes peatonales en la Cra 5.
                    </p>
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl border ${
                    darkMode ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Red Neuronal MobileNet-V3</span>
                  </div>
                </div>

                {/* La estación de cámara es zona de vigilancia: el servidor exige rol admin/security */}
                {currentUser && (currentUser.role === 'admin' || currentUser.role === 'security') ? (
                <RecognitionCameraModule
                  users={users}
                  onNewAccessLog={handleNewAccessLog}
                  darkMode={darkMode}
                />
                ) : (
                  <div className={`p-10 rounded-2xl border text-center ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <Lock className={`w-10 h-10 mx-auto mb-3 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                    <h3 className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Estación de vigilancia restringida
                    </h3>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {currentUser
                        ? 'Tu rol no tiene permiso para operar la cámara de reconocimiento facial.'
                        : 'Inicia sesión con una cuenta de vigilancia o administración para operar este módulo.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 3: ADMIN DASHBOARD (Protected by role) */}
            {activeTab === 'admin' && (
              <div className="animate-in fade-in duration-200">
                {/* Role Protection: Allow Admin or Security */}
                {currentUser && (currentUser.role === 'admin' || currentUser.role === 'security') ? (
                  <AdminDashboard
                    users={users}
                    logs={logs}
                    stats={stats}
                    onRefresh={fetchData}
                    currentUser={currentUser}
                    darkMode={darkMode}
                  />
                ) : (
                  <div className={`max-w-md mx-auto p-8 rounded-3xl border text-center space-y-4 shadow-xl transition-colors ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto shadow-inner ${
                      darkMode ? 'bg-rose-950 text-rose-400 border-rose-800' : 'bg-rose-50 text-rose-600 border-rose-200'
                    }`}>
                      <Lock className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        Acceso Restringido por Roles (RBAC)
                      </h3>
                      <p className={`text-xs mt-1 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Este panel requiere permisos de <strong>Administrador</strong> o <strong>Personal de Vigilancia</strong>. Actualmente tu rol es <span className="text-amber-500 font-bold uppercase">{currentUser?.role || 'Visitante'}</span>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer with institutional credentials */}
      <footer className={`w-full border-t py-4 px-4 text-center text-xs mt-auto transition-colors ${
        darkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-medium">
            Corporación Universitaria Minuto de Dios – <strong className={darkMode ? 'text-white font-bold' : 'text-blue-950 font-bold'}>UNIMINUTO</strong> • Sede Ibagué, Tolima (2026)
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className={`text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Control de Acceso Peatonal • Cámaras–Visión IA
            </span>
            <button
              onClick={() => setIsTechInfoOpen(true)}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                darkMode
                  ? 'text-blue-300 bg-blue-950 hover:bg-blue-900 border-blue-800'
                  : 'text-blue-900 bg-blue-50 hover:bg-blue-100 border-blue-200'
              }`}
            >
              Detalles de Arquitectura
            </button>
          </div>
        </div>
      </footer>

      {/* Better Auth & Role Protection Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        darkMode={darkMode}
      />

      {/* Technical Architecture Info Modal */}
      <TechnicalInfoModal
        isOpen={isTechInfoOpen}
        onClose={() => setIsTechInfoOpen(false)}
        darkMode={darkMode}
      />

    </div>
  );
}
