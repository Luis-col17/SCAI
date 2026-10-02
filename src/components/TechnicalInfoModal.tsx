import React from 'react';
import { 
  Database, 
  Layers, 
  Key, 
  BookOpen, 
  CheckCircle2
} from 'lucide-react';

interface TechnicalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

export const TechnicalInfoModal: React.FC<TechnicalInfoModalProps> = ({
  isOpen,
  onClose,
  darkMode = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`border rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col transition-colors ${
        darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-4 ${
          darkMode ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-bold ${
              darkMode ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">
                Arquitectura del Backend y Base de Datos
              </h3>
              <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Control y Gestión del Acceso Peatonal por Reconocimiento Facial • UNIMINUTO Ibagué
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors font-bold text-sm ${
              darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={`overflow-y-auto space-y-4 pr-1 text-xs leading-relaxed ${
          darkMode ? 'text-slate-300' : 'text-slate-700'
        }`}>
          
          {/* Institutional Card */}
          <div className={`p-4 rounded-2xl border shadow-xs ${
            darkMode ? 'bg-amber-950/40 border-amber-800/80 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}>
            <div className={`flex items-center gap-2 mb-1.5 font-black ${darkMode ? 'text-amber-400' : 'text-amber-900'}`}>
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span>Proyecto de Investigación - Ingeniería de Sistemas (2026)</span>
            </div>
            <p className="font-medium">
              <strong>Título:</strong> "Aplicación móvil con visión artificial para el control y gestión del acceso peatonal por reconocimiento facial en la Corporación Universitaria Minuto de Dios – Sede Ibagué."
            </p>
          </div>

          {/* Core Stack */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-3.5 rounded-2xl border ${
              darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2 text-emerald-500 font-black mb-1.5">
                <Database className="w-4 h-4 text-emerald-500" />
                <span>MongoDB & Mongoose</span>
              </div>
              <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Colecciones NoSQL: <code className="text-amber-400 font-mono font-bold">users</code>, <code className="text-amber-400 font-mono font-bold">access_logs</code>, <code className="text-amber-400 font-mono font-bold">entry_points</code>, <code className="text-amber-400 font-mono font-bold">revoked_tokens</code> (TTL) validadas con esquemas <code className="font-mono text-emerald-400">Mongoose</code>.
              </p>
            </div>

            <div className={`p-3.5 rounded-2xl border ${
              darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2 text-blue-400 font-black mb-1.5">
                <Database className="w-4 h-4 text-blue-400" />
                <span>Node.js, Express & TypeScript</span>
              </div>
              <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                API REST en <code className="text-blue-400 font-mono font-bold">server.ts</code> con Express y TypeScript, validación de datos entrantes y almacenamiento de imágenes en Cloudinary.
              </p>
            </div>

            <div className={`p-3.5 rounded-2xl border ${
              darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2 text-amber-400 font-black mb-1.5">
                <Key className="w-4 h-4 text-amber-400" />
                <span>JWT, scrypt & RBAC</span>
              </div>
              <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Contraseñas con <code className="font-mono">scrypt</code>, sesión por token JWT (1 día, revocable) y roles: Administrador, Personal de Vigilancia, Estudiante, Docente y Visitante.
              </p>
            </div>
          </div>

          {/* Mongoose Schema snippet */}
          <div className={`p-3.5 rounded-2xl border space-y-2 ${
            darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`font-mono text-[11px] font-bold ${darkMode ? 'text-amber-400' : 'text-blue-950'}`}>
                Esquema Mongoose de Usuario (Peatonal & Facial)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">TypeScript / MongoDB</span>
            </div>
            <pre className={`p-3 rounded-xl font-mono text-[10.5px] overflow-x-auto border leading-relaxed ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-800'
            }`}>
{`// src/db/mongo/models.ts
export const UserMongoSchema = new Schema<IUser>({
  businessId: { type: String, unique: true, sparse: true, index: true },
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },        // scrypt
  role:       { type: String, enum: ['admin', 'security',
                'student', 'teacher', 'staff', 'visitor'], default: 'student' },
  documentId: { type: String, required: true, unique: true },
  avatarUrl:      { type: String },                      // Cloudinary
  avatarPublicId: { type: String },
  faceEnrolled:   { type: Boolean, default: false },
  faceEmbeddings: { type: [[Number]], default: undefined }, // motor ML (futuro)
  enrollmentPhotos: [{ photoUrl: String, photoPublicId: String }],
  status:     { type: String, enum: ['active', 'blocked', 'inactive'],
                default: 'active' },
}, { timestamps: true, collection: 'users' });`}
            </pre>
          </div>

          {/* Requirements Compliance Checklist */}
          <div className={`p-3.5 rounded-2xl border space-y-2 ${
            darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className={`font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Cumplimiento de Requerimientos Institucionales:</h4>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span><strong>RF-01:</strong> CRUD de Perfiles y Enrolamiento Facial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span><strong>RF-03:</strong> Cámara Facial en Vivo y Validación Neuronal</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span><strong>RF-05 & RF-07:</strong> Bitácora de Torniquetes y Filtros</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span><strong>RF-08:</strong> Alerta Inmediata por Rostro Desconocido / Bloqueado</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span><strong>RF-10:</strong> Exportación de Auditoría a Formato CSV</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span><strong>RF-11:</strong> Modo de Contingencia Manual para Torniquetes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span><strong>RF-12:</strong> Suspensión / Reactivación de Acceso Peatonal</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span><strong>RNF-01:</strong> Tiempo de Respuesta Facial &lt; 1 Segundo</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className={`border-t pt-3 mt-3 text-right ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-black text-xs rounded-xl transition-colors shadow-xs"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
