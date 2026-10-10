import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Users,
  CheckCircle2,
  Clock,
  RefreshCw,
  Camera,
  ChevronRight,
  Filter,
  UserCheck,
  UserX,
  SkipForward,
  TrendingUp,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  User as UserIcon,
  Calendar,
} from 'lucide-react';
import type { UserProfile, UserRole } from '../types.ts';
import { AVATAR_FALLBACK } from '../lib/api.ts';
import { FaceEnrollment } from './FaceEnrollment.tsx';

interface FaceEnrollmentViewProps {
  users: UserProfile[];
  onRefresh: () => void;
  darkMode?: boolean;
}

type EnrollmentFilter = 'all' | 'pending' | 'enrolled';

// Etiqueta legible por rol
const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  security: 'Vigilancia',
  student: 'Estudiante',
  teacher: 'Docente',
  staff: 'Administrativo',
  visitor: 'Visitante',
};

// Colores por rol (para los chips)
const ROLE_COLORS: Record<UserRole, { light: string; dark: string; icon: any }> = {
  admin: {
    light: 'bg-rose-50 text-rose-700 border-rose-200',
    dark: 'bg-rose-950 text-rose-300 border-rose-800',
    icon: ShieldCheck,
  },
  security: {
    light: 'bg-amber-50 text-amber-700 border-amber-200',
    dark: 'bg-amber-950 text-amber-300 border-amber-800',
    icon: ShieldCheck,
  },
  student: {
    light: 'bg-blue-50 text-blue-700 border-blue-200',
    dark: 'bg-blue-950 text-blue-300 border-blue-800',
    icon: GraduationCap,
  },
  teacher: {
    light: 'bg-purple-50 text-purple-700 border-purple-200',
    dark: 'bg-purple-950 text-purple-300 border-purple-800',
    icon: GraduationCap,
  },
  staff: {
    light: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dark: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    icon: Briefcase,
  },
  visitor: {
    light: 'bg-slate-100 text-slate-700 border-slate-200',
    dark: 'bg-slate-900 text-slate-300 border-slate-700',
    icon: UserIcon,
  },
};

