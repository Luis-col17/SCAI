import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { MobileAppView } from './components/MobileAppView.tsx';
import { WebAppView } from './components/WebAppView.tsx';
import { RecognitionCameraModule } from './components/RecognitionCameraModule.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { TechnicalInfoModal } from './components/TechnicalInfoModal.tsx';
import { EditProfileView } from './components/EditProfileView.tsx';
import { ChangePasswordModal } from './components/ChangePasswordModal.tsx';
import { AvatarModal } from './components/AvatarModal.tsx';
import { storeToken, clearStoredToken } from './lib/api.ts';
import type { UserProfile, AccessLog, SystemStats } from './types.ts';
import { authFetch } from './lib/api.ts';
import { Lock, Smartphone, Camera, Sparkles, Clock } from 'lucide-react';

// 🎨 Selector de logo SCAI Horizon según modo claro/oscuro
const SCAI_LOGO_LIGHT = '/img/logoclaro.png';
const SCAI_LOGO_DARK = '/img/logooscuro.png';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mobile' | 'camera' | 'admin'>('mobile');
  const [darkMode, setDarkMode] = useState(false);

  // 🖥️ Vista activa: 'main' (contenido normal) o 'edit-profile' (vista de edición)
  const [activeView, setActiveView] = useState<'main' | 'edit-profile'>('main');

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isTechInfoOpen, setIsTechInfoOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Global system collections
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Persistencia de sesión: el usuario autenticado se conserva al recargar la página.
  const SESSION_KEY = 'uniminuto_session';
  const restoredRef = useRef(false);

  // 🎨 Logo SCAI que cambia según el modo
  const scaiLogo = darkMode ? SCAI_LOGO_DARK : SCAI_LOGO_LIGHT;

  // 🌊 Patrón ripple de fondo (radar cyan). Mismo cyan del logo en ambos modos.
  const rippleBackground = darkMode
    ? 'repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 40px, rgba(6, 182, 212, 0.50) 41px, transparent 42px)'
    : 'repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 40px, rgba(6, 182, 212, 0.55) 41px, transparent 42px)';

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
          storeToken(saved.token);
          setAuthToken(saved.token);
          setCurrentUser(saved.user);
          fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${saved.token}` },
          })
            .then(async (r) => {
              if (r.ok) return r.json();
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
    setActiveView('main');
  };

  const handleLogout = () => {
    restoredRef.current = false;
    setCurrentUser(null);
    setAuthToken(null);
    clearStoredToken();
    localStorage.removeItem(SESSION_KEY);
    // 🔒 Volver al tab permitido: si estaba en cámara/admin, quedaría bloqueado.
    setActiveTab('mobile');
    setActiveView('main');
  };

  // 🔑 Se llama después de cambiar la contraseña con éxito.
  // Cierra la sesión local para forzar el re-login con la nueva contraseña.
  const handlePasswordChanged = () => {
    setIsChangePasswordOpen(false);
    handleLogout();
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
    authFetch('/api/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setStats(d);
      })
      .catch(() => {});
  };

  return (
    <div className={`relative min-h-screen flex flex-col font-sans selection:bg-amber-400 selection:text-slate-900 transition-colors duration-200 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>

      {/* 🌊 FONDO RIPPLE (radar cyan) — solo decorativo, no interactuable */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{ backgroundImage: rippleBackground }}
      />

      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setActiveView('main');
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        onOpenEditProfile={() => setActiveView('edit-profile')}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">

        {loading ? (
          /* ═══════ LOADING STATE con logo SCAI ═══════ */
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="relative">
              <div className={`absolute inset-0 rounded-full blur-3xl opacity-40 animate-pulse ${
                darkMode ? 'bg-cyan-500/50' : 'bg-blue-400/40'
              }`} />
              <img
                src={scaiLogo}
                alt="SCAI Horizon"
                className="relative w-40 h-40 lg:w-48 lg:h-48 object-contain animate-pulse"
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className={`text-sm font-black tracking-wide ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Iniciando SCAI Horizon
              </p>
              <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Sistema de control de acceso peatonal facial...
              </p>
            </div>
            <div className="w-10 h-10 border-3 border-blue-900 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : activeView === 'edit-profile' && currentUser ? (
          /* ═══════════════════════════════════════════════════════════════════
              VISTA DEDICADA: EDITAR PERFIL
              ═══════════════════════════════════════════════════════════════════ */
          <EditProfileView
            currentUser={currentUser}
            onCancel={() => setActiveView('main')}
            onUserUpdated={handleUserUpdated}
            onOpenAvatarModal={() => setIsAvatarOpen(true)}
            onOpenChangePassword={() => setIsChangePasswordOpen(true)}
            darkMode={darkMode}
          />
        ) : (
          <>
            {/* ═══════════════════════════════════════════════════════════════════
                VIEW 1: PORTAL PERSONAL
                ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'mobile' && (
              <div className="animate-in fade-in duration-200">
                {currentUser ? (
                  <div className="space-y-4">
                    <div className="text-center max-w-3xl mx-auto mb-4">
                      <span className={`text-[11px] font-mono font-bold uppercase tracking-widest px-3.5 py-1 rounded-full shadow-xs border ${
                        darkMode
                          ? 'bg-amber-950/70 border-amber-800 text-amber-300'
                          : 'bg-amber-100 border-amber-300 text-blue-950'
                      }`}>
                        Portal Peatonal • UNIMINUTO
                      </span>
                      <p className={`text-xs mt-2 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Sesión activa: <strong className={darkMode ? 'text-amber-400' : 'text-blue-950'}>{currentUser.name}</strong> ({currentUser.role})
                      </p>
                    </div>

                    <div className="hidden lg:block">
                      <WebAppView
                        currentUser={currentUser}
                        onRefresh={fetchData}
                        onUserUpdated={handleUserUpdated}
                        darkMode={darkMode}
                      />
                    </div>

                    <div className="lg:hidden">
                      <MobileAppView
                        currentUser={currentUser}
                        onRefresh={fetchData}
                        onUserUpdated={handleUserUpdated}
                        darkMode={darkMode}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-7xl mx-auto py-4 lg:py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">

                      <div className={`flex flex-col p-10 lg:p-14 rounded-3xl border shadow-xl transition-colors backdrop-blur-sm ${
                        darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
                      }`}>
                        <span className={`self-start inline-block text-[11px] lg:text-xs font-mono font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border mb-6 ${
                          darkMode
                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                            : 'bg-blue-100 text-blue-900 border-blue-300'
                        }`}>
                          Acceso Institucional
                        </span>

                        <h1 className={`text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight mb-5 leading-[1.05] ${
                          darkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          Control de<br className="hidden lg:block" /> Acceso Peatonal
                        </h1>
                        <p className={`text-sm lg:text-base leading-relaxed mb-10 max-w-lg ${
                          darkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          Sistema de reconocimiento facial y gestión de accesos para la sede Ibagué de UNIMINUTO.
                          Accede con tu cuenta institucional para consultar tu información personal.
                        </p>

                        <div className="mt-auto">
                          <button
                            onClick={() => setIsAuthOpen(true)}
                            className="w-full lg:w-auto lg:min-w-[280px] px-8 py-4 lg:py-5 rounded-2xl bg-blue-900 hover:bg-blue-800 text-white font-black text-sm lg:text-base shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                          >
                            <Lock className="w-5 h-5 text-amber-400" />
                            Iniciar Sesión Institucional
                          </button>

                          <p className={`text-xs lg:text-sm mt-5 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            ¿No tienes cuenta?{' '}
                            <button
                              onClick={() => setIsAuthOpen(true)}
                              className={`font-bold underline transition-colors ${
                                darkMode ? 'text-amber-400 hover:text-amber-300' : 'text-blue-900 hover:text-blue-700'
                              }`}
                            >
                              Regístrate aquí
                            </button>
                          </p>
                        </div>
                      </div>

                      <div className={`flex flex-col p-10 lg:p-14 rounded-3xl border shadow-xl transition-colors backdrop-blur-sm ${
                        darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
                      }`}>
                        <h2 className={`text-2xl lg:text-3xl font-black mb-2 ${
                          darkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          ¿Qué puedes hacer?
                        </h2>
                        <p className={`text-xs lg:text-sm mb-8 ${
                          darkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          Con tu cuenta institucional UNIMINUTO
                        </p>

                        <div className="space-y-6 lg:space-y-7">
                          {[
                            { icon: Sparkles, title: 'Acceso manos libres', desc: 'Ingresa y sal del campus con reconocimiento facial en los torniquetes peatonales de la Cra 5.', color: 'emerald' },
                            { icon: Smartphone, title: 'Carné digital institucional', desc: 'Lleva tu carné UNIMINUTO siempre contigo con tu foto, código QR y datos de vigencia.', color: 'blue' },
                            { icon: Clock, title: 'Historial de accesos', desc: 'Consulta cada entrada y salida del campus con fecha, hora, torniquete y certeza del reconocimiento.', color: 'amber' },
                            { icon: Camera, title: 'Enrolamiento biométrico', desc: 'Registra tu rostro una sola vez y habilita el acceso sin contacto con consentimiento informado.', color: 'violet' },
                          ].map((feature) => {
                            const Icon = feature.icon;
                            return (
                              <div key={feature.title} className="flex items-start gap-4 lg:gap-5">
                                <div className={`shrink-0 w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center border ${
                                  darkMode
                                    ? `bg-${feature.color}-950 text-${feature.color}-300 border-${feature.color}-800`
                                    : `bg-${feature.color}-50 text-${feature.color}-700 border-${feature.color}-200`
                                }`}>
                                  <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
                                </div>
                                <div className="flex-1 pt-0.5">
                                  <h3 className={`text-sm lg:text-base font-black mb-1 ${
                                    darkMode ? 'text-white' : 'text-slate-900'
                                  }`}>
                                    {feature.title}
                                  </h3>
                                  <p className={`text-xs lg:text-sm leading-relaxed ${
                                    darkMode ? 'text-slate-400' : 'text-slate-600'
                                  }`}>
                                    {feature.desc}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className={`mt-10 p-5 lg:p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs lg:text-sm backdrop-blur-sm ${
                      darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
                        <span className={`font-black ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          Sistema operativo
                        </span>
                        <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>•</span>
                        <span className={`font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Sede Ibagué, Tolima
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <img
                          src={scaiLogo}
                          alt="SCAI Horizon"
                          className="w-8 h-8 object-contain opacity-90"
                        />
                        <span className={`font-mono font-bold ${
                          darkMode ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          SCAI · UNIMINUTO © 2026
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                VIEW 2: CÁMARA
                ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'camera' && (
              <div className="animate-in fade-in duration-200">
                <div className={`mb-4 p-4 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors backdrop-blur-sm ${
                  darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
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

                {currentUser && (currentUser.role === 'admin' || currentUser.role === 'security') ? (
                  <RecognitionCameraModule
                    users={users}
                    onNewAccessLog={handleNewAccessLog}
                    darkMode={darkMode}
                  />
                ) : (
                  <div className={`p-10 rounded-2xl border text-center backdrop-blur-sm ${
                    darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
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

            {/* ═══════════════════════════════════════════════════════════════════
                VIEW 3: PANEL DE ADMINISTRACIÓN
                ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'admin' && (
              <div className="animate-in fade-in duration-200">
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
                  <div className={`max-w-md mx-auto p-8 rounded-3xl border text-center space-y-4 shadow-xl transition-colors backdrop-blur-sm ${
                    darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
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

      {/* Footer */}
      <footer className={`relative z-10 w-full border-t py-4 px-4 text-center text-xs mt-auto transition-colors backdrop-blur-sm ${
        darkMode ? 'bg-slate-950/95 border-slate-800 text-slate-400' : 'bg-white/95 border-slate-200 text-slate-600'
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

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        darkMode={darkMode}
      />

      <TechnicalInfoModal
        isOpen={isTechInfoOpen}
        onClose={() => setIsTechInfoOpen(false)}
        darkMode={darkMode}
      />

      {/* 🖼️ Modal para cambiar foto de perfil */}
      {currentUser && (
        <AvatarModal
          isOpen={isAvatarOpen}
          onClose={() => setIsAvatarOpen(false)}
          darkMode={darkMode}
          userId={currentUser.id}
          userName={currentUser.name}
          currentAvatarUrl={currentUser.avatarUrl}
          onUserUpdated={handleUserUpdated}
          onRefresh={fetchData}
        />
      )}

      {/* 🔑 Modal para cambiar contraseña (se abre desde el navbar o desde EditProfileView) */}
      {currentUser && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          onPasswordChanged={handlePasswordChanged}
          darkMode={darkMode}
        />
      )}

    </div>
  );
}