import React, { useState, useEffect } from 'react';
import {
  IdCard,
  History,
  CheckCircle2,
  QrCode,
  RefreshCw,
  LogIn,
  LogOut,
  Camera,
  Check,
  Clock,
  Trash2,
  Search,
  MapPin,
  Mail,
  GraduationCap,
  Users,
  TrendingUp,
  Building2,
  Shield,
  AlertCircle,
  User as UserIcon,
  Sparkles,
  Flame,
  Award,
  Zap,
  Activity,
} from 'lucide-react';
import type { UserProfile, AccessLog, UserRole } from '../types';
import { getStoredToken, AVATAR_FALLBACK } from '../lib/api';

const ENABLE_SEARCH_LOCATION = false;

interface WebAppViewProps {
  currentUser: UserProfile;
  onRefresh: () => void;
  onUserUpdated?: (user: UserProfile) => void;
  darkMode?: boolean;
}

type SearchResult = {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  documentId: string;
  avatarUrl?: string;
  facultyOrDept?: string;
  status: string;
  inferredStatus: 'inside' | 'outside' | 'unknown';
  lastLocation: string | null;
  lastTimestamp: string | null;
  lastDirection: 'entry' | 'exit' | null;
};

const roleLabel: Record<UserRole, string> = {
  admin: 'Administrador',
  security: 'Vigilancia',
  student: 'Estudiante',
  teacher: 'Docente',
  staff: 'Administrativo',
  visitor: 'Visitante',
};

