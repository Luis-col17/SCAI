import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { MobileAppView } from './components/MobileAppView';
import { WebAppView } from './components/WebAppView';
import { InteractiveBackground } from './components/InteractiveBackground';
import { RecognitionCameraModule } from './components/RecognitionCameraModule';
import { FaceEnrollmentView } from './components/FaceEnrollmentView';
import { SelfEnrollmentView } from './components/SelfEnrollmentView';
import { AdminDashboard } from './components/AdminDashboard';
import { TechnicalInfoModal } from './components/TechnicalInfoModal';
import { EditProfileView } from './components/EditProfileView';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { AvatarModal } from './components/AvatarModal';
import { storeToken, clearStoredToken } from './lib/api';
import type { UserProfile, AccessLog, SystemStats } from './types';
import { authFetch } from './lib/api';
import { Lock, Smartphone, Camera, Sparkles, Clock, ScanFace, CheckCircle2, ArrowRight } from 'lucide-react';

// 🎨 Selector de logo SCAI Horizon según modo claro/oscuro
const SCAI_LOGO_LIGHT = '/img/logoclaro.png';
const SCAI_LOGO_DARK = '/img/logooscuro.png';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mobile' | 'camera' | 'enrollment' | 'admin'>('mobile');
  const [darkMode, setDarkMode] = useState(false);

  // 🖥️ Vista activa: 'main' (contenido normal), 'edit-profile' o 'self-enrollment'
  const [activeView, setActiveView] = useState<'main' | 'edit-profile' | 'self-enrollment'>('main');

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

  // Persistencia de sesión
  const SESSION_KEY = 'uniminuto_session';
  const restoredRef = useRef(false);

  // 🎨 Logo SCAI que cambia según el modo
  const scaiLogo = darkMode ? SCAI_LOGO_DARK : SCAI_LOGO_LIGHT;

  // Load all system data
  const fetchData = async () => {
    try {
      const [usersRes, logsRes, statsRes] = await Promise.all([
        authFetch('/api/users'),
        authFetch('/api/access-logs'),
        authFetch('/api/stats'),
      ]);

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

  useEffect(() => {
    fetchData();
  }, [authToken]);

  const handleLoginSuccess = (user: UserProfile, token: string) => {
    restoredRef.current = true;
    setCurrentUser(user);
    setAuthToken(token);
    storeToken(token);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user, token }));
    setActiveView('main');
    setActiveTab('mobile');
  };

  const handleLogout = () => {
    restoredRef.current = false;
    setCurrentUser(null);
    setAuthToken(null);
    clearStoredToken();
    localStorage.removeItem(SESSION_KEY);
    setActiveTab('mobile');
    setActiveView('main');
  };

  const handlePasswordChanged = () => {
    setIsChangePasswordOpen(false);
    handleLogout();
  };

  const handleUserUpdated = (user: UserProfile) => {
    setCurrentUser(user);
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved?.token) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user, token: saved.token }));
      }
    } catch {}
  };

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

      {/* 🚀 FONDO ANIMADO INTERACTIVO DE RED NEURONAL */}
      <InteractiveBackground darkMode={darkMode} />

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
        onOpenSelfEnrollment={() => setActiveView('self-enrollment')}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-0 sm:p-0 lg:p-8">

        {loading ? (
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
          <EditProfileView
            currentUser={currentUser}
            onCancel={() => setActiveView('main')}
            onUserUpdated={handleUserUpdated}
            onOpenAvatarModal={() => setIsAvatarOpen(true)}
            onOpenChangePassword={() => setIsChangePasswordOpen(true)}
            darkMode={darkMode}
          />
        ) : activeView === 'self-enrollment' && currentUser ? (
          <SelfEnrollmentView
            currentUser={currentUser}
            onCancel={() => setActiveView('main')}
            onRefresh={fetchData}
            darkMode={darkMode}
          />
        ) : (
          <>
            {activeTab === 'mobile' && (
              <div className="animate-in fade-in duration-200">
                {currentUser ? (
                  <div className="space-y-0 lg:space-y-4">
                    <div className="text-center max-w-3xl mx-auto mb-4 px-4 pt-4 lg:px-0 lg:pt-0">
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
                  <div className="w-full max-w-7xl mx-auto py-6 lg:py-12 px-4 lg:px-0 space-y-10">
                    
                    {/* 🌟 HERO PRINCIPAL */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

                      {/* LADO IZQUIERDO: Presentación e inicio de sesión (7 cols) */}
                      <div className="lg:col-span-7 space-y-6 sm:space-y-8">
                        
                        {/* Pill de estado del sistema */}
                        <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full border text-xs font-semibold backdrop-blur-md shadow-sm ${
                          darkMode
                            ? 'bg-slate-900/80 border-cyan-500/30 text-cyan-300'
                            : 'bg-white/80 border-blue-200 text-blue-950'
                        }`}>
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
                          </span>
                          <span>Visión Artificial Biométrica v3.2</span>
                          <span className="text-slate-400">•</span>
                          <span className="font-mono text-[10px] text-amber-500 font-bold">Cra 5 Ibagué</span>
                        </div>

                        {/* Título de impacto */}
                        <div className="space-y-4">
                          <h1 className={`text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight leading-[1.08] ${
                            darkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            Control de Acceso <br />
                            <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-amber-500 bg-clip-text text-transparent">
                              Peatonal Inteligente
                            </span>
                          </h1>
                          <p className={`text-sm sm:text-base leading-relaxed max-w-xl font-medium ${
                            darkMode ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            Plataforma centralizada de reconocimiento facial en tiempo real para la sede Ibagué de UNIMINUTO. Seguridad automatizada, control peatonal sin contacto e historial biométrico integrado.
                          </p>
                        </div>

                        {/* Botones de acción */}
                        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                          <button
                            onClick={() => setIsAuthOpen(true)}
                            className="group relative flex items-center justify-center gap-3 px-8 py-4.5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 hover:from-blue-800 hover:to-indigo-800 text-white font-black text-sm shadow-xl shadow-blue-950/30 transition-all duration-300 active:scale-[0.98] cursor-pointer overflow-hidden"
                          >
                            <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000" />
                            <Lock className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
                            <span>Iniciar Sesión Institucional</span>
                          </button>

                          <button
                            onClick={() => setIsAuthOpen(true)}
                            className={`flex items-center justify-center gap-2 px-6 py-4.5 rounded-2xl border text-xs font-bold transition-all ${
                              darkMode
                                ? 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                                : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span>¿No tienes cuenta?</span>
                            <span className="text-amber-500 font-black underline">Regístrate</span>
                          </button>
                        </div>

                        {/* KPIs / Métricas Rápidas */}
                        <div className="grid grid-cols-3 gap-3.5 pt-6 border-t border-slate-200/20">
                          <div className={`p-4 rounded-2xl border backdrop-blur-sm ${darkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white/60 border-slate-200/80'}`}>
                            <p className="text-lg sm:text-2xl font-black text-cyan-400 font-mono">&lt; 500ms</p>
                            <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tasa de Respuesta</p>
                          </div>

                          <div className={`p-4 rounded-2xl border backdrop-blur-sm ${darkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white/60 border-slate-200/80'}`}>
                            <p className="text-lg sm:text-2xl font-black text-amber-400 font-mono">99.8%</p>
                            <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Precisión Facial</p>
                          </div>

                          <div className={`p-4 rounded-2xl border backdrop-blur-sm ${darkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white/60 border-slate-200/80'}`}>
                            <p className="text-lg sm:text-2xl font-black text-emerald-400 font-mono">100%</p>
                            <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Sin Contacto</p>
                          </div>
                        </div>

                      </div>

                      {/* LADO DERECHO: Capacidades del Sistema (5 cols) */}
                      <div className="lg:col-span-5 relative">
                        <div className={`relative p-6 sm:p-8 rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-md transition-all ${
                          darkMode
                            ? 'bg-slate-900/80 border-slate-800 shadow-cyan-950/20'
                            : 'bg-white/90 border-slate-200 shadow-blue-900/10'
                        }`}>
                          
                          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200/20">
                            <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
                              darkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                              <Sparkles className="w-4 h-4 text-amber-500" />
                              Capacidades del Sistema
                            </h3>
                            <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                              AI ACTIVE
                            </span>
                          </div>

                          {/* Lista de Características con Iconografía Vistosa */}
                          <div className="space-y-4">
                            {[
                              { icon: Sparkles, title: 'Acceso Manos Libres', desc: 'Apertura automática de torniquetes mediante detección facial en la entrada peatonal.', color: 'emerald' },
                              { icon: Smartphone, title: 'Carné Digital Dinámico', desc: 'Visualiza tus datos institucionales, vigencia y código QR seguro desde cualquier dispositivo.', color: 'blue' },
                              { icon: Clock, title: 'Historial de Accesos', desc: 'Auditoría detallada con timestamps, torniquete asignado y nivel de confianza biométrica.', color: 'amber' },
                              { icon: Camera, title: 'Enrolamiento Biométrico', desc: 'Registro único y seguro con consentimiento de tratamiento de datos personales.', color: 'violet' },
                            ].map((feature) => {
                              const Icon = feature.icon;
                              return (
                                <div
                                  key={feature.title}
                                  className={`p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.02] flex items-start gap-4 ${
                                    darkMode
                                      ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                                      : 'bg-slate-50/80 border-slate-200/80 hover:border-slate-300'
                                  }`}
                                >
                                  <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border ${
                                    darkMode
                                      ? `bg-${feature.color}-950/80 text-${feature.color}-400 border-${feature.color}-800/80`
                                      : `bg-${feature.color}-50 text-${feature.color}-600 border-${feature.color}-200`
                                  }`}>
                                    <Icon className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className={`text-xs sm:text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                      {feature.title}
                                    </h4>
                                    <p className={`text-xs mt-0.5 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                      {feature.desc}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                        </div>
                      </div>

                    </div>

                    {/* 🛠️ PASOS RÁPIDOS PARA INGRESO AL CAMPUS */}
                    <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl backdrop-blur-md transition-colors ${
                      darkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white/80 border-slate-200/80'
                    }`}>
                      <div className="text-center max-w-xl mx-auto mb-6">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-500">
                          Proceso Simple
                        </span>
                        <h2 className={`text-xl sm:text-2xl font-black mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          ¿Cómo ingresar al campus?
                        </h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                        {[
                          { step: '01', title: 'Inicia Sesión', desc: 'Usa tu correo institucional UNIMINUTO para autenticarte.' },
                          { step: '02', title: 'Enrola tu Rostro', desc: 'Registra tu perfil biométrico una única vez desde el portal.' },
                          { step: '03', title: 'Acceso Manos Libres', desc: 'Pasa por los torniquetes peatonales de la Cra 5 sin contacto.' },
                        ].map((item, idx) => (
                          <div
                            key={item.step}
                            className={`p-5 rounded-2xl border relative flex flex-col justify-between ${
                              darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-2xl font-black font-mono text-cyan-500">{item.step}</span>
                              <CheckCircle2 className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                              <h3 className={`text-sm font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {item.title}
                              </h3>
                              <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                {item.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Banner Inferior Informativo */}
                    <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs backdrop-blur-md ${
                      darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
                        <span className={`font-black ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          Nodo Central Operativo
                        </span>
                        <span className={darkMode ? 'text-slate-600' : 'text-slate-300'}>•</span>
                        <span className={`font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Sede Principal Ibagué, Tolima
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <img
                          src={scaiLogo}
                          alt="SCAI Horizon"
                          className="w-7 h-7 object-contain opacity-90"
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

            {activeTab === 'camera' && (
              <div className="animate-in fade-in duration-200 px-4 lg:px-0 pt-4 lg:pt-0">
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

            {activeTab === 'enrollment' && (
              <div className="animate-in fade-in duration-200 px-4 lg:px-0 pt-4 lg:pt-0">
                {currentUser && (currentUser.role === 'admin' || currentUser.role === 'security') ? (
                  <FaceEnrollmentView
                    users={users}
                    onRefresh={fetchData}
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
                        Acceso Restringido
                      </h3>
                      <p className={`text-xs mt-1 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        El módulo de enrolamiento facial requiere permisos de <strong>Administrador</strong> o <strong>Personal de Vigilancia</strong>. Actualmente tu rol es <span className="text-amber-500 font-bold uppercase">{currentUser?.role || 'Visitante'}</span>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'admin' && (
              <div className="animate-in fade-in duration-200 px-4 lg:px-0 pt-4 lg:pt-0">
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