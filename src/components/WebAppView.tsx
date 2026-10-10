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
} from 'lucide-react';
import type { UserProfile, AccessLog, UserRole } from '../types.ts';
import { getStoredToken, AVATAR_FALLBACK } from '../lib/api.ts';
import { AvatarModal } from './AvatarModal.tsx';

// 🔒 Feature flags — activar cuando el feature esté 100% probado
// Ubicación de docentes/administrativos: deshabilitado temporalmente.
// Para reactivar: cambiar a `true`. El código queda intacto.
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarNotice, setAvatarNotice] = useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Búsqueda de personas (solo se usa si ENABLE_SEARCH_LOCATION = true)
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

  // Debounce de búsqueda (solo activo si ENABLE_SEARCH_LOCATION = true)
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

  const handleAvatarRemoved = async () => {
    setAvatarError(null);
    setAvatarNotice(null);
    setAvatarUploading(true);
    try {
      const response = await fetch(`/api/users/${currentUser.id}/avatar`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo quitar la foto');
      setAvatarUrl(undefined);
      onUserUpdated?.(payload.user);
      onRefresh();
      setAvatarNotice('Foto de perfil quitada.');
    } catch (err: any) {
      setAvatarError(err.message || 'Error al quitar la foto');
    } finally {
      setAvatarUploading(false);
    }
  };

  // --- CÁLCULOS DE KPIs ---
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const logsThisMonth = logs.filter((l) => new Date(l.timestamp) >= monthStart);
  const logsToday = logs.filter((l) => new Date(l.timestamp) >= todayStart);
  const lastLog = logs[0];
  const isInside = lastLog?.direction === 'entry' && lastLog?.status === 'authorized';

  // Promedio de hora de entrada (últimas entradas autorizadas)
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

  // Racha de días consecutivos asistiendo
  const uniqueDays = Array.from(
    new Set(
      logs
        .filter((l) => l.direction === 'entry' && l.status === 'authorized')
        .map((l) => new Date(l.timestamp).toDateString())
    )
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ================== FILA DE KPIs ================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Accesos del mes */}
        <div
          className={`p-5 rounded-2xl border shadow-sm transition-colors ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[11px] font-black uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Accesos este mes
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-blue-950 text-blue-300' : 'bg-blue-50 text-blue-900'}`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {logsThisMonth.length}
          </p>
          <p className={`text-[11px] mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Total de eventos registrados
          </p>
        </div>

        {/* KPI 2: Accesos de hoy */}
        <div
          className={`p-5 rounded-2xl border shadow-sm transition-colors ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[11px] font-black uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Hoy
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-amber-950 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {logsToday.length}
          </p>
          <p className={`text-[11px] mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {logsToday.length === 0 ? 'Sin eventos hoy' : 'Eventos registrados hoy'}
          </p>
        </div>

        {/* KPI 3: Estado actual */}
        <div
          className={`p-5 rounded-2xl border shadow-sm transition-colors ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[11px] font-black uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Estado actual
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isInside
                  ? darkMode
                    ? 'bg-emerald-950 text-emerald-300'
                    : 'bg-emerald-50 text-emerald-700'
                  : darkMode
                    ? 'bg-slate-800 text-slate-400'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-2xl font-black flex items-center gap-2 ${
              isInside
                ? 'text-emerald-500'
                : darkMode
                  ? 'text-slate-300'
                  : 'text-slate-700'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${isInside ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            {isInside ? 'En el campus' : 'Fuera'}
          </p>
          <p className={`text-[11px] mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {lastLog
              ? `Último: ${new Date(lastLog.timestamp).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}`
              : 'Sin registros'}
          </p>
        </div>

        {/* KPI 4: Biometría */}
        <div
          className={`p-5 rounded-2xl border shadow-sm transition-colors ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[11px] font-black uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Biometría facial
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-violet-950 text-violet-300' : 'bg-violet-50 text-violet-700'}`}>
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {currentUser.faceEnrolled ? 'Activa' : 'Pendiente'}
          </p>
          <p className={`text-[11px] mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {currentUser.faceEnrolled
              ? 'Acceso manos libres habilitado'
              : 'Aún no has enrolado tu rostro'}
          </p>
        </div>
      </div>

      {/* ================== FILA: CARNÉ + PERFIL ================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Carné digital (2 columnas) */}
        <div
          className={`lg:col-span-2 p-6 rounded-2xl border shadow-sm transition-colors ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            <IdCard className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-blue-900'}`} />
            <h3 className={`text-sm font-black uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Carné Digital
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row gap-5">
            {/* Foto */}
            <div className="shrink-0 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                disabled={avatarUploading}
                className={`relative w-32 h-40 rounded-xl overflow-hidden border-2 border-blue-900 shadow-md transition-all ${
                  avatarUploading ? 'opacity-60 cursor-wait' : 'cursor-pointer hover:opacity-85'
                }`}
              >
                <img
                  src={avatarUrl || AVATAR_FALLBACK}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
                {avatarUploading && (
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-900/55">
                    <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
                  </span>
                )}
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  disabled={avatarUploading}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border transition-colors disabled:opacity-50 ${
                    darkMode
                      ? 'bg-amber-950 text-amber-300 border-amber-800 hover:bg-amber-900'
                      : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                  }`}
                >
                  <Camera className="w-3 h-3" />
                  {avatarUrl ? 'Cambiar' : 'Subir'}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleAvatarRemoved}
                    disabled={avatarUploading}
                    className={`p-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                      darkMode
                        ? 'bg-rose-950 text-rose-300 border-rose-800 hover:bg-rose-900'
                        : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {currentUser.name}
                </h2>
                <p className={`text-sm font-mono font-bold mt-0.5 ${darkMode ? 'text-amber-400' : 'text-blue-900'}`}>
                  CC: {currentUser.documentId}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                    darkMode
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  <UserIcon className="w-3 h-3" />
                  {roleLabel[currentUser.role] || currentUser.role}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                    darkMode
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Activo
                </span>
              </div>

              <div className={`pt-3 border-t space-y-1.5 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <p className={`flex items-center gap-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <GraduationCap className="w-4 h-4 text-slate-400" />
                  {currentUser.facultyOrDept || 'Comunidad universitaria'}
                </p>
                <p className={`flex items-center gap-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Mail className="w-4 h-4 text-slate-400" />
                  {currentUser.email}
                </p>
              </div>

              {/* QR */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 mt-3 ${
                  darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <QrCode className={`w-10 h-10 ${darkMode ? 'text-amber-400' : 'text-blue-950'}`} />
                  <div>
                    <span className={`text-[10px] font-mono block font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Código QR Peatonal
                    </span>
                    <span className={`text-sm font-mono font-black ${darkMode ? 'text-amber-300' : 'text-blue-950'}`}>
                      UNI-{currentUser.documentId.slice(-6)}
                    </span>
                  </div>
                </div>
                <div className="h-8 flex items-center gap-0.5 opacity-60">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className={darkMode ? 'bg-slate-400 h-full' : 'bg-slate-700 h-full'}
                      style={{ width: i % 3 === 0 ? '3px' : '1.5px' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mi actividad */}
        <div
          className={`p-6 rounded-2xl border shadow-sm transition-colors ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h3 className={`text-sm font-black uppercase tracking-wider mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Mi actividad
          </h3>

          <div className="space-y-4">
            {/* Promedio de hora de entrada */}
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Promedio de entrada
              </p>
              <p className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {avgEntryHour}
              </p>
              <p className={`text-[11px] font-medium mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Basado en tus últimas {entryLogs.length} entradas
              </p>
            </div>

            {/* Racha */}
            <div className={`pt-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Racha de asistencia
              </p>
              <p className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {streak} {streak === 1 ? 'día' : 'días'}
              </p>
              <p className={`text-[11px] font-medium mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Días consecutivos entrando al campus
              </p>
            </div>

            {/* Última ubicación */}
            <div className={`pt-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Mi última ubicación
              </p>
              {lastLog ? (
                <>
                  <p className={`flex items-center gap-1.5 text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                    {lastLog.entryPoint}
                  </p>
                  <p className={`text-[11px] font-medium mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {new Date(lastLog.timestamp).toLocaleString('es-CO', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </>
              ) : (
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Sin registros aún
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================== BUSCADOR DE PERSONAL ================== */}
      {/* 🔒 DESHABILITADO — cambiar ENABLE_SEARCH_LOCATION a true para reactivar */}
      {ENABLE_SEARCH_LOCATION && (
        <div
          className={`p-6 rounded-2xl border shadow-sm transition-colors ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Search className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-blue-900'}`} />
            <h3 className={`text-sm font-black uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Ubicar docente o administrativo
            </h3>
          </div>
          <p className={`text-[11px] mb-4 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Busca por nombre o cédula para conocer la última ubicación registrada. Por privacidad, solo puedes consultar a docentes, personal administrativo, coordinadores y vigilancia.
          </p>

          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ej: Juan Pérez, o 1005892341"
              className={`w-full pl-9 pr-3 py-3 border rounded-xl text-sm focus:outline-hidden ${
                darkMode
                  ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
              }`}
            />
            {searching && (
              <RefreshCw className="w-4 h-4 absolute right-3 top-3.5 text-amber-500 animate-spin" />
            )}
          </div>

          {searchError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-2 text-xs text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{searchError}</span>
            </div>
          )}

          {hasSearched && !searching && searchResults.length === 0 && !searchError && (
            <p className={`text-sm text-center py-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Sin resultados para "{searchQuery}"
            </p>
          )}

          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map((r) => {
                const statusColor =
                  r.inferredStatus === 'inside'
                    ? 'emerald'
                    : r.inferredStatus === 'outside'
                      ? 'slate'
                      : 'amber';
                const statusLabel =
                  r.inferredStatus === 'inside'
                    ? 'Probablemente en el campus'
                    : r.inferredStatus === 'outside'
                      ? 'Probablemente fuera'
                      : 'Sin información reciente';

                return (
                  <div
                    key={r.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={r.avatarUrl || AVATAR_FALLBACK}
                        alt={r.name}
                        className="w-12 h-12 rounded-lg object-cover border-2 border-blue-900 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-black truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {r.name}
                        </h4>
                        <p className={`text-[11px] font-bold ${darkMode ? 'text-amber-400' : 'text-blue-900'}`}>
                          {roleLabel[r.role] || r.role}
                        </p>
                        {r.facultyOrDept && (
                          <p className={`text-[11px] truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {r.facultyOrDept}
                          </p>
                        )}

                        <div className="mt-2 space-y-1">
                          <p
                            className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                              statusColor === 'emerald'
                                ? darkMode
                                  ? 'bg-emerald-950 text-emerald-300'
                                  : 'bg-emerald-100 text-emerald-800'
                                : statusColor === 'amber'
                                  ? darkMode
                                    ? 'bg-amber-950 text-amber-300'
                                    : 'bg-amber-100 text-amber-800'
                                  : darkMode
                                    ? 'bg-slate-800 text-slate-300'
                                    : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                statusColor === 'emerald'
                                  ? 'bg-emerald-500'
                                  : statusColor === 'amber'
                                    ? 'bg-amber-500'
                                    : 'bg-slate-400'
                              }`}
                            />
                            {statusLabel}
                          </p>

                          {r.lastLocation && (
                            <p className={`flex items-center gap-1 text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              <MapPin className="w-3 h-3 shrink-0" />
                              {r.lastLocation}
                            </p>
                          )}
                          {r.lastTimestamp && (
                            <p className={`flex items-center gap-1 text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              <Clock className="w-3 h-3 shrink-0" />
                              {new Date(r.lastTimestamp).toLocaleString('es-CO', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </p>
                          )}
                          <a
                            href={`mailto:${r.email}`}
                            className={`inline-flex items-center gap-1 text-[10px] font-bold hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}
                          >
                            <Mail className="w-3 h-3" />
                            {r.email}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ayuda cuando no hay búsqueda */}
          {!hasSearched && !searching && searchQuery.length < 2 && (
            <div className={`text-center py-8 rounded-xl border-2 border-dashed ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <Users className={`w-10 h-10 mx-auto mb-2 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
              <p className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Escribe al menos 2 caracteres para comenzar
              </p>
              <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Prueba con el nombre o la cédula de un docente
              </p>
            </div>
          )}
        </div>
      )}

      {/* ================== HISTORIAL DE ACCESOS ================== */}
      <div
        className={`p-6 rounded-2xl border shadow-sm transition-colors ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <History className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-blue-900'}`} />
            <h3 className={`text-sm font-black uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Historial de accesos
            </h3>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              {filteredLogs.length}
            </span>
          </div>

          {/* Filtro */}
          <div
            className={`flex items-center gap-1 p-1 rounded-lg border text-[11px] ${
              darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => setFilterDirection('all')}
              className={`px-3 py-1 rounded font-bold transition-colors ${
                filterDirection === 'all'
                  ? darkMode
                    ? 'bg-blue-600 text-white'
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
              className={`px-3 py-1 rounded font-bold transition-colors ${
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
              className={`px-3 py-1 rounded font-bold transition-colors ${
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

        {/* Tabla / lista */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
            <span>Cargando bitácora...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className={`py-12 text-center rounded-xl border p-6 space-y-2 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <History className="w-8 h-8 text-slate-400 mx-auto" />
            <p className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              Sin registros
            </p>
            <p className="text-[11px] text-slate-400">
              No hay eventos registrados con el filtro actual.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border ${darkMode ? 'border-slate-800' : 'border-slate-200'}">
            <table className="w-full text-left">
              <thead className={darkMode ? 'bg-slate-950' : 'bg-slate-50'}>
                <tr className={`text-[10px] uppercase tracking-wider font-black ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <th className="px-4 py-3">Fecha y hora</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 hidden md:table-cell">Punto de acceso</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Método</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Certeza IA</th>
                  <th className="px-4 py-3">Estado</th>
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
                      <td className={`px-4 py-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        <div className="flex items-center gap-2">
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
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded border ${
                            isEntry
                              ? darkMode
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : darkMode
                                ? 'bg-sky-950 text-sky-300 border-sky-800'
                                : 'bg-sky-50 text-sky-800 border-sky-200'
                          }`}
                        >
                          {isEntry ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                          {isEntry ? 'Entrada' : 'Salida'}
                        </span>
                      </td>
                      <td className={`px-4 py-3 hidden md:table-cell ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {log.entryPoint}
                      </td>
                      <td className={`px-4 py-3 hidden sm:table-cell text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {log.method === 'facial_recognition' ? 'Facial' : 'Manual'}
                      </td>
                      <td className={`px-4 py-3 hidden sm:table-cell font-mono font-bold text-amber-500`}>
                        {(log.confidenceScore * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                            log.status === 'authorized'
                              ? 'text-emerald-500'
                              : 'text-rose-500'
                          }`}
                        >
                          {log.status === 'authorized' ? (
                            <>
                              <Check className="w-3 h-3" /> Autorizado
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3" /> Denegado
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

      {/* Modal de avatar */}
      <AvatarModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        darkMode={darkMode}
        userId={currentUser.id}
        userName={currentUser.name}
        currentAvatarUrl={avatarUrl}
        onUserUpdated={onUserUpdated}
        onRefresh={onRefresh}
      />
    </div>
  );
};