export const WebAppView: React.FC<WebAppViewProps> = ({
  currentUser,
  onRefresh,
  onUserUpdated,
  darkMode = false,
}) => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterDirection, setFilterDirection] = useState<'all' | 'entry' | 'exit'>('all');

  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(currentUser.avatarUrl);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    setAvatarUrl(currentUser.avatarUrl);
  }, [currentUser.id, currentUser.avatarUrl]);

  const authHeaders = (): Record<string, string> => {
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadUserData = async () => {
    setLoading(true);
    try {
      const logsRes = await fetch(`/api/access-logs?userId=${currentUser.id}`, {
        headers: authHeaders(),
      });
      if (logsRes.ok) {
        setLogs(await logsRes.json());
      }
    } catch (err) {
      console.error('Error cargando historial:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [currentUser.id]);

  useEffect(() => {
    if (!ENABLE_SEARCH_LOCATION) return;

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      setSearchError(null);
      return;
    }

    const handle = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(
          `/api/users/search-location?q=${encodeURIComponent(searchQuery.trim())}`,
          { headers: authHeaders() }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error en la búsqueda');
        setSearchResults(data.results || []);
        setHasSearched(true);
      } catch (err: any) {
        setSearchError(err.message || 'Error de red');
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(handle);
  }, [searchQuery]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const logsThisMonth = logs.filter((l) => new Date(l.timestamp) >= monthStart);
  const logsToday = logs.filter((l) => new Date(l.timestamp) >= todayStart);
  const lastLog = logs[0];
  const isInside = lastLog?.direction === 'entry' && lastLog?.status === 'authorized';

  const entryLogs = logs
    .filter((l) => l.direction === 'entry' && l.status === 'authorized')
    .slice(0, 30);

  let avgEntryHour = '—';
  if (entryLogs.length > 0) {
    const totalMinutes = entryLogs.reduce((acc, l) => {
      const d = new Date(l.timestamp);
      return acc + d.getHours() * 60 + d.getMinutes();
    }, 0);
    const avgMinutes = Math.round(totalMinutes / entryLogs.length);
    const h = Math.floor(avgMinutes / 60);
    const m = avgMinutes % 60;
    avgEntryHour = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const uniqueDays = Array.from(
    new Set(
      logs
        .filter((l) => l.direction === 'entry' && l.status === 'authorized')
        .map((l) => new Date(l.timestamp).toDateString())
    )
  ).sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < uniqueDays.length; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    if (uniqueDays.includes(checkDate.toDateString())) {
      streak++;
    } else {
      break;
    }
  }

  const filteredLogs = logs.filter((l) => {
    if (filterDirection === 'all') return true;
    return l.direction === filterDirection;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 px-2 sm:px-4 animate-fade-in">
      {/* ================== TARJETAS KPI ================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Accesos del mes */}
        <div
          className={`relative group overflow-hidden p-5 rounded-2xl border transition-all hover:-translate-y-1 ${
            darkMode
              ? 'bg-slate-900/90 border-slate-800 shadow-lg shadow-blue-950/20'
              : 'bg-white/90 backdrop-blur-md border-slate-200/80 shadow-sm hover:shadow-md'
          }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[11px] font-black uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Accesos este mes
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${darkMode ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'bg-blue-50 text-blue-900 border border-blue-100'}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {logsThisMonth.length}
            </p>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">eventos</span>
          </div>
          <p className={`text-[11px] mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Bitácora mensual registrada
          </p>
        </div>

        {/* KPI 2: Accesos de hoy */}
        <div
          className={`relative group overflow-hidden p-5 rounded-2xl border transition-all hover:-translate-y-1 ${
            darkMode
              ? 'bg-slate-900/90 border-slate-800 shadow-lg shadow-amber-950/20'
              : 'bg-white/90 backdrop-blur-md border-slate-200/80 shadow-sm hover:shadow-md'
          }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[11px] font-black uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Accesos de hoy
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${darkMode ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {logsToday.length}
            </p>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">eventos</span>
          </div>
          <p className={`text-[11px] mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {logsToday.length === 0 ? 'Sin registros hoy' : 'Movimientos activos hoy'}
          </p>
        </div>

        {/* KPI 3: Estado actual */}
        <div
          className={`relative group overflow-hidden p-5 rounded-2xl border transition-all hover:-translate-y-1 ${
            darkMode
              ? 'bg-slate-900/90 border-slate-800 shadow-lg'
              : 'bg-white/90 backdrop-blur-md border-slate-200/80 shadow-sm hover:shadow-md'
          }`}
        >
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-xl transition-all ${isInside ? 'bg-emerald-500/15 group-hover:bg-emerald-500/25' : 'bg-slate-500/10'}`} />
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[11px] font-black uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Ubicación Actual
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
              isInside
                ? darkMode
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : darkMode
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-slate-100 text-slate-500'
            }`}>
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isInside ? 'bg-emerald-400' : 'bg-slate-400'}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isInside ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            </span>
            <p className={`text-2xl font-black tracking-tight ${isInside ? 'text-emerald-600 dark:text-emerald-400' : darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              {isInside ? 'En Campus' : 'Fuera'}
            </p>
          </div>
          <p className={`text-[11px] mt-1 font-medium truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {lastLog
              ? `Último: ${new Date(lastLog.timestamp).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}`
              : 'Sin registros'}
          </p>
        </div>

        {/* KPI 4: Biometría */}
        <div
          className={`relative group overflow-hidden p-5 rounded-2xl border transition-all hover:-translate-y-1 ${
            darkMode
              ? 'bg-slate-900/90 border-slate-800 shadow-lg shadow-violet-950/20'
              : 'bg-white/90 backdrop-blur-md border-slate-200/80 shadow-sm hover:shadow-md'
          }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-xl group-hover:bg-violet-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[11px] font-black uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Biometría Facial IA
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${darkMode ? 'bg-violet-950 text-violet-400 border border-violet-800' : 'bg-violet-50 text-violet-700 border border-violet-100'}`}>
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {currentUser.faceEnrolled ? 'Activa' : 'Pendiente'}
          </p>
          <p className={`text-[11px] mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {currentUser.faceEnrolled
              ? 'Acceso sin contacto habilitado'
              : 'Enrola tu rostro para ingreso directo'}
          </p>
        </div>
      </div>

      {/* ================== CARNÉ HOLOGRÁFICO + ESTADÍSTICAS ================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CARNÉ DIGITAL TIPO CREDENCIAL */}
        <div
          className={`lg:col-span-2 rounded-3xl border shadow-lg transition-all overflow-hidden flex flex-col justify-between relative ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          {/* Encabezado Institucional Uniminuto */}
          <div className="relative bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 px-6 py-4 flex items-center justify-between text-white overflow-hidden shadow-inner">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center shadow-xs">
                <GraduationCap className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-amber-300">
                  UNIMINUTO · Ibagué
                </h4>
                <p className="text-[10px] text-blue-200 font-semibold tracking-wider uppercase">Carné Institucional Digital</p>
              </div>
            </div>

            <div className="flex items-center gap-2 relative z-10">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Sync
              </span>
            </div>
          </div>

          {/* Cuerpo del Carné */}
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              
              {/* Foto de Perfil - Solo visual, viene del enrolamiento facial */}
              <div className="shrink-0 flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-blue-600 rounded-2xl blur-xl opacity-60" />
                  <img
                    src={avatarUrl || AVATAR_FALLBACK}
                    alt={currentUser.name}
                    className="w-36 h-44 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-md relative z-10"
                  />
                </div>
              </div>

              {/* Información Personal */}
              <div className="flex-1 space-y-4 text-center sm:text-left w-full">
                <div>
                  <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {currentUser.name}
                  </h2>
                  <p className={`text-sm font-mono font-bold mt-1 flex items-center justify-center sm:justify-start gap-1.5 ${darkMode ? 'text-amber-400' : 'text-blue-900'}`}>
                    <IdCard className="w-4 h-4" /> CC: {currentUser.documentId}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-black uppercase px-3 py-1 rounded-xl border ${
                    darkMode
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                      : 'bg-amber-50 text-amber-900 border-amber-300'
                  }`}>
                    <UserIcon className="w-3.5 h-3.5" />
                    {roleLabel[currentUser.role] || currentUser.role}
                  </span>

                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl border ${
                    darkMode
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Activo
                  </span>
                </div>

                <div className={`pt-3 border-t space-y-2 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <p className={`flex items-center justify-center sm:justify-start gap-2 text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <GraduationCap className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{currentUser.facultyOrDept || 'Comunidad Universitaria'}</span>
                  </p>
                  <p className={`flex items-center justify-center sm:justify-start gap-2 text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{currentUser.email}</span>
                  </p>
                </div>

                {/* Contenedor QR y Chip RFID */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 mt-2 ${
                  darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white rounded-xl shadow-xs border border-slate-200">
                      <QrCode className="w-7 h-7 text-blue-950" />
                    </div>
                    <div>
                      <span className={`text-[10px] font-extrabold uppercase tracking-widest block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Pase Peatonal QR
                      </span>
                      <span className={`text-sm sm:text-base font-mono font-black ${darkMode ? 'text-amber-300' : 'text-blue-950'}`}>
                        UNI-{currentUser.documentId.slice(-6)}
                      </span>
                    </div>
                  </div>

                  {/* Chip NFC */}
                  <div className="hidden sm:flex items-center gap-1.5 bg-gradient-to-br from-amber-200 to-amber-400 p-2 rounded-lg border border-amber-500/40 shadow-xs">
                    <Zap className="w-4 h-4 text-amber-900" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-950">NFC Ready</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* MI ACTIVIDAD */}
        <div
          className={`p-6 rounded-3xl border shadow-lg flex flex-col justify-between ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" />
                <h3 className={`text-xs font-black uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Mi Actividad
                </h3>
              </div>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>

            <div className="space-y-4">
              {/* Hora Promedio */}
              <div className={`p-4 rounded-2xl border transition-all ${
                darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-100'
              }`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Promedio de Entrada
                </p>
                <p className={`text-3xl font-black ${darkMode ? 'text-amber-300' : 'text-blue-950'}`}>
                  {avgEntryHour}
                </p>
                <p className={`text-[10px] font-semibold mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Basado en las últimas {entryLogs.length} asistencias
                </p>
              </div>

              {/* Racha */}
              <div className={`p-4 rounded-2xl border transition-all ${
                darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="flex items-center justify-between">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Racha de Asistencia
                  </p>
                  <Flame className="w-5 h-5 text-amber-500 animate-bounce" />
                </div>
                <p className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {streak} {streak === 1 ? 'Día' : 'Días'}
                </p>
                <p className={`text-[10px] font-semibold mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Días consecutivos ingresando
                </p>
              </div>

              {/* Última ubicación */}
              <div className={`p-4 rounded-2xl border transition-all ${
                darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-100'
              }`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Última Ubicación
                </p>
                {lastLog ? (
                  <>
                    <p className={`flex items-center gap-1.5 text-xs font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      {lastLog.entryPoint}
                    </p>
                    <p className={`text-[10px] font-medium mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {new Date(lastLog.timestamp).toLocaleString('es-CO', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </>
                ) : (
                  <p className={`text-xs italic ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Sin accesos registrados
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================== HISTORIAL DE ACCESOS ================== */}
      <div
        className={`p-6 rounded-3xl border shadow-lg transition-colors ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${darkMode ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'bg-blue-50 text-blue-900 border border-blue-100'}`}>
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-sm font-black uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Historial de Accesos
              </h3>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Sincronización en tiempo real mediante visión por computadora
              </p>
            </div>
            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
              darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
            }`}>
              {filteredLogs.length}
            </span>
          </div>

          {/* Filtro de entradas/salidas */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border text-xs font-bold ${
            darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setFilterDirection('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterDirection === 'all'
                  ? darkMode
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-900 text-white shadow-xs'
                  : darkMode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterDirection('entry')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterDirection === 'entry'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : darkMode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setFilterDirection('exit')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterDirection === 'exit'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : darkMode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Salidas
            </button>
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500 flex flex-col items-center gap-3">
            <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
            <span className="font-medium">Cargando registros...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className={`py-12 text-center rounded-2xl border-2 border-dashed p-8 space-y-2 ${
            darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/60 border-slate-200'
          }`}>
            <History className="w-8 h-8 text-slate-400 mx-auto" />
            <p className={`text-sm font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              Sin eventos registrados
            </p>
            <p className="text-xs text-slate-400">
              No hay movimientos registrados con el filtro actual.
            </p>
          </div>
        ) : (
          <div className={`overflow-x-auto rounded-2xl border ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <table className="w-full text-left border-collapse">
              <thead className={darkMode ? 'bg-slate-950/80' : 'bg-slate-50'}>
                <tr className={`text-[10px] uppercase tracking-wider font-black ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <th className="px-4 py-3.5">Fecha y Hora</th>
                  <th className="px-4 py-3.5">Tipo</th>
                  <th className="px-4 py-3.5 hidden md:table-cell">Punto de Acceso</th>
                  <th className="px-4 py-3.5 hidden sm:table-cell">Método</th>
                  <th className="px-4 py-3.5 hidden sm:table-cell">Certeza IA</th>
                  <th className="px-4 py-3.5">Estado</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {filteredLogs.map((log) => {
                  const isEntry = log.direction === 'entry';
                  return (
                    <tr
                      key={log.id}
                      className={`text-xs transition-colors ${
                        darkMode ? 'hover:bg-slate-950/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className={`px-4 py-3.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        <div className="flex items-center gap-2.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div>
                            <p className="font-bold">
                              {new Date(log.timestamp).toLocaleTimeString('es-CO', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {new Date(log.timestamp).toLocaleDateString('es-CO', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                          isEntry
                            ? darkMode
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : darkMode
                              ? 'bg-sky-950/70 text-sky-300 border-sky-800'
                              : 'bg-sky-50 text-sky-800 border-sky-200'
                        }`}>
                          {isEntry ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                          {isEntry ? 'Entrada' : 'Salida'}
                        </span>
                      </td>
                      <td className={`px-4 py-3.5 hidden md:table-cell font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {log.entryPoint}
                      </td>
                      <td className={`px-4 py-3.5 hidden sm:table-cell text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {log.method === 'facial_recognition' ? 'Reconocimiento Facial' : 'Manual'}
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell font-mono font-bold text-amber-500">
                        {(log.confidenceScore * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                          log.status === 'authorized' ? 'text-emerald-500' : 'text-rose-500'
                        }`}>
                          {log.status === 'authorized' ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Autorizado
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5" /> Denegado
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </div>
  );
};