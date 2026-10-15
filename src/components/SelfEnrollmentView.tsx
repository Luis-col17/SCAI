import React from 'react';
import {
  ArrowLeft,
  ScanFace,
  CheckCircle2,
  Clock,
  Camera,
  Shield,
  Sparkles,
  Info,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import type { UserProfile } from '../types.ts';
import { AVATAR_FALLBACK } from '../lib/api.ts';
import { FaceEnrollment } from './FaceEnrollment.tsx';

interface SelfEnrollmentViewProps {
  currentUser: UserProfile;
  onCancel: () => void;
  onRefresh?: () => void;
  darkMode?: boolean;
}

export const SelfEnrollmentView: React.FC<SelfEnrollmentViewProps> = ({
  currentUser,
  onCancel,
  onRefresh,
  darkMode = false,
}) => {
  const isEnrolled = currentUser.faceEnrolled === true;

  return (
    <div className="w-full max-w-5xl mx-auto py-6 lg:py-10 animate-in fade-in duration-200 px-4 lg:px-0 space-y-6">

      {/* ─────── Botón Volver ─────── */}
      <button
        onClick={onCancel}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-colors ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al portal</span>
      </button>

      {/* ─────── Header ─────── */}
      <div className="flex items-center gap-4 lg:gap-5">
        <div
          className={`w-16 h-16 lg:w-20 lg:h-20 rounded-3xl flex items-center justify-center border-2 ${
            darkMode
              ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
              : 'bg-cyan-50 text-cyan-700 border-cyan-200'
          }`}
        >
          <ScanFace className="w-8 h-8 lg:w-10 lg:h-10" />
        </div>
        <div>
          <h1
            className={`text-3xl lg:text-4xl font-black tracking-tight ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            Enrolar mi rostro
          </h1>
          <p
            className={`text-sm lg:text-base mt-1 ${
              darkMode ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Registra tu rostro para acceder a los torniquetes peatonales sin contacto.
          </p>
        </div>
      </div>

      {/* ─────── Banner de estado ─────── */}
      {isEnrolled ? (
        <div
          className={`p-4 lg:p-5 rounded-2xl border flex items-start gap-4 ${
            darkMode
              ? 'bg-emerald-950/40 border-emerald-800'
              : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <div
            className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${
              darkMode
                ? 'bg-emerald-950 text-emerald-400'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3
              className={`text-sm lg:text-base font-black mb-1 ${
                darkMode ? 'text-emerald-300' : 'text-emerald-800'
              }`}
            >
              Ya tienes tu rostro enrolado
            </h3>
            <p
              className={`text-xs lg:text-sm leading-relaxed ${
                darkMode ? 'text-emerald-200/80' : 'text-emerald-700/90'
              }`}
            >
              Puedes continuar con el acceso manos libres en los torniquetes. Si deseas actualizar tus fotos,
              puedes re-enrolar tu rostro a continuación: se reemplazarán las fotos anteriores.
            </p>
          </div>
        </div>
      ) : (
        <div
          className={`p-4 lg:p-5 rounded-2xl border flex items-start gap-4 ${
            darkMode
              ? 'bg-amber-950/40 border-amber-800'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div
            className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${
              darkMode
                ? 'bg-amber-950 text-amber-400'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3
              className={`text-sm lg:text-base font-black mb-1 ${
                darkMode ? 'text-amber-300' : 'text-amber-800'
              }`}
            >
              Aún no has enrolado tu rostro
            </h3>
            <p
              className={`text-xs lg:text-sm leading-relaxed ${
                darkMode ? 'text-amber-200/80' : 'text-amber-700/90'
              }`}
            >
              Sin el enrolamiento no podrás usar el acceso por reconocimiento facial en los torniquetes.
              Completa el proceso a continuación para habilitarlo.
            </p>
          </div>
        </div>
      )}

      {/* ─────── Layout 2 columnas: Instrucciones + Formulario ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ═══════ COLUMNA IZQUIERDA: Instrucciones + Tu perfil ═══════ */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 self-start">

          {/* Card: Tu perfil */}
          <div
            className={`p-6 rounded-3xl border shadow-lg backdrop-blur-sm ${
              darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
            }`}
          >
            <h3
              className={`text-xs font-black uppercase tracking-wider mb-4 ${
                darkMode ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              Tu perfil
            </h3>

            <div className="flex flex-col items-center mb-4">
              <img
                src={currentUser.avatarUrl || AVATAR_FALLBACK}
                alt={currentUser.name}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-cyan-500/30 shadow-2xl mb-3"
                referrerPolicy="no-referrer"
              />
              <h4
                className={`text-base font-black text-center leading-tight ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                {currentUser.name}
              </h4>
              <p
                className={`text-xs font-mono mt-1 ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                CC: {currentUser.documentId}
              </p>
              <span
                className={`inline-flex items-center gap-1 mt-2 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                  isEnrolled
                    ? darkMode
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : darkMode
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                {isEnrolled ? (
                  <>
                    <UserCheck className="w-3 h-3" />
                    Enrolado
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3" />
                    Sin enrolar
                  </>
                )}
              </span>
            </div>

            <div
              className={`pt-4 border-t space-y-2 text-xs ${
                darkMode ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>Rol:</span>
                <span
                  className={`font-bold uppercase ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>
              {currentUser.facultyOrDept && (
                <div className="flex justify-between items-start gap-2">
                  <span className={`shrink-0 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Programa:
                  </span>
                  <span
                    className={`font-bold text-right ${
                      darkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    {currentUser.facultyOrDept}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card: ¿Cómo funciona? */}
          <div
            className={`p-6 rounded-3xl border shadow-lg backdrop-blur-sm ${
              darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className={`w-4 h-4 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`} />
              <h3
                className={`text-xs font-black uppercase tracking-wider ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                ¿Cómo funciona?
              </h3>
            </div>

            <ol className="space-y-4">
              {/* Paso 1 */}
              <li className="flex items-start gap-3">
                <div
                  className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border ${
                    darkMode
                      ? 'bg-slate-800 text-cyan-400 border-slate-700'
                      : 'bg-slate-100 text-cyan-700 border-slate-200'
                  }`}
                >
                  1
                </div>
                <div className="flex-1 pt-0.5">
                  <h4
                    className={`text-xs font-black mb-0.5 ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Acepta el consentimiento
                  </h4>
                  <p
                    className={`text-[11px] leading-relaxed ${
                      darkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    Autorizas el tratamiento de tus datos biométricos según la Ley 1581 de 2012.
                  </p>
                </div>
              </li>

              {/* Paso 2 */}
              <li className="flex items-start gap-3">
                <div
                  className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border ${
                    darkMode
                      ? 'bg-slate-800 text-cyan-400 border-slate-700'
                      : 'bg-slate-100 text-cyan-700 border-slate-200'
                  }`}
                >
                  2
                </div>
                <div className="flex-1 pt-0.5">
                  <h4
                    className={`text-xs font-black mb-0.5 ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Captura 3 a 5 fotos
                  </h4>
                  <p
                    className={`text-[11px] leading-relaxed ${
                      darkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    Con la cámara o subiendo imágenes. Rostro descubierto, buena luz, de frente.
                  </p>
                </div>
              </li>

              {/* Paso 3 */}
              <li className="flex items-start gap-3">
                <div
                  className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border ${
                    darkMode
                      ? 'bg-slate-800 text-cyan-400 border-slate-700'
                      : 'bg-slate-100 text-cyan-700 border-slate-200'
                  }`}
                >
                  3
                </div>
                <div className="flex-1 pt-0.5">
                  <h4
                    className={`text-xs font-black mb-0.5 ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Listo, ya puedes entrar sin contacto
                  </h4>
                  <p
                    className={`text-[11px] leading-relaxed ${
                      darkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    Tu rostro queda registrado en los torniquetes de la Cra 5.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* Card: Recomendaciones */}
          <div
            className={`p-5 rounded-3xl border backdrop-blur-sm ${
              darkMode
                ? 'bg-blue-950/30 border-blue-900'
                : 'bg-blue-50/60 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Info className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`} />
              <h3
                className={`text-xs font-black uppercase tracking-wider ${
                  darkMode ? 'text-blue-300' : 'text-blue-800'
                }`}
              >
                Recomendaciones
              </h3>
            </div>
            <ul
              className={`space-y-1.5 text-[11px] leading-relaxed ${
                darkMode ? 'text-blue-200/80' : 'text-blue-800/90'
              }`}
            >
              <li className="flex items-start gap-1.5">
                <span className="mt-1">•</span>
                <span>Usa buena iluminación (evita contraluz)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-1">•</span>
                <span>Sin gafas, gorras ni tapabocas</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-1">•</span>
                <span>Mira directo a la cámara, rostro de frente</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-1">•</span>
                <span>Varía ligeramente la pose entre fotos</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ═══════ COLUMNA DERECHA: Formulario de enrolamiento ═══════ */}
        <div className="lg:col-span-2">
          <div
            className={`p-6 lg:p-8 rounded-3xl border shadow-lg backdrop-blur-sm ${
              darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-6">
              <Camera className={`w-5 h-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`} />
              <h2
                className={`text-sm font-black uppercase tracking-wider ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Captura de rostro
              </h2>
            </div>

            {/* Componente FaceEnrollment */}
            <FaceEnrollment
              userId={currentUser.id}
              darkMode={darkMode}
              onEnrollmentComplete={() => {
                onRefresh?.();
              }}
            />

            {/* Nota de privacidad */}
            <div
              className={`mt-6 p-4 rounded-2xl border text-[11px] leading-relaxed flex items-start gap-3 ${
                darkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-400'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <Shield className={`w-4 h-4 shrink-0 mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              <div>
                <strong className={darkMode ? 'text-slate-300' : 'text-slate-800'}>
                  Privacidad y datos biométricos
                </strong>
                <p className="mt-1">
                  Tus fotos se almacenan en Cloudinary y solo se usan para reconocimiento facial interno.
                  Puedes eliminar tu enrolamiento en cualquier momento desde esta misma vista. Cumplimos con la{' '}
                  <strong>Ley 1581 de 2012</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};