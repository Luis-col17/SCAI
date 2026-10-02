import React, { useState } from 'react';
import { 
  Users, 
  FileText, 
  BarChart3, 
  Download, 
  Search, 
  UserPlus, 
  Trash2, 
  CheckCircle2, 
  Shield, 
  ShieldAlert, 
  Clock, 
  MapPin, 
  RefreshCw,
  PauseCircle,
  PlayCircle,
  LogIn,
  LogOut,
  Sparkles,
  Camera
} from 'lucide-react';
import type { UserProfile, AccessLog, SystemStats, UserRole, UserStatus } from '../types.ts';
import { authFetch, AVATAR_FALLBACK } from '../lib/api.ts';

interface AdminDashboardProps {
  users: UserProfile[];
  logs: AccessLog[];
  stats: SystemStats | null;
  onRefresh: () => void;
  currentUser: UserProfile;
  darkMode?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  logs,
  stats,
  onRefresh,
  currentUser,
  darkMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'logs'>('stats');

  // Search & filter states
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');
  const [logDirectionFilter, setLogDirectionFilter] = useState<string>('all');
  const [logStatusFilter, setLogStatusFilter] = useState<string>('all');

  // Create User Modal
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('student');
  const [newUserDoc, setNewUserDoc] = useState('');
  const [newUserFaculty, setNewUserFaculty] = useState('Facultad de Ingeniería');
  const [newUserPass, setNewUserPass] = useState('uniminuto2026');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Toggle user status
  const handleToggleUserStatus = async (user: UserProfile) => {
    try {
      const newStatus: UserStatus = user.status === 'active' ? 'suspended' : 'active';
      const res = await authFetch(`/api/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error toggling user status', err);
    }
  };

  // Delete user
  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el usuario ${name}? Esta acción revocará su acceso peatonal.`)) {
      return;
    }
    try {
      const res = await authFetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error deleting user', err);
    }
  };

  // Descarga del CSV: requiere cabecera Authorization, así que no sirve un <a href>.
  const handleExportCsv = async () => {
    try {
      const res = await authFetch('/api/access-logs/export');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo generar el reporte');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'uniminuto_accesos_peatonales.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setCreateError(err.message || 'No se pudo generar el reporte');
    }
  };

