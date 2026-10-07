import React, { useState, useEffect } from 'react';
import { 
  IdCard, 
  History, 
  CheckCircle2, 
  QrCode, 
  Sparkles, 
  RefreshCw, 
  LogIn, 
  LogOut, 
  Camera, 
  Check,
  Clock,
  Wifi,
  Battery,
  Trash2
} from 'lucide-react';
import type { UserProfile, AccessLog } from '../types.ts';
import { getStoredToken, AVATAR_FALLBACK } from '../lib/api.ts';
import { FaceEnrollment } from './FaceEnrollment.tsx';

interface MobileAppViewProps {
  currentUser: UserProfile;
  onRefresh: () => void;
  onUserUpdated?: (user: UserProfile) => void;
  darkMode?: boolean;
}

export const MobileAppView: React.FC<MobileAppViewProps> = ({
  currentUser,
  onRefresh,
  onUserUpdated,
  darkMode = false,
}) => {
const [activeSubTab, setActiveSubTab] = useState<'id_card' | 'history'>('id_card');
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterDirection, setFilterDirection] = useState<'all' | 'entry' | 'exit'>('all');

  const authHeaders = (): Record<string, string> => {
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Load user access logs
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
      console.error('Error cargando historial de acceso:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [currentUser.id]);

  const filteredLogs = logs.filter(l => {
    if (filterDirection === 'all') return true;
    return l.direction === filterDirection;
  });

  const lastLog = logs[0];
  const isInsideCampus = lastLog?.direction === 'entry' && lastLog?.status === 'authorized';

  return (
    <div className="max-w-md mx-auto">
      {/* Phone Mockup Frame - High-DPI 4K Finish */}
      <div className={`rounded-[2.75rem] shadow-2xl overflow-hidden relative transition-colors duration-200 border-4 ${
        darkMode 
          ? 'bg-slate-900 border-slate-700/80 text-slate-100 shadow-blue-950/40 ring-1 ring-slate-800' 
          : 'bg-white border-slate-300 text-slate-800 shadow-slate-300/60 ring-1 ring-slate-200'
      }`}>
        
        {/* Dynamic Island / Status Bar */}
        <div className={`pt-3 pb-2 px-6 flex items-center justify-between border-b transition-colors ${
          darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-mono font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              09:41
            </span>
          </div>
          <div className={`w-20 h-4 rounded-full mx-auto flex items-center justify-center ${
            darkMode ? 'bg-slate-800' : 'bg-slate-300'
          }`}>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900/60 inline-block" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-3.5 h-3.5 text-emerald-500" />
          </div>
        </div>

        {/* Mobile Header with UNIMINUTO Navy & Gold */}
        <div className="px-5 py-3.5 bg-blue-900 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500 text-blue-950 flex items-center justify-center font-black text-xs shadow-xs">
              U
            </div>
            <div>
              <h2 className="text-xs font-black tracking-wide uppercase leading-tight text-white">
                UNIMINUTO Móvil
              </h2>
              <p className="text-[10px] font-semibold text-amber-300 leading-tight">
                Sede Ibagué • Acceso Peatonal
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              loadUserData();
              onRefresh();
            }}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white"
            title="Sincronizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Status Pill Indicator */}
        <div className={`px-5 pt-3 pb-2 flex items-center justify-between border-b transition-colors ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              isInsideCampus 
                ? 'bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse' 
                : 'bg-slate-400'
            }`} />
            <span className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Estado:{' '}
              <strong className={isInsideCampus ? 'text-emerald-500 font-bold' : darkMode ? 'text-slate-400' : 'text-slate-600'}>
                {isInsideCampus ? 'Dentro del Campus' : 'Fuera del Campus'}
              </strong>
            </span>
          </div>
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
            darkMode 
              ? 'bg-blue-950 text-blue-300 border-blue-800' 
              : 'bg-blue-100 text-blue-950 border-blue-200'
          }`}>
            {currentUser.role}
          </span>
        </div>

        {/* Sub-tab Switcher (Carné vs Historial) */}
        <div className={`p-3 border-b transition-colors ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl border ${
            darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              id="subtab-idcard"
              onClick={() => setActiveSubTab('id_card')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black transition-all ${
                activeSubTab === 'id_card'
                  ? darkMode ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-900 text-white shadow-xs'
                  : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <IdCard className="w-3.5 h-3.5 text-amber-400" />
              <span>Carné Digital</span>
            </button>

            <button
              id="subtab-history"
              onClick={() => setActiveSubTab('history')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black transition-all relative ${
                activeSubTab === 'history'
                  ? darkMode ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-900 text-white shadow-xs'
                  : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Historial ({logs.length})</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className={`p-4 min-h-[460px] max-h-[580px] overflow-y-auto transition-colors ${
          darkMode ? 'bg-slate-950/60' : 'bg-slate-50/50'
        }`}>
          
          {/* TAB 1: CARNÉ DIGITAL & PERFIL BIOMÉTRICO */}
          {activeSubTab === 'id_card' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Virtual ID Card */}
              <div className={`relative rounded-2xl overflow-hidden p-4 space-y-4 border-2 transition-all shadow-md ${
                darkMode 
                  ? 'bg-slate-900 border-slate-800 shadow-black/50' 
                  : 'bg-white border-slate-200 shadow-slate-200/50'
              }`}>
                
                {/* Header of Carné */}
                <div className={`flex items-center justify-between border-b pb-3 ${
                  darkMode ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-900 text-amber-400 font-black flex items-center justify-center text-xs">
                      U
                    </div>
                    <div>
                      <h4 className={`text-[11px] font-black uppercase tracking-wider ${
                        darkMode ? 'text-white' : 'text-blue-950'
                      }`}>
                        UNIMINUTO
                      </h4>
                      <p className={`text-[9px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Sede Ibagué - Tolima
                      </p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                    darkMode 
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                    Biometría Activa
                  </span>
                </div>

                {/* User Body with Photo & Info */}
                <div className="flex gap-3.5 items-center">
                  <div className="relative shrink-0">
                    <img
                      src={currentUser.avatarUrl || AVATAR_FALLBACK}
                      alt={currentUser.name}
                      className="w-20 h-24 rounded-xl object-cover border-2 border-blue-900 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className={`text-sm font-black truncate ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {currentUser.name}
                    </h3>
                    <p className={`text-xs font-mono font-bold ${
                      darkMode ? 'text-amber-400' : 'text-blue-900'
                    }`}>
                      CC: {currentUser.documentId}
                    </p>
                    <p className={`text-[10px] leading-tight font-medium ${
                      darkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {currentUser.facultyOrDept || 'Comunidad Universitaria'}
                    </p>
                    <div className="pt-1 flex items-center gap-2">
                      <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                        darkMode 
                          ? 'bg-amber-950 text-amber-300 border-amber-800' 
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {currentUser.role === 'student' ? 'Estudiante' : currentUser.role}
                      </span>
                      <span className={`text-[9px] font-mono font-semibold ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        Vigencia: 2026-I
                      </span>
                    </div>
                  </div>
                </div>

                {/* Enrolamiento facial del propio usuario */}
                <FaceEnrollment userId={currentUser.id} darkMode={darkMode} onRefresh={onRefresh} />

                {/* Barcode / QR Simulation for Torniquete Contingency */}
                <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                  darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <QrCode className={`w-8 h-8 ${darkMode ? 'text-amber-400' : 'text-blue-950'}`} />
                    <div className="text-left">
                      <span className={`text-[9px] font-mono block leading-tight font-bold ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        Código QR Peatonal
                      </span>
                      <span className={`text-[11px] font-mono font-black ${
                        darkMode ? 'text-amber-300' : 'text-blue-950'
                      }`}>
                        UNI-{currentUser.documentId.slice(-6)}
                      </span>
                    </div>
                  </div>
                  <div className="h-6 flex items-center gap-0.5 opacity-60">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <div
                        key={i}
                        className={darkMode ? 'bg-slate-400 h-full' : 'bg-slate-700 h-full'}
                        style={{ width: i % 3 === 0 ? '3px' : '1.5px' }}
                      />
                    ))}
                  </div>
                </div>

              </div>

              {/* Facial Biometric Info Box */}
              <div className={`p-4 rounded-2xl border space-y-2 shadow-xs ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <h4 className={`text-xs font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Acceso Manos Libres por Reconocimiento Facial
                  </h4>
                </div>
                <p className={`text-[11px] leading-relaxed font-medium ${
                  darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Para ingresar o salir de la sede, acércate a los torniquetes peatonales de la Carrera 5 y mira la cámara durante 1 segundo. El sistema detectará tu rostro y liberará el torniquete automáticamente.
                </p>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-500 font-bold">
                  <Check className="w-4 h-4" />
                  <span>Enrolamiento biométrico completado (100%)</span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: HISTORIAL DE ENTRADAS Y SALIDAS */}
          {activeSubTab === 'history' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              
              {/* Filter Buttons */}
              <div className="flex items-center justify-between pb-1">
                <span className={`text-[11px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Filtrar por:
                </span>
                <div className={`flex items-center gap-1 p-1 rounded-lg border text-[10px] ${
                  darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <button
                    onClick={() => setFilterDirection('all')}
                    className={`px-2.5 py-0.5 rounded font-bold transition-colors ${
                      filterDirection === 'all'
                        ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-900 text-white shadow-xs'
                        : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterDirection('entry')}
                    className={`px-2.5 py-0.5 rounded font-bold transition-colors ${
                      filterDirection === 'entry'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Entradas
                  </button>
                  <button
                    onClick={() => setFilterDirection('exit')}
                    className={`px-2.5 py-0.5 rounded font-bold transition-colors ${
                      filterDirection === 'exit'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Salidas
                  </button>
                </div>
              </div>

              {/* Logs List */}
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
                  <span>Cargando bitácora de torniquetes...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className={`py-12 text-center rounded-2xl border p-6 space-y-2 shadow-xs ${
                  darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <History className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    Sin registros de torniquete
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Aún no se han registrado eventos para este usuario con el filtro seleccionado.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((log) => {
                    const isEntry = log.direction === 'entry';
                    return (
                      <div
                        key={log.id}
                        className={`p-3 rounded-xl border transition-colors shadow-xs flex items-start justify-between gap-3 ${
                          darkMode 
                            ? 'bg-slate-900 border-slate-800 hover:border-slate-700' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                              isEntry
                                ? darkMode ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : darkMode ? 'bg-sky-950 text-sky-300 border-sky-800' : 'bg-sky-100 text-sky-800 border-sky-300'
                            }`}
                          >
                            {isEntry ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded font-mono border ${
                                  isEntry
                                    ? darkMode ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : darkMode ? 'bg-sky-950 text-sky-300 border-sky-800' : 'bg-sky-50 text-sky-800 border-sky-200'
                                }`}
                              >
                                {isEntry ? 'Entrada' : 'Salida'}
                              </span>
                              <span
                                className={`text-[10px] font-bold ${
                                  log.status === 'authorized' 
                                    ? 'text-emerald-500' 
                                    : 'text-rose-500'
                                }`}
                              >
                                {log.status === 'authorized' ? 'Autorizado' : 'Denegado'}
                              </span>
                            </div>

                            <p className={`text-[11px] font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                              {log.entryPoint}
                            </p>

                            <div className={`flex items-center gap-2 text-[10px] font-medium ${
                              darkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {new Date(log.timestamp).toLocaleTimeString('es-CO', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span>•</span>
                              <span>
                                {new Date(log.timestamp).toLocaleDateString('es-CO', {
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </span>
                              <span>•</span>
                              <span className="text-amber-500 font-mono font-bold">
                                {(log.confidenceScore * 100).toFixed(0)}% IA
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-[9px] font-medium block ${
                            darkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {log.method === 'facial_recognition' ? 'Facial' : 'Manual'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>

        {/* Mobile Navigation Bar at Bottom */}
        <div className={`p-3 border-t flex items-center justify-around text-[10px] transition-colors ${
          darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
        }`}>
          <button
            onClick={() => setActiveSubTab('id_card')}
            className={`flex flex-col items-center gap-1 font-bold ${
              activeSubTab === 'id_card' 
                ? darkMode ? 'text-amber-400' : 'text-blue-900' 
                : darkMode ? 'hover:text-slate-200' : 'hover:text-slate-800'
            }`}
          >
            <IdCard className="w-4 h-4" />
            <span>Mi Carné</span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex flex-col items-center gap-1 font-bold ${
              activeSubTab === 'history' 
                ? darkMode ? 'text-amber-400' : 'text-blue-900' 
                : darkMode ? 'hover:text-slate-200' : 'hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Torniquetes</span>
          </button>
        </div>

      </div>
    </div>
  );
};

