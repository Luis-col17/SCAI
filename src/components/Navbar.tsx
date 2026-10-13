import React from 'react';
import {
  Smartphone,
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
}) => {
  const [showRoleDropdown, setShowRoleDropdown] = React.useState(false);

  // 🎨 Logo SCAI Horizon: se adapta al modo claro/oscuro automáticamente
  const logoUrl = darkMode ? '/img/logooscuro.png' : '/img/logoclaro.png';

  // 🔒 ¿Puede este usuario ver los módulos restringidos?
  // Solo admin y security ven "Cámaras / Visión IA", "Enrolamiento" y "Panel Admin".
  const canAccessRestrictedModules =
    !!currentUser && (currentUser.role === 'admin' || currentUser.role === 'security');

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Administrador',
          bg: darkMode ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-rose-100 text-rose-800 border-rose-200'
        };
      case 'security':
        return {
          label: 'Vigilancia',
          bg: darkMode ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-amber-100 text-amber-800 border-amber-300'
        };
      case 'student':
        return {
          label: 'Estudiante',
          bg: darkMode ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'teacher':
        return {
          label: 'Docente',
          bg: darkMode ? 'bg-purple-950 text-purple-300 border-purple-800' : 'bg-purple-100 text-purple-800 border-purple-200'
        };
      case 'staff':
        return {
          label: 'Administrativo',
          bg: darkMode ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
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
    <header className={`sticky top-0 z-40 w-full border-b transition-colors duration-200 backdrop-blur-md ${
      darkMode
        ? 'bg-slate-950/90 border-slate-800 text-slate-100'
        : 'bg-white/95 border-slate-200 text-slate-800 shadow-xs'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* 🎨 Logo SCAI Horizon + Identidad institucional */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src={logoUrl}
              alt="SCAI Horizon"
              className="h-12 w-12 object-contain shrink-0 drop-shadow-[0_4px_12px_rgba(6,182,212,0.35)] transition-transform duration-300 hover:scale-105"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-black tracking-tight text-base sm:text-lg ${
                  darkMode ? 'text-white' : 'text-blue-950'
                }`}>
                  UNIMINUTO
                </span>
                <div
                  id="brand-sede-badge"
                  className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-black leading-tight text-center border border-amber-600 shadow-xs shrink-0 select-none"
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
          <nav className={`hidden md:flex items-center gap-1.5 p-1 rounded-xl border ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-slate-100 border-slate-200'
          }`}>
            {/* Tab App Móvil / Portal — siempre visible */}
            <button
              id="nav-tab-mobile"
              onClick={() => setActiveTab('mobile')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'mobile'
                  ? darkMode ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-900 text-white shadow-xs'
                  : darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>App Móvil</span>
            </button>

            {/* Tab Cámaras / Visión IA — solo admin/security con sesión */}
            {canAccessRestrictedModules && (
              <button
                id="nav-tab-camera"
                onClick={() => setActiveTab('camera')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'camera'
                    ? darkMode ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-900 text-white shadow-xs'
                    : darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Camera className="w-4 h-4 text-amber-400" />
                <span>Cámaras / Visión IA</span>
              </button>
            )}

            {/* Tab Enrolamiento — solo admin/security con sesión */}
            {canAccessRestrictedModules && (
              <button
                id="nav-tab-enrollment"
                onClick={() => setActiveTab('enrollment')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'enrollment'
                    ? darkMode ? 'bg-cyan-600 text-white shadow-sm' : 'bg-cyan-700 text-white shadow-xs'
                    : darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <ScanFace className="w-4 h-4 text-cyan-300" />
                <span>Enrolamiento</span>
              </button>
            )}

            {/* Tab Panel Admin — solo admin/security con sesión */}
            {canAccessRestrictedModules && (
              <button
                id="nav-tab-admin"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'admin'
                    ? darkMode ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-900 text-white shadow-xs'
                    : darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-amber-400" />
                <span>Panel Admin</span>
                {currentUser?.role === 'admin' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
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
                  className={`flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-colors shadow-xs ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800 hover:bg-slate-800'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <img
                    src={currentUser.avatarUrl || AVATAR_FALLBACK}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-lg object-cover ring-2 ring-blue-900"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-left hidden sm:block">
                    <p className={`text-xs font-bold leading-tight truncate max-w-[110px] ${
                      darkMode ? 'text-slate-100' : 'text-slate-800'
                    }`}>
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-slate-500 capitalize flex items-center gap-1 mt-0.5">
                      <span className={`inline-block px-1.5 py-0.2 rounded border text-[9px] font-bold ${roleInfo?.bg}`}>
                        {roleInfo?.label}
                      </span>
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {showRoleDropdown && (
                  <div
                    className={`absolute right-0 mt-2 w-72 rounded-2xl border shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                    onMouseLeave={() => setShowRoleDropdown(false)}
                  >
                    {/* Info del usuario */}
                    <div className={`px-3 py-2 border-b text-xs ${
                      darkMode ? 'border-slate-800' : 'border-slate-100'
                    }`}>
                      <p className="font-bold truncate">{currentUser.name}</p>
                      <p className={`text-[11px] truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{currentUser.email}</p>
                      <p className="text-[10px] text-amber-500 font-mono font-semibold mt-1">C.C./Carné: {currentUser.documentId}</p>
                    </div>

                    {/* ══════ Acciones del usuario ══════ */}
                    <div className={`pt-2 border-t space-y-0.5 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                      {/* ✏️ Editar información */}
                      <button
                        onClick={() => {
                          onOpenEditProfile?.();
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs rounded-xl font-bold flex items-center gap-2.5 transition-colors ${
                          darkMode
                            ? 'text-slate-300 hover:bg-slate-800'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <UserCog className="w-3.5 h-3.5" />
                        <span>Editar información</span>
                      </button>

                      {/* 🔑 Cambiar contraseña */}
                      <button
                        onClick={() => {
                          onOpenChangePassword?.();
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs rounded-xl font-bold flex items-center gap-2.5 transition-colors ${
                          darkMode
                            ? 'text-slate-300 hover:bg-slate-800'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
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
                        className={`w-full text-left px-3 py-2 text-xs rounded-xl font-bold flex items-center justify-between transition-colors ${
                          darkMode
                            ? 'text-slate-300 hover:bg-slate-800'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          {darkMode ? (
                            <>
                              <Sun className="w-3.5 h-3.5 text-amber-400" />
                              <span>Cambiar a modo claro</span>
                            </>
                          ) : (
                            <>
                              <Moon className="w-3.5 h-3.5 text-blue-900" />
                              <span>Cambiar a modo oscuro</span>
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
                        className="w-full text-left px-3 py-2 text-xs rounded-xl text-rose-500 hover:bg-rose-500/10 font-bold flex items-center gap-2.5 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
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
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs transition-colors shadow-sm"
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Ingresar / Registro</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile secondary navigation tab row */}
        <div className={`flex md:hidden items-center justify-around py-2 border-t ${
          darkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-white'
        }`}>
          {/* App Móvil — siempre visible */}
          <button
            onClick={() => setActiveTab('mobile')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              activeTab === 'mobile'
                ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-900 text-white'
                : darkMode ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Móvil</span>
          </button>

          {/* Cámara Visión — solo admin/security */}
          {canAccessRestrictedModules && (
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeTab === 'camera'
                  ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-900 text-white'
                  : darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>VisIón</span>
            </button>
          )}

          {/* Enrolamiento — solo admin/security */}
          {canAccessRestrictedModules && (
            <button
              onClick={() => setActiveTab('enrollment')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeTab === 'enrollment'
                  ? darkMode ? 'bg-cyan-600 text-white' : 'bg-cyan-700 text-white'
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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeTab === 'admin'
                  ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-900 text-white'
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