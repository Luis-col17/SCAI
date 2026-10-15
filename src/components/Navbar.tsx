import React from 'react';
import {
  Camera,
  LayoutDashboard,
  LogOut,
  UserCheck,
  ChevronDown,
  Sun,
  Moon,
  UserCog,
  KeyRound,
  ScanFace,
  Home,
  Sparkles,
} from 'lucide-react';
import type { UserProfile, UserRole } from '../types.ts';
import { AVATAR_FALLBACK } from '../lib/api.ts';

interface NavbarProps {
  currentUser: UserProfile | null;
  activeTab: 'mobile' | 'camera' | 'enrollment' | 'admin';
  setActiveTab: (tab: 'mobile' | 'camera' | 'enrollment' | 'admin') => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenEditProfile?: () => void;
  onOpenChangePassword?: () => void;
  onOpenSelfEnrollment?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout,
  darkMode,
  onToggleDarkMode,
  onOpenEditProfile,
  onOpenChangePassword,
  onOpenSelfEnrollment,
}) => {
  const [showRoleDropdown, setShowRoleDropdown] = React.useState(false);

  // 🎨 Logo SCAI Horizon: se adapta al modo claro/oscuro automáticamente
  const logoUrl = darkMode ? '/img/logooscuro.png' : '/img/logoclaro.png';

  // 🔒 ¿Puede este usuario ver los módulos restringidos?
  const canAccessRestrictedModules =
    !!currentUser && (currentUser.role === 'admin' || currentUser.role === 'security');

  // 📸 ¿Puede este usuario enrolar su propio rostro?
  const canSelfEnroll = !!currentUser;

  // ¿El usuario necesita enrolarse?
  const needsEnrollment = !!currentUser && !currentUser.faceEnrolled;

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Administrador',
          bg: darkMode ? 'bg-rose-950/80 text-rose-300 border-rose-800' : 'bg-rose-100 text-rose-800 border-rose-200'
        };
      case 'security':
        return {
          label: 'Vigilancia',
          bg: darkMode ? 'bg-amber-950/80 text-amber-300 border-amber-800' : 'bg-amber-100 text-amber-800 border-amber-300'
        };
      case 'student':
        return {
          label: 'Estudiante',
          bg: darkMode ? 'bg-blue-950/80 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'teacher':
        return {
          label: 'Docente',
          bg: darkMode ? 'bg-purple-950/80 text-purple-300 border-purple-800' : 'bg-purple-100 text-purple-800 border-purple-200'
        };
      case 'staff':
        return {
          label: 'Administrativo',
          bg: darkMode ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
        };
      default:
        return {
          label: 'Visitante',
          bg: darkMode ? 'bg-slate-900 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
        };
    }
  };

  const roleInfo = currentUser ? getRoleBadge(currentUser.role) : null;

  return (
    <header className={`sticky top-0 z-40 w-full border-b transition-all duration-300 backdrop-blur-xl ${
      darkMode
        ? 'bg-slate-950/80 border-slate-800/80 text-slate-100 shadow-lg shadow-black/20'
        : 'bg-white/80 border-slate-200/80 text-slate-800 shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* 🎨 Logo SCAI Horizon + Identidad institucional */}
          <div className="flex items-center gap-3 shrink-0 cursor-pointer group" onClick={() => setActiveTab('mobile')}>
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-cyan-500/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <img
                src={logoUrl}
                alt="SCAI Horizon"
                className="relative h-11 w-11 object-contain shrink-0 drop-shadow-[0_2px_8px_rgba(6,182,212,0.3)] transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-black tracking-tight text-base sm:text-lg transition-colors ${
                  darkMode ? 'text-white group-hover:text-cyan-400' : 'text-blue-950 group-hover:text-blue-700'
                }`}>
                  UNIMINUTO
                </span>
                <div
                  id="brand-sede-badge"
                  className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black leading-tight text-center border border-amber-600 shadow-xs shrink-0 select-none transition-transform duration-200 group-hover:scale-105"
                  title="Sede Ibagué"
                >
                  <span className="tracking-wide">Ibagué</span>
                </div>
              </div>
              <p className={`text-[11px] font-medium hidden sm:block ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Control Peatonal • Reconocimiento Facial
              </p>
            </div>
          </div>

          {/* Navigation Tabs (desktop) */}
          <nav className={`hidden md:flex items-center gap-1.5 p-1 rounded-2xl border transition-all duration-300 ${
            darkMode
              ? 'bg-slate-900/90 border-slate-800/80 shadow-inner'
              : 'bg-slate-100/90 border-slate-200/80 shadow-inner'
          }`}>
            {/* Tab Portal Peatonal — siempre visible */}
            <button
              id="nav-tab-mobile"
              onClick={() => setActiveTab('mobile')}
              className={`relative flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 ${
                activeTab === 'mobile'
                  ? darkMode
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/40'
                    : 'bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md shadow-blue-900/20'
                  : darkMode
                    ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <UserCheck className={`w-4 h-4 ${activeTab === 'mobile' ? 'text-amber-300' : 'text-amber-500'}`} />
              <span>Portal Peatonal</span>
              {activeTab === 'mobile' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-amber-400 rounded-full blur-[1px]" />
              )}
            </button>

            {/* Tab Cámaras / Visión IA — solo admin/security con sesión */}
            {canAccessRestrictedModules && (
              <button
                id="nav-tab-camera"
                onClick={() => setActiveTab('camera')}
                className={`relative flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 ${
                  activeTab === 'camera'
                    ? darkMode
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/40'
                      : 'bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md shadow-blue-900/20'
                    : darkMode
                      ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Camera className={`w-4 h-4 ${activeTab === 'camera' ? 'text-amber-300' : 'text-amber-500'}`} />
                <span>Cámaras / Visión IA</span>
              </button>
            )}

            {/* Tab Enrolamiento (masivo) — solo admin/security con sesión */}
            {canAccessRestrictedModules && (
              <button
                id="nav-tab-enrollment"
                onClick={() => setActiveTab('enrollment')}
                className={`relative flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 ${
                  activeTab === 'enrollment'
                    ? darkMode
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-900/40'
                      : 'bg-gradient-to-r from-cyan-700 to-teal-800 text-white shadow-md shadow-cyan-900/20'
                    : darkMode
                      ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <ScanFace className="w-4 h-4 text-cyan-400" />
                <span>Enrolamiento</span>
              </button>
            )}

            {/* Tab Panel Admin — solo admin/security con sesión */}
            {canAccessRestrictedModules && (
              <button
                id="nav-tab-admin"
                onClick={() => setActiveTab('admin')}
                className={`relative flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 ${
                  activeTab === 'admin'
                    ? darkMode
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/40'
                      : 'bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md shadow-blue-900/20'
                    : darkMode
                      ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 ${activeTab === 'admin' ? 'text-amber-300' : 'text-amber-500'}`} />
                <span>Panel Admin</span>
                {currentUser?.role === 'admin' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                )}
              </button>
            )}
          </nav>

          {/* Right Actions: User Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5">

            {currentUser ? (
              <div className="relative">
                <button
                  id="user-profile-menu-button"
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className={`flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl border transition-all duration-200 shadow-xs active:scale-95 ${
                    darkMode
                      ? 'bg-slate-900/90 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={currentUser.avatarUrl || AVATAR_FALLBACK}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-xl object-cover ring-2 ring-blue-900/80 shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
                  </div>

                  <div className="text-left hidden sm:block">
                    <p className={`text-xs font-extrabold leading-tight truncate max-w-[120px] ${
                      darkMode ? 'text-slate-100' : 'text-slate-800'
                    }`}>
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-slate-500 capitalize flex items-center gap-1 mt-0.5">
                      <span className={`inline-block px-1.5 py-0.2 rounded-md border text-[9px] font-bold ${roleInfo?.bg}`}>
                        {roleInfo?.label}
                      </span>
                    </p>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${
                    showRoleDropdown ? 'rotate-180 text-amber-500' : ''
                  }`} />
                </button>

                {showRoleDropdown && (
                  <div
                    className={`absolute right-0 mt-2 w-72 rounded-2xl border shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl ${
                      darkMode ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-black/50' : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/50'
                    }`}
                    onMouseLeave={() => setShowRoleDropdown(false)}
                  >
                    {/* Info del usuario */}
                    <div className={`px-3.5 py-2.5 border-b text-xs ${
                      darkMode ? 'border-slate-800' : 'border-slate-100'
                    }`}>
                      <p className="font-bold truncate text-sm">{currentUser.name}</p>
                      <p className={`text-[11px] truncate mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{currentUser.email}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[10px] text-amber-500 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          ID: {currentUser.documentId}
                        </span>
                      </div>
                    </div>

                    {/* ══════ Acciones del usuario ══════ */}
                    <div className={`pt-2 border-t space-y-0.5 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                      {/* ✏️ Editar información */}
                      <button
                        onClick={() => {
                          onOpenEditProfile?.();
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs rounded-xl font-bold flex items-center gap-2.5 transition-all ${
                          darkMode
                            ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <UserCog className="w-4 h-4 text-blue-500" />
                        <span>Editar información</span>
                      </button>

                      {/* 📸 Enrolar mi rostro */}
                      {canSelfEnroll && (
                        <button
                          onClick={() => {
                            onOpenSelfEnrollment?.();
                            setShowRoleDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs rounded-xl font-bold flex items-center gap-2.5 transition-all ${
                            needsEnrollment
                              ? darkMode
                                ? 'text-amber-300 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/60'
                                : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                              : darkMode
                                ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <ScanFace className={`w-4 h-4 ${needsEnrollment ? 'text-amber-500' : 'text-cyan-500'}`} />
                          <span className="flex-1">Enrolar mi rostro</span>
                          {needsEnrollment && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          )}
                        </button>
                      )}

                      {/* 🔑 Cambiar contraseña */}
                      <button
                        onClick={() => {
                          onOpenChangePassword?.();
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs rounded-xl font-bold flex items-center gap-2.5 transition-all ${
                          darkMode
                            ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <KeyRound className="w-4 h-4 text-purple-500" />
                        <span>Cambiar contraseña</span>
                      </button>
                    </div>

                    {/* ══════ Tema (modo claro/oscuro) ══════ */}
                    <div className={`pt-2 mt-1 border-t space-y-0.5 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                      <button
                        onClick={() => {
                          onToggleDarkMode();
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs rounded-xl font-bold flex items-center justify-between transition-all ${
                          darkMode
                            ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          {darkMode ? (
                            <>
                              <Sun className="w-4 h-4 text-amber-400" />
                              <span>Modo claro</span>
                            </>
                          ) : (
                            <>
                              <Moon className="w-4 h-4 text-indigo-600" />
                              <span>Modo oscuro</span>
                            </>
                          )}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                          darkMode
                            ? 'bg-slate-950 border-slate-800 text-amber-400'
                            : 'bg-slate-100 border-slate-200 text-blue-900'
                        }`}>
                          {darkMode ? 'Oscuro' : 'Claro'}
                        </span>
                      </button>
                    </div>

                    {/* ══════ Cerrar sesión ══════ */}
                    <div className={`pt-2 mt-1 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                      <button
                        onClick={() => { onLogout(); setShowRoleDropdown(false); }}
                        className="w-full text-left px-3 py-2 text-xs rounded-xl text-rose-500 hover:bg-rose-500/10 font-bold flex items-center gap-2.5 transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="btn-login-header"
                onClick={onOpenAuth}
                className="group relative flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs transition-all duration-200 shadow-md shadow-blue-950/20 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-700" />
                <Sparkles className="w-3.5 h-3.5 text-amber-400 transition-transform duration-300 group-hover:rotate-12" />
                <span>Ingresar / Registro</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile secondary navigation tab row */}
        <div className={`flex md:hidden items-center justify-around py-2 border-t transition-colors ${
          darkMode ? 'border-slate-800/80 bg-slate-950' : 'border-slate-100 bg-white'
        }`}>
          {/* Portal Peatonal — siempre visible */}
          <button
            onClick={() => setActiveTab('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
              activeTab === 'mobile'
                ? darkMode ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-900 text-white shadow-xs'
                : darkMode ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Inicio</span>
          </button>

          {/* Cámara Visión — solo admin/security */}
          {canAccessRestrictedModules && (
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                activeTab === 'camera'
                  ? darkMode ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-900 text-white shadow-xs'
                  : darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Visión</span>
            </button>
          )}

          {/* Enrolamiento masivo — solo admin/security */}
          {canAccessRestrictedModules && (
            <button
              onClick={() => setActiveTab('enrollment')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                activeTab === 'enrollment'
                  ? darkMode ? 'bg-cyan-600 text-white shadow-sm' : 'bg-cyan-700 text-white shadow-xs'
                  : darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              <ScanFace className="w-3.5 h-3.5" />
              <span>Enrolar</span>
            </button>
          )}

          {/* Panel Admin — solo admin/security */}
          {canAccessRestrictedModules && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                activeTab === 'admin'
                  ? darkMode ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-900 text-white shadow-xs'
                  : darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};