  // Create user submit
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await authFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPass,
          role: newUserRole,
          documentId: newUserDoc,
          facultyOrDept: newUserFaculty,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear usuario');
      }

      setShowCreateUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserDoc('');
      onRefresh();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.documentId.includes(userSearch) ||
      (u.facultyOrDept && u.facultyOrDept.toLowerCase().includes(userSearch.toLowerCase()));

    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Filtered Logs
  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.userName.toLowerCase().includes(logSearch.toLowerCase()) ||
      (l.documentId && l.documentId.includes(logSearch)) ||
      l.entryPoint.toLowerCase().includes(logSearch.toLowerCase());

    const matchesDirection = logDirectionFilter === 'all' || l.direction === logDirectionFilter;
    const matchesStatus = logStatusFilter === 'all' || l.status === logStatusFilter;

    return matchesSearch && matchesDirection && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Admin Header with Navigation Tabs */}
      <div className={`border rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <h2 className={`text-xl font-black flex items-center gap-2.5 ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <Shield className="w-6 h-6 text-blue-500" />
            <span>Panel de Administración y Control Peatonal</span>
          </h2>
          <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Gestión de aforo en vivo, credenciales biométricas faciales y auditoría de torniquetes • UNIMINUTO Sede Ibagué
          </p>
        </div>

        {/* Tab Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${
            darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              id="admin-tab-stats"
              onClick={() => setActiveTab('stats')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black transition-all ${
                activeTab === 'stats'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>Aforo & Métricas</span>
            </button>

            <button
              id="admin-tab-users"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black transition-all ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>Usuarios & Rostros ({users.length})</span>
            </button>

            <button
              id="admin-tab-logs"
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black transition-all ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Bitácora de Torniquetes ({logs.length})</span>
            </button>
          </div>

          <button
            onClick={onRefresh}
            className={`p-2 rounded-xl border transition-colors ${
              darkMode 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Actualizar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: ESTADÍSTICAS & AFORO EN CAMPUS                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'stats' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* 1. Aforo en Campus */}
            <div className={`border rounded-2xl p-4.5 shadow-xs relative overflow-hidden transition-colors ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Personas en Campus
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-3xl font-black font-mono ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {stats?.peopleInsideCampus ?? 24}
                </span>
                <span className="text-xs text-emerald-500 font-bold">Aforo en vivo</span>
              </div>
              <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Balance en tiempo real (Entradas - Salidas)
              </p>
            </div>

            {/* 2. Entradas Hoy */}
            <div className={`border rounded-2xl p-4.5 shadow-xs transition-colors ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Entradas Hoy
                </span>
                <div className={`p-1 rounded-lg ${darkMode ? 'bg-emerald-950/80 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                  <LogIn className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-500 font-mono">
                  {stats?.todayEntries ?? logs.filter(l => l.direction === 'entry').length}
                </span>
                <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>ingresos</span>
              </div>
              <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Torniquetes habilitados por rostro
              </p>
            </div>

            {/* 3. Salidas Hoy */}
            <div className={`border rounded-2xl p-4.5 shadow-xs transition-colors ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Salidas Hoy
                </span>
                <div className={`p-1 rounded-lg ${darkMode ? 'bg-sky-950/80 text-sky-400' : 'bg-sky-50 text-sky-700'}`}>
                  <LogOut className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-sky-500 font-mono">
                  {stats?.todayExits ?? logs.filter(l => l.direction === 'exit').length}
                </span>
                <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>egresos</span>
              </div>
              <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Egresos registrados por cámara
              </p>
            </div>

            {/* 4. Precisión IA Facial */}
            <div className={`border rounded-2xl p-4.5 shadow-xs transition-colors ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Certeza IA Facial
                </span>
                <div className={`p-1 rounded-lg ${darkMode ? 'bg-amber-950/80 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-500 font-mono">
                  {stats?.facialAccuracy ?? 98.4}%
                </span>
                <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>promedio</span>
              </div>
              <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Red neuronal convolucional MobileNet
              </p>
            </div>

            {/* 5. Alertas de Seguridad */}
            <div className={`border rounded-2xl p-4.5 shadow-xs transition-colors ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Alertas (RF-08)
                </span>
                <div className={`p-1 rounded-lg ${darkMode ? 'bg-rose-950/80 text-rose-400' : 'bg-rose-50 text-rose-700'}`}>
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-rose-500 font-mono">
                  {stats?.todayDenied ?? logs.filter(l => l.status === 'denied').length}
                </span>
                <span className="text-xs text-rose-400 font-medium">bloqueos</span>
              </div>
              <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Rostros no identificados o suspendidos
              </p>
            </div>

          </div>

          {/* Detailed Charts & Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Hourly Distribution (Entradas vs Salidas) */}
            <div className={`lg:col-span-8 border rounded-3xl p-5 shadow-xs space-y-4 transition-colors ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-sm font-black flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>Flujo Peatonal por Horas (Entradas vs Salidas)</span>
                  </h3>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Distribución de paso por torniquetes a lo largo de la jornada académica
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Entradas
                  </span>
                  <span className="flex items-center gap-1.5 text-sky-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    Salidas
                  </span>
                </div>
              </div>

              {/* Bar Graph Simulation */}
              <div className="pt-4 pb-2">
                <div className={`grid grid-cols-8 gap-2 items-end h-44 border-b pb-2 ${
                  darkMode ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  {[
                    { h: '07:00', in: 14, out: 2 },
                    { h: '09:00', in: 22, out: 6 },
                    { h: '11:00', in: 12, out: 15 },
                    { h: '13:00', in: 18, out: 14 },
                    { h: '15:00', in: 16, out: 10 },
                    { h: '17:00', in: 24, out: 20 },
                    { h: '19:00', in: 10, out: 26 },
                    { h: '21:00', in: 3, out: 28 },
                  ].map((col) => {
                    const max = 30;
                    const inHeight = Math.round((col.in / max) * 100);
                    const outHeight = Math.round((col.out / max) * 100);
                    return (
                      <div key={col.h} className="flex flex-col items-center gap-1 group">
                        <div className="w-full flex items-end justify-center gap-1 h-36">
                          <div
                            style={{ height: `${inHeight}%` }}
                            className="w-3.5 bg-emerald-500 rounded-t-sm transition-all group-hover:bg-emerald-400"
                            title={`Entradas ${col.h}: ${col.in}`}
                          />
                          <div
                            style={{ height: `${outHeight}%` }}
                            className="w-3.5 bg-sky-500 rounded-t-sm transition-all group-hover:bg-sky-400"
                            title={`Salidas ${col.h}: ${col.out}`}
                          />
                        </div>
                        <span className={`text-[10px] font-mono font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{col.h}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`flex items-center justify-between text-xs pt-1 font-medium ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <span>Pico matutino: 09:00 - 10:00 (Clases)</span>
                <span>Pico nocturno: 19:00 - 21:00 (Salida general)</span>
              </div>
            </div>

            {/* Distribution by Role & Physical Gates */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Role Distribution */}
              <div className={`border rounded-3xl p-5 shadow-xs space-y-3 transition-colors ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <h3 className={`text-sm font-black flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>Comunidad Registrada</span>
                </h3>

                <div className="space-y-2">
                  {[
                    { role: 'Estudiantes', count: users.filter(u => u.role === 'student').length, color: 'bg-amber-500' },
                    { role: 'Docentes', count: users.filter(u => u.role === 'teacher').length, color: 'bg-blue-600' },
                    { role: 'Administrativos', count: users.filter(u => u.role === 'staff' || u.role === 'admin').length, color: 'bg-emerald-600' },
                    { role: 'Vigilancia / Seguridad', count: users.filter(u => u.role === 'security').length, color: 'bg-purple-600' },
                  ].map((item) => (
                    <div key={item.role} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        <span className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.role}</span>
                      </div>
                      <span className={`font-mono font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical Gate Status */}
              <div className={`border rounded-3xl p-5 shadow-xs space-y-3 transition-colors ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <h3 className={`text-sm font-black flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span>Puntos de Torniquete Físico</span>
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <h4 className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Torniquetes Entrada Cra 5</h4>
                      <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Sensor facial 1 • IP 192.168.10.21</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      darkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      ACTIVO
                    </span>
                  </div>

                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <h4 className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Torniquetes Salida Cra 5</h4>
                      <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Sensor facial 2 • IP 192.168.10.22</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      darkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      ACTIVO
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: USUARIOS & ENROLAMIENTO FACIAL                         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Controls Bar */}
          <div className={`border rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs transition-colors ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar por nombre, cédula o carrera..."
                  className={`w-full pl-9 pr-3.5 py-2 rounded-xl border text-xs focus:outline-hidden ${
                    darkMode 
                      ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                  }`}
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl border text-xs focus:outline-hidden ${
                  darkMode 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-900'
                }`}
              >
                <option value="all">Todos los roles</option>
                <option value="student">Estudiantes</option>
                <option value="teacher">Docentes</option>
                <option value="staff">Administrativos</option>
                <option value="security">Seguridad</option>
                <option value="admin">Administradores</option>
              </select>
            </div>

            <button
              id="btn-open-create-user"
              onClick={() => setShowCreateUserModal(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-sm shrink-0 w-full sm:w-auto justify-center active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>Nuevo Usuario con Enrolamiento Facial</span>
            </button>
          </div>

          {/* Users Table */}
          <div className={`border rounded-2xl overflow-hidden shadow-xs transition-colors ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b text-[11px] uppercase tracking-wider font-bold ${
                  darkMode ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="p-4">Persona</th>
                    <th className="p-4">Cédula / Documento</th>
                    <th className="p-4">Rol & Programa</th>
                    <th className="p-4">Biometría Facial</th>
                    <th className="p-4">Estado Acceso</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={`p-8 text-center ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        No se encontraron usuarios coincidentes.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/70'}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={u.avatarUrl || AVATAR_FALLBACK}
                              alt={u.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-400 shrink-0"
                            />
                            <div>
                              <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{u.name}</h4>
                              <p className={`text-[11px] font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{u.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className={`p-4 font-mono font-bold ${darkMode ? 'text-amber-400' : 'text-blue-950'}`}>
                          {u.documentId}
                        </td>

                        <td className="p-4">
                          <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] uppercase border ${
                            darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-800'
                          }`}>
                            {u.role}
                          </span>
                          <p className={`text-[10px] mt-0.5 truncate max-w-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {u.facultyOrDept || 'General'}
                          </p>
                        </td>

                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            darkMode ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          }`}>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Rostro Enrolado
                          </span>
                        </td>

                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              u.status === 'active'
                                ? darkMode ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : darkMode ? 'bg-rose-950 text-rose-400 border-rose-800' : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            {u.status === 'active' ? 'Acceso Activo' : 'Suspendido'}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                u.status === 'active'
                                  ? darkMode ? 'bg-amber-950 border-amber-800 text-amber-400 hover:bg-amber-900' : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                                  : darkMode ? 'bg-emerald-950 border-emerald-800 text-emerald-400 hover:bg-emerald-900' : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                              }`}
                              title={u.status === 'active' ? 'Suspender acceso a torniquetes' : 'Reactivar acceso'}
                            >
                              {u.status === 'active' ? (
                                <PauseCircle className="w-4 h-4" />
                              ) : (
                                <PlayCircle className="w-4 h-4" />
                              )}
                            </button>

                            {u.id !== currentUser.id && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  darkMode ? 'bg-rose-950 border-rose-800 text-rose-400 hover:bg-rose-900' : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                                }`}
                                title="Eliminar usuario"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: BITÁCORA DE ACCESOS PEATONALES                         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'logs' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Controls Bar */}
          <div className={`border rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs transition-colors ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Buscar en bitácora por persona, cédula..."
                  className={`w-full pl-9 pr-3.5 py-2 rounded-xl border text-xs focus:outline-hidden ${
                    darkMode 
                      ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                  }`}
                />
              </div>

              {/* Filter by direction (Entrada vs Salida) */}
              <select
                value={logDirectionFilter}
                onChange={(e) => setLogDirectionFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl border text-xs focus:outline-hidden ${
                  darkMode 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-900'
                }`}
              >
                <option value="all">Todas las direcciones</option>
                <option value="entry">Solo Entradas (Ingresos)</option>
                <option value="exit">Solo Salidas (Egresos)</option>
              </select>

              {/* Filter by status (Autorizado vs Denegado) */}
              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl border text-xs focus:outline-hidden ${
                  darkMode 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-900'
                }`}
              >
                <option value="all">Todos los estados</option>
                <option value="authorized">Autorizados</option>
                <option value="denied">Denegados / Bloqueados</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-colors shrink-0 w-full sm:w-auto justify-center ${
                darkMode 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              <Download className="w-4 h-4 text-blue-500" />
              <span>Exportar Reporte CSV</span>
            </button>
          </div>

          {/* Logs Table */}
          <div className={`border rounded-2xl overflow-hidden shadow-xs transition-colors ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b text-[11px] uppercase tracking-wider font-bold ${
                  darkMode ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="p-4">Fecha y Hora</th>
                    <th className="p-4">Persona</th>
                    <th className="p-4">Dirección</th>
                    <th className="p-4">Torniquete</th>
                    <th className="p-4">Método</th>
                    <th className="p-4">Certeza IA</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Observaciones</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={`p-8 text-center ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        No hay registros en la bitácora con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isEntry = log.direction === 'entry';
                      return (
                        <tr key={log.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/70'}`}>
                          <td className={`p-4 font-mono text-[11px] whitespace-nowrap ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {new Date(log.timestamp).toLocaleString('es-CO', {
                              dateStyle: 'short',
                              timeStyle: 'medium',
                            })}
                          </td>

                          <td className="p-4">
                            <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{log.userName}</h4>
                            <p className={`text-[10px] font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {log.documentId ? `CC: ${log.documentId}` : log.userRole}
                            </p>
                          </td>

                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase font-mono border ${
                                isEntry
                                  ? darkMode ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : darkMode ? 'bg-sky-950 text-sky-400 border-sky-800' : 'bg-sky-50 text-sky-800 border-sky-300'
                              }`}
                            >
                              {isEntry ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                              {isEntry ? 'Entrada' : 'Salida'}
                            </span>
                          </td>

                          <td className={`p-4 text-[11px] font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {log.entryPoint}
                          </td>

                          <td className="p-4 text-[11px]">
                            {log.method === 'facial_recognition' ? (
                              <span className="flex items-center gap-1 text-blue-400 font-bold">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                Facial IA
                              </span>
                            ) : (
                              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Contingencia</span>
                            )}
                          </td>

                          <td className={`p-4 font-mono font-bold text-[11px] ${darkMode ? 'text-amber-400' : 'text-blue-950'}`}>
                            {(log.confidenceScore * 100).toFixed(0)}%
                          </td>

                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                log.status === 'authorized'
                                  ? darkMode ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                  : darkMode ? 'bg-rose-950 text-rose-400 border-rose-800' : 'bg-rose-50 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {log.status === 'authorized' ? 'Autorizado' : 'Denegado'}
                            </span>
                          </td>

                          <td className={`p-4 text-[11px] max-w-xs truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} title={log.notes}>
                            {log.notes || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: REGISTRAR NUEVO USUARIO CON ENROLAMIENTO FACIAL       */}
      {/* ------------------------------------------------------------- */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              darkMode ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border ${
                  darkMode ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-900 border-blue-200'
                }`}>
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black">
                    Registrar Persona & Enrolamiento Facial
                  </h3>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Crea la credencial para habilitar el paso por torniquetes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className={`text-sm font-bold ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-700'}`}
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className={`p-3 rounded-xl border text-xs font-semibold ${
                darkMode ? 'bg-rose-950 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="space-y-1">
                <label className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ej: Andrés Felipe Silva"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-hidden ${
                    darkMode 
                      ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Cédula / Documento *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserDoc}
                    onChange={(e) => setNewUserDoc(e.target.value)}
                    placeholder="1005..."
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono focus:outline-hidden ${
                      darkMode 
                        ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Rol Institucional
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-hidden ${
                      darkMode 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-900'
                    }`}
                  >
                    <option value="student">Estudiante</option>
                    <option value="teacher">Docente</option>
                    <option value="staff">Administrativo</option>
                    <option value="security">Seguridad</option>
                    <option value="visitor">Visitante</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Correo Institucional *
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="ejemplo@uniminuto.edu.co"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-hidden ${
                    darkMode 
                      ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Facultad o Departamento
                </label>
                <input
                  type="text"
                  value={newUserFaculty}
                  onChange={(e) => setNewUserFaculty(e.target.value)}
                  placeholder="Facultad de Ingeniería..."
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-hidden ${
                    darkMode 
                      ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                  }`}
                />
              </div>

              <div className={`p-3 rounded-xl border text-[11px] space-y-1 ${
                darkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <span className="font-bold text-emerald-500 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" />
                  Enrolamiento Biométrico Automático
                </span>
                <p>
                  El vector de características faciales se registrará en la colección <code className="text-amber-400 font-mono">users</code> para permitir el acceso manos libres por los torniquetes de la Cra 5.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-black transition-colors shadow-sm disabled:opacity-50 active:scale-95"
                >
                  {createLoading ? 'Enrolando...' : 'Crear & Enrolar Rostro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