// Formato relativo de fecha ("hace 2 horas", "hace 3 días")
function formatRelativeTime(isoDate: string | undefined): string {
  if (!isoDate) return 'Fecha desconocida';
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return new Date(isoDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  if (days > 0) return `Hace ${days} día${days === 1 ? '' : 's'}`;
  if (hours > 0) return `Hace ${hours} hora${hours === 1 ? '' : 's'}`;
  if (minutes > 0) return `Hace ${minutes} minuto${minutes === 1 ? '' : 's'}`;
  return 'Hace unos segundos';
}

export const FaceEnrollmentView: React.FC<FaceEnrollmentViewProps> = ({
  users,
  onRefresh,
  darkMode = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<EnrollmentFilter>('all');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // 🔍 Filtrar y ordenar usuarios
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return users
      .filter((u) => {
        // Filtro por estado de enrolamiento
        if (filter === 'enrolled' && !u.faceEnrolled) return false;
        if (filter === 'pending' && u.faceEnrolled) return false;

        // Filtro por rol
        if (roleFilter !== 'all' && u.role !== roleFilter) return false;

        // Búsqueda por nombre, cédula o email
        if (!q) return true;
        return (
          (u.name || '').toLowerCase().includes(q) ||
          (u.documentId || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.faceEnrolled === b.faceEnrolled) {
          return a.name.localeCompare(b.name, 'es');
        }
        return a.faceEnrolled ? 1 : -1;
      });
  }, [users, searchQuery, filter, roleFilter]);

  // Usuario seleccionado
  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId]
  );

  // 📊 Contadores y estadísticas
  const stats = useMemo(() => {
    const total = users.length;
    const enrolled = users.filter((u) => u.faceEnrolled).length;
    const pending = total - enrolled;
    const percentage = total > 0 ? Math.round((enrolled / total) * 100) : 0;
    return { total, enrolled, pending, percentage };
  }, [users]);

  // 🕒 Último usuario enrolado (con fecha)
  const lastEnrolledUser = useMemo(() => {
    const enrolledUsers = users.filter((u) => u.faceEnrolled && u.lastEnrollmentAt);
    if (enrolledUsers.length === 0) return null;
    return enrolledUsers.sort((a, b) => {
      const dateA = new Date(a.lastEnrollmentAt || 0).getTime();
      const dateB = new Date(b.lastEnrollmentAt || 0).getTime();
      return dateB - dateA;
    })[0];
  }, [users]);

  // 🎯 Siguiente pendiente (para el botón)
  const nextPendingUser = useMemo(() => {
    // Primero busca después del usuario actualmente seleccionado
    if (selectedUser) {
      const currentIndex = filteredUsers.findIndex((u) => u.id === selectedUser.id);
      if (currentIndex !== -1) {
        // Busca el siguiente pendiente después del índice actual
        for (let i = currentIndex + 1; i < filteredUsers.length; i++) {
          if (!filteredUsers[i].faceEnrolled) return filteredUsers[i];
        }
        // Si no hay después, busca desde el principio
        for (let i = 0; i < currentIndex; i++) {
          if (!filteredUsers[i].faceEnrolled) return filteredUsers[i];
        }
      }
    }
    // Si no hay seleccionado, devuelve el primer pendiente
    return filteredUsers.find((u) => !u.faceEnrolled) || null;
  }, [filteredUsers, selectedUser]);

  // Si el usuario seleccionado ya no existe, resetear
  useEffect(() => {
    if (selectedUserId && !users.find((u) => u.id === selectedUserId)) {
      setSelectedUserId(null);
    }
  }, [users, selectedUserId]);

  const handleEnrollmentSuccess = () => {
    onRefresh();
  };

  const handleNextPending = () => {
    if (nextPendingUser) {
      setSelectedUserId(nextPendingUser.id);
    }
  };

  // Cuenta usuarios por rol (para mostrar badges)
  const roleCounts = useMemo(() => {
    const counts: Record<UserRole | 'all', number> = {
      all: users.length,
      admin: 0,
      security: 0,
      student: 0,
      teacher: 0,
      staff: 0,
      visitor: 0,
    };
    users.forEach((u) => {
      counts[u.role] = (counts[u.role] || 0) + 1;
    });
    return counts;
  }, [users]);

  return (
    <div className="w-full max-w-7xl mx-auto py-6 lg:py-10 animate-in fade-in duration-200 space-y-8">

      {/* ═══════════════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-4 lg:gap-5 mb-8">
          <div
            className={`w-16 h-16 lg:w-20 lg:h-20 rounded-3xl flex items-center justify-center border-2 ${
              darkMode
                ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                : 'bg-cyan-50 text-cyan-700 border-cyan-200'
            }`}
          >
            <Camera className="w-8 h-8 lg:w-10 lg:h-10" />
          </div>
          <div>
            <h1
              className={`text-3xl lg:text-5xl font-black tracking-tight ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              Enrolamiento Facial
            </h1>
            <p
              className={`text-sm lg:text-lg mt-1 ${
                darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Registra el rostro de las personas para habilitar el acceso sin contacto en los torniquetes.
            </p>
          </div>
        </div>

        {/* 📊 Contadores + Barra de progreso */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Total */}
          <div
            className={`p-5 lg:p-7 rounded-2xl border transition-colors ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              <p
                className={`text-[11px] lg:text-sm font-black uppercase tracking-wider ${
                  darkMode ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Total
              </p>
            </div>
            <p
              className={`text-4xl lg:text-5xl font-black ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              {stats.total}
            </p>
          </div>

          {/* Enrolados */}
          <div
            className={`p-5 lg:p-7 rounded-2xl border transition-colors ${
              darkMode ? 'bg-emerald-950/40 border-emerald-800' : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <p
                className={`text-[11px] lg:text-sm font-black uppercase tracking-wider ${
                  darkMode ? 'text-emerald-400' : 'text-emerald-700'
                }`}
              >
                Enrolados
              </p>
            </div>
            <p className="text-4xl lg:text-5xl font-black text-emerald-500">
              {stats.enrolled}
            </p>
          </div>

          {/* Pendientes */}
          <div
            className={`p-5 lg:p-7 rounded-2xl border transition-colors ${
              darkMode ? 'bg-amber-950/40 border-amber-800' : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <p
                className={`text-[11px] lg:text-sm font-black uppercase tracking-wider ${
                  darkMode ? 'text-amber-400' : 'text-amber-700'
                }`}
              >
                Pendientes
              </p>
            </div>
            <p className="text-4xl lg:text-5xl font-black text-amber-500">
              {stats.pending}
            </p>
          </div>

          {/* ⭐ NUEVO: Barra de progreso */}
          <div
            className={`p-5 lg:p-7 rounded-2xl border transition-colors ${
              darkMode ? 'bg-cyan-950/40 border-cyan-800' : 'bg-cyan-50 border-cyan-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-cyan-500" />
              <p
                className={`text-[11px] lg:text-sm font-black uppercase tracking-wider ${
                  darkMode ? 'text-cyan-400' : 'text-cyan-700'
                }`}
              >
                Progreso
              </p>
            </div>
            <p className="text-4xl lg:text-5xl font-black text-cyan-500">
              {stats.percentage}%
            </p>
            {/* Barra visual */}
            <div
              className={`mt-3 h-2.5 rounded-full overflow-hidden ${
                darkMode ? 'bg-slate-800' : 'bg-cyan-100'
              }`}
            >
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          LAYOUT 2 COLUMNAS: Selector | Cámara
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

        {/* ─────── COLUMNA IZQUIERDA: Selector de usuarios ─────── */}
        <div className="lg:col-span-5">
          <div
            className={`rounded-3xl border shadow-lg backdrop-blur-sm overflow-hidden ${
              darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
            }`}
          >
            {/* Header del selector */}
            <div className={`p-6 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-5">
                <Users className={`w-5 h-5 ${darkMode ? 'text-cyan-400' : 'text-blue-900'}`} />
                <h2
                  className={`text-base font-black uppercase tracking-wider ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Selecciona a la persona
                </h2>
              </div>

              {/* Buscador */}
              <div className="relative mb-4">
                <Search className="w-4 h-4 lg:w-5 lg:h-5 absolute left-4 top-3.5 lg:top-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, cédula o email..."
                  className={`w-full pl-11 lg:pl-12 pr-4 py-3 lg:py-3.5 rounded-xl border text-sm lg:text-base focus:outline-hidden transition-colors ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-cyan-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                  }`}
                />
              </div>

              {/* Filtros por estado de enrolamiento */}
              <div
                className={`flex items-center gap-1 p-1.5 rounded-xl border mb-3 ${
                  darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 py-2.5 rounded-lg text-xs lg:text-sm font-black transition-all flex items-center justify-center gap-2 ${
                    filter === 'all'
                      ? darkMode
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-blue-900 text-white shadow-xs'
                      : darkMode
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  Todos
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={`flex-1 py-2.5 rounded-lg text-xs lg:text-sm font-black transition-all flex items-center justify-center gap-2 ${
                    filter === 'pending'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : darkMode
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  Pendientes
                </button>
                <button
                  onClick={() => setFilter('enrolled')}
                  className={`flex-1 py-2.5 rounded-lg text-xs lg:text-sm font-black transition-all flex items-center justify-center gap-2 ${
                    filter === 'enrolled'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : darkMode
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  Enrolados
                </button>
              </div>

              {/* ⭐ NUEVO: Filtros por rol (chips con scroll horizontal) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {/* Chip "Todos los roles" */}
                <button
                  onClick={() => setRoleFilter('all')}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition-all ${
                    roleFilter === 'all'
                      ? darkMode
                        ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                        : 'bg-cyan-700 text-white border-cyan-600 shadow-sm'
                      : darkMode
                        ? 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Users className="w-3 h-3" />
                  Todos ({roleCounts.all})
                </button>

                {/* Chips por rol */}
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => {
                  const count = roleCounts[role] || 0;
                  if (count === 0) return null; // Ocultar roles sin usuarios
                  const Icon = ROLE_COLORS[role].icon;
                  const isActive = roleFilter === role;
                  return (
                    <button
                      key={role}
                      onClick={() => setRoleFilter(isActive ? 'all' : role)}
                      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition-all ${
                        isActive
                          ? darkMode
                            ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                            : 'bg-cyan-700 text-white border-cyan-600 shadow-sm'
                          : darkMode
                            ? `${ROLE_COLORS[role].dark} hover:opacity-80`
                            : `${ROLE_COLORS[role].light} hover:opacity-80`
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {ROLE_LABELS[role]} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista de usuarios */}
            <div className="max-h-[700px] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className={`p-12 text-center ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-base font-bold">
                    {searchQuery
                      ? `Sin resultados para "${searchQuery}"`
                      : 'No hay usuarios con este filtro'}
                  </p>
                </div>
              ) : (
                <div className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {filteredUsers.map((u) => {
                    const isSelected = selectedUserId === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUserId(u.id)}
                        className={`w-full text-left p-5 transition-colors group flex items-center gap-4 ${
                          isSelected
                            ? darkMode
                              ? 'bg-cyan-950/40 border-l-4 border-cyan-500'
                              : 'bg-cyan-50 border-l-4 border-cyan-500'
                            : darkMode
                              ? 'hover:bg-slate-800/50 border-l-4 border-transparent'
                              : 'hover:bg-slate-50 border-l-4 border-transparent'
                        }`}
                      >
                        {/* Foto */}
                        <img
                          src={u.avatarUrl || AVATAR_FALLBACK}
                          alt={u.name}
                          className={`w-14 h-14 rounded-2xl object-cover shrink-0 border-2 ${
                            u.faceEnrolled
                              ? 'border-emerald-500'
                              : darkMode
                                ? 'border-slate-700'
                                : 'border-slate-300'
                          }`}
                        />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-base font-black truncate ${
                              darkMode ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {u.name}
                          </p>
                          <p
                            className={`text-xs font-mono truncate ${
                              darkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            CC: {u.documentId}
                          </p>
                          <p
                            className={`text-[11px] font-bold uppercase truncate ${
                              darkMode ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            {ROLE_LABELS[u.role] || u.role}
                          </p>
                        </div>

                        {/* Estado */}
                        <div className="shrink-0 flex items-center gap-2">
                          {u.faceEnrolled ? (
                            <span
                              className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 rounded-full border ${
                                darkMode
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              OK
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 rounded-full border ${
                                darkMode
                                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              Sin enrolar
                            </span>
                          )}
                          <ChevronRight
                            className={`w-5 h-5 transition-transform group-hover:translate-x-0.5 ${
                              isSelected
                                ? 'text-cyan-500'
                                : darkMode
                                  ? 'text-slate-600'
                                  : 'text-slate-400'
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ⭐ NUEVO: Botón "Enrolar siguiente" debajo de la lista */}
            {nextPendingUser && (
              <div className={`p-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  onClick={handleNextPending}
                  className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-black text-sm transition-all shadow-md active:scale-[0.98] ${
                    darkMode
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      : 'bg-cyan-700 hover:bg-cyan-800 text-white'
                  }`}
                >
                  <SkipForward className="w-4 h-4" />
                  Enrolar siguiente: {nextPendingUser.name.split(' ')[0]}
                  <ChevronRight className="w-4 h-4" />
                </button>
                <p className={`text-[10px] text-center mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {stats.pending} usuario{stats.pending === 1 ? '' : 's'} pendiente{stats.pending === 1 ? '' : 's'} en total
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ─────── COLUMNA DERECHA: Panel de cámara ─────── */}
        <div className="lg:col-span-7">
          {!selectedUser ? (
            /* Estado vacío */
            <div
              className={`rounded-3xl border-2 border-dashed p-16 lg:p-20 text-center backdrop-blur-sm flex items-center justify-center min-h-[600px] ${
                darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white/50 border-slate-300'
              }`}
            >
              <div>
                <div
                  className={`w-24 h-24 lg:w-28 lg:h-28 rounded-3xl mx-auto mb-6 flex items-center justify-center border-2 ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-600'
                      : 'bg-slate-100 border-slate-300 text-slate-400'
                  }`}
                >
                  <Camera className="w-12 h-12 lg:w-14 lg:h-14" />
                </div>
                <h3
                  className={`text-xl lg:text-2xl font-black mb-3 ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Selecciona una persona
                </h3>
                <p
                  className={`text-sm lg:text-base max-w-md mx-auto ${
                    darkMode ? 'text-slate-500' : 'text-slate-500'
                  }`}
                >
                  Elige un usuario de la lista de la izquierda para comenzar el enrolamiento facial.
                  Podrás capturar entre 3 y 5 fotos de su rostro.
                </p>
              </div>
            </div>
          ) : (
            /* Panel de enrolamiento */
            <div className="space-y-4">
              {/* Header del usuario seleccionado */}
              <div
                className={`p-6 rounded-3xl border shadow-lg backdrop-blur-sm ${
                  darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-5">
                  <img
                    src={selectedUser.avatarUrl || AVATAR_FALLBACK}
                    alt={selectedUser.name}
                    className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl object-cover border-2 border-cyan-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={`text-lg lg:text-xl font-black truncate ${
                          darkMode ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {selectedUser.name}
                      </h3>
                      {selectedUser.faceEnrolled ? (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                            darkMode
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          <UserCheck className="w-3 h-3" />
                          Enrolado
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                            darkMode
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          <UserX className="w-3 h-3" />
                          Sin enrolar
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm font-mono ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      CC: {selectedUser.documentId}
                    </p>
                    <p
                      className={`text-xs font-bold uppercase ${
                        darkMode ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {ROLE_LABELS[selectedUser.role] || selectedUser.role}
                      {selectedUser.facultyOrDept && ` · ${selectedUser.facultyOrDept}`}
                    </p>
                  </div>
                </div>

                {/* ⭐ NUEVO: Último enrolamiento (dentro del header del usuario) */}
                {selectedUser.faceEnrolled && selectedUser.lastEnrollmentAt && (
                  <div
                    className={`mt-4 p-3 rounded-xl border flex items-center gap-3 ${
                      darkMode
                        ? 'bg-emerald-950/30 border-emerald-800'
                        : 'bg-emerald-50/60 border-emerald-200'
                    }`}
                  >
                    <div
                      className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                        darkMode
                          ? 'bg-emerald-950 text-emerald-400'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[10px] font-black uppercase tracking-wider ${
                          darkMode ? 'text-emerald-400' : 'text-emerald-700'
                        }`}
                      >
                        Último enrolamiento
                      </p>
                      <p
                        className={`text-xs font-bold ${
                          darkMode ? 'text-emerald-200' : 'text-emerald-800'
                        }`}
                      >
                        {formatRelativeTime(selectedUser.lastEnrollmentAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ⭐ NUEVO: Panel lateral con "Último enrolamiento global" */}
              {lastEnrolledUser && (
                <div
                  className={`p-4 rounded-2xl border shadow-sm backdrop-blur-sm flex items-center gap-4 ${
                    darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
                  }`}
                >
                  <div
                    className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                      darkMode
                        ? 'bg-cyan-950 text-cyan-400'
                        : 'bg-cyan-50 text-cyan-700'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${
                        darkMode ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      Último enrolamiento global
                    </p>
                    <div className="flex items-center gap-2">
                      <img
                        src={lastEnrolledUser.avatarUrl || AVATAR_FALLBACK}
                        alt={lastEnrolledUser.name}
                        className="w-6 h-6 rounded-full object-cover border border-cyan-500"
                      />
                      <p
                        className={`text-sm font-bold truncate ${
                          darkMode ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {lastEnrolledUser.name}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-[10px] font-mono ${
                        darkMode ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {formatRelativeTime(lastEnrolledUser.lastEnrollmentAt)}
                    </p>
                  </div>
                </div>
              )}

              {/* Componente FaceEnrollment existente */}
              <div
                className={`rounded-3xl border shadow-lg backdrop-blur-sm overflow-hidden ${
                  darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
                }`}
              >
                <FaceEnrollment
                  userId={selectedUser.id}
                  darkMode={darkMode}
                  onEnrollmentComplete={handleEnrollmentSuccess}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};