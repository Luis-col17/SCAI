import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Terminal, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Layers, 
  ShieldCheck, 
  FileJson,
  Server
} from 'lucide-react';

interface MongoDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_USERS_DATA = [
  {
    _id: { $oid: '65f1a1000000000000000001' },
    name: 'Ing. Carlos Mendoza',
    email: 'admin@uniminuto.edu.co',
    role: 'admin',
    documentId: '1110543210',
    facultyOrDept: 'Coordinación de Infraestructura y TI',
    phone: '3104567890',
    status: 'active',
  },
  {
    _id: { $oid: '65f1a1000000000000000002' },
    name: 'Oficial Jairo Ruiz',
    email: 'seguridad@uniminuto.edu.co',
    role: 'security',
    documentId: '93123456',
    facultyOrDept: 'Vigilancia - Torniquetes Cra 5',
    phone: '3123456789',
    status: 'active',
  },
  {
    _id: { $oid: '65f1a1000000000000000003' },
    name: 'Dilan González',
    email: 'dilan.estudiante@uniminuto.edu.co',
    role: 'student',
    documentId: '1005892341',
    facultyOrDept: 'Ingeniería de Sistemas - Semestre VI',
    phone: '3187654321',
    status: 'active',
  },
  {
    _id: { $oid: '65f1a1000000000000000004' },
    name: 'Dra. María Fernanda Ospina',
    email: 'maria.ospina@uniminuto.edu.co',
    role: 'teacher',
    documentId: '65748912',
    facultyOrDept: 'Facultad de Ingeniería',
    phone: '3209876543',
    status: 'active',
  },
  {
    _id: { $oid: '65f1a1000000000000000005' },
    name: 'Laura Marcela Castro',
    email: 'laura.castro@uniminuto.edu.co',
    role: 'student',
    documentId: '1110594832',
    facultyOrDept: 'Comunicación Social y Periodismo',
    phone: '3167890123',
    status: 'active',
  },
];

const DEFAULT_ENTRY_POINTS_DATA = [
  {
    _id: { $oid: '65f1c3000000000000000001' },
    code: 'IBG-P-01',
    name: 'Torniquetes Entrada Cra 5 (Cámara Facial 1)',
    gateType: 'pedestrian',
    campus: 'UNIMINUTO Sede Ibagué',
    isActive: true,
  },
  {
    _id: { $oid: '65f1c3000000000000000002' },
    code: 'IBG-P-02',
    name: 'Torniquetes Salida Cra 5 (Cámara Facial 2)',
    gateType: 'pedestrian',
    campus: 'UNIMINUTO Sede Ibagué',
    isActive: true,
  },
];

export const MongoDatabaseModal: React.FC<MongoDatabaseModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'schemas' | 'script' | 'data' | 'validation' | 'connect'>('schemas');
  const [copied, setCopied] = useState(false);
  const [mongoStatus, setMongoStatus] = useState<any>(null);
  const [customUri, setCustomUri] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [mongoScript, setMongoScript] = useState<string>('// Cargando script mongosh...');
  const [exportData, setExportData] = useState<any>({
    database: 'uniminuto_acceso',
    collections: {
      users: DEFAULT_USERS_DATA,
      entry_points: DEFAULT_ENTRY_POINTS_DATA,
    },
  });

  const fetchStatusAndData = async () => {
    try {
      const [statusRes, scriptRes, exportRes] = await Promise.all([
        fetch('/api/mongodb/status'),
        fetch('/api/mongodb/script'),
        fetch('/api/mongodb/export'),
      ]);

      if (statusRes.ok) {
        setMongoStatus(await statusRes.json());
      }
      if (scriptRes.ok) {
        const scriptData = await scriptRes.json();
        setMongoScript(scriptData.script);
      }
      if (exportRes.ok) {
        setExportData(await exportRes.json());
      }
    } catch (err) {
      console.error('Error cargando estado de MongoDB:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatusAndData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(mongoScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadScript = () => {
    const blob = new Blob([mongoScript], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'uniminuto_mongodb_setup.js';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUri.trim()) return;

    setIsConnecting(true);
    setConnectMsg(null);

    try {
      const res = await fetch('/api/mongodb/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: customUri }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConnectMsg({
          type: 'success',
          text: `Conexión exitosa a MongoDB: ${data.database}`,
        });
        fetchStatusAndData();
      } else {
        setConnectMsg({
          type: 'error',
          text: data.error || 'No se pudo conectar a la base de datos MongoDB especificada.',
        });
      }
    } catch (err: any) {
      setConnectMsg({
        type: 'error',
        text: `Error de red: ${err.message}`,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSeedMongo = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/mongodb/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert('Colecciones sembradas exitosamente en MongoDB');
        fetchStatusAndData();
      } else {
        alert(`Error al sembrar: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error al sembrar: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-bold">
              <Database className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  Estructura Base de Datos MongoDB (Mongoose & Atlas)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                  {mongoStatus?.isConnected ? 'CONECTADO' : 'MONGODB LISTO'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Modelo NoSQL para Control Peatonal por Reconocimiento Facial • UNIMINUTO Sede Ibagué
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 bg-slate-100/70 border-b border-slate-200 flex gap-2 overflow-x-auto">
          {[
            { id: 'schemas', label: 'Esquemas NoSQL', icon: Layers },
            { id: 'script', label: 'Script de Inicialización (mongosh)', icon: Terminal },
            { id: 'data', label: 'Colecciones Exportables (JSON)', icon: FileJson },
            { id: 'validation', label: 'Reglas $jsonSchema', icon: ShieldCheck },
            { id: 'connect', label: 'Conexión Atlas / Local', icon: Server },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 font-bold text-xs whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-blue-900 text-blue-950 bg-white rounded-t-xl shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-blue-900" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-700 space-y-4 bg-white">
          
          {/* TAB 1: ESQUEMAS */}
          {activeTab === 'schemas' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. users */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-blue-950 font-mono text-xs">Colección: users</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono font-bold">email, documentId (unique)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Estudiantes, docentes y personal de UNIMINUTO con vector de embeddings biométricos faciales.
                  </p>
                  <pre className="p-3 rounded-xl bg-slate-100 font-mono text-[10.5px] text-slate-800 overflow-x-auto border border-slate-300 leading-relaxed">
{`{
  _id: ObjectId,
  name: String,
  email: String, // unique, index
  passwordHash: String,
  role: 'admin' | 'security' | 'student' | 'teacher' | 'staff' | 'visitor',
  documentId: String, // unique, index
  facultyOrDept: String,
  phone: String,
  avatarUrl: String,
  status: 'active' | 'suspended',
  biometricProfile: {
    facialEmbeddings: [Number], // Vector 128D MobileNet
    enrolledAt: Date,
    photoUrl: String
  },
  createdAt: Date,
  updatedAt: Date
}`}
                  </pre>
                </div>

                {/* 2. access_logs */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-blue-950 font-mono text-xs">Colección: access_logs</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">Índice compuesto timestamp</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Bitácora inmutable de entradas y salidas peatonales, certeza de IA y comando a torniquetes.
                  </p>
                  <pre className="p-3 rounded-xl bg-slate-100 font-mono text-[10.5px] text-slate-800 overflow-x-auto border border-slate-300 leading-relaxed">
{`{
  _id: ObjectId,
  direction: 'entry' | 'exit', // Entrada o Salida
  entryPoint: String, // 'Torniquetes Entrada Cra 5'
  method: 'facial_recognition' | 'manual_contingency' | 'qr_code',
  status: 'authorized' | 'denied',
  userId: ObjectId (ref: 'User'),
  userName: String,
  userRole: String,
  documentId: String,
  confidenceScore: Number (0.0 - 1.0),
  notes: String,
  alertTriggered: Boolean,
  timestamp: Date // index: -1
}`}
                  </pre>
                </div>

                {/* 3. entry_points */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-blue-950 font-mono text-xs">Colección: entry_points</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono font-bold">Hardware Torniquetes</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Torniquetes físicos peatonales en la Cra 5, cámaras RTSP de visión y controladoras IP.
                  </p>
                  <pre className="p-3 rounded-xl bg-slate-100 font-mono text-[10.5px] text-slate-800 overflow-x-auto border border-slate-300 leading-relaxed">
{`{
  _id: ObjectId,
  code: String, // 'IBG-P-01'
  name: String, // 'Torniquetes Entrada Cra 5'
  campus: 'UNIMINUTO Sede Ibagué',
  gateType: 'pedestrian',
  cameraUrl: String, // rtsp://...
  barrierControllerIp: String, // 192.168.10.21
  isActive: Boolean
}`}
                  </pre>
                </div>

                {/* 4. sessions */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-blue-950 font-mono text-xs">Colección: sessions</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-mono font-bold">TTL Auto-delete</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Tokens de sesión con auto-expiración nativa por índice TTL de MongoDB.
                  </p>
                  <pre className="p-3 rounded-xl bg-slate-100 font-mono text-[10.5px] text-slate-800 overflow-x-auto border border-slate-300 leading-relaxed">
{`{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  token: String, // unique, index
  expiresAt: Date, // TTL expireAfterSeconds: 0
  ipAddress: String,
  userAgent: String
}`}
                  </pre>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: SCRIPT MONGOSH */}
          {activeTab === 'script' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-slate-700 text-xs font-medium">
                  Ejecuta este script en la consola <strong>mongosh</strong> o cópialo en MongoDB Compass:
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyScript}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 border border-slate-300 shadow-xs transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-blue-900" />}
                    <span>{copied ? 'Copiado' : 'Copiar Script'}</span>
                  </button>
                  <button
                    onClick={handleDownloadScript}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-black flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Descargar .js</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 rounded-2xl bg-slate-50 font-mono text-[11px] text-slate-800 overflow-x-auto border border-slate-300 max-h-[420px] leading-relaxed">
                {mongoScript}
              </pre>
            </div>
          )}

          {/* TAB 3: DATOS EXPORTABLES */}
          {activeTab === 'data' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 text-xs">Colecciones Estructuradas en JSON</h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Datos iniciales adaptados al proyecto de investigación de Dilan en UNIMINUTO Ibagué.
                  </p>
                </div>
                <span className="font-mono text-emerald-700 font-black text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  DB: uniminuto_acceso
                </span>
              </div>

              {/* Usuarios */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-black text-slate-900">Colección de Usuarios (users)</h4>
                <div className="space-y-1.5">
                  {exportData.collections.users.map((u: any) => (
                    <div key={u._id.$oid} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-xs">
                      <div>
                        <span className="font-bold text-slate-900">{u.name}</span>
                        <span className="text-slate-500 text-[10px] ml-2 font-semibold">({u.role})</span>
                        <p className="text-[10px] text-slate-500 font-mono">{u.email} • CC: {u.documentId}</p>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Rostro Enrolado
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Torniquetes */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-black text-slate-900">Puntos de Torniquete Físico (entry_points)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(exportData.collections.entry_points || DEFAULT_ENTRY_POINTS_DATA).map((ep: any) => (
                    <div key={ep._id.$oid || ep.code} className="p-3 rounded-xl bg-white border border-slate-200 text-xs shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono font-black text-xs">
                          {ep.code}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold">ACTIVO</span>
                      </div>
                      <p className="text-[11px] text-slate-900 font-bold">{ep.name}</p>
                      <p className="text-[10px] text-slate-500">Paso Peatonal Manos Libres</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VALIDACIÓN JSON SCHEMA */}
          {activeTab === 'validation' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-1.5 text-blue-900 font-black">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Validación de Integridad y Tipos Nativos en MongoDB ($jsonSchema)</span>
                </div>
                <p className="text-slate-600 text-[11px] font-medium leading-relaxed">
                  MongoDB aplica validaciones estrictas al momento de insertar o modificar documentos, garantizando que campos como correo electrónico, documento institucional y dirección de paso respeten las reglas de negocio de UNIMINUTO.
                </p>
              </div>

              <pre className="p-4 rounded-2xl bg-slate-50 font-mono text-[11px] text-slate-800 overflow-x-auto border border-slate-300 leading-relaxed">
{`// Reglas de Validación para 'users'
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "passwordHash", "role", "documentId", "status"],
      properties: {
        email: { 
          bsonType: "string", 
          pattern: "^.+@.+\\\\..+$", 
          description: "Debe ser un correo electrónico válido" 
        },
        role: { 
          enum: ["admin", "security", "student", "teacher", "staff", "visitor"] 
        },
        documentId: { bsonType: "string" },
        biometricProfile: {
          bsonType: "object",
          properties: {
            facialEmbeddings: { bsonType: "array" }
          }
        }
      }
    }
  }
});`}
              </pre>
            </div>
          )}

          {/* TAB 5: CONEXIÓN ATLAS / LOCAL */}
          {activeTab === 'connect' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950">
                <h4 className="font-black text-blue-900 mb-1 flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-900" />
                  <span>Cómo Conectar con MongoDB Atlas o Servidor Local</span>
                </h4>
                <p className="text-xs font-medium">
                  Para conectar esta aplicación con tu clúster de MongoDB Atlas (Cloud) o una base de datos local:
                </p>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-[11px] text-slate-700 font-medium">
                  <li>Crea una base de datos gratuita en <strong>MongoDB Atlas (M0 Free Tier)</strong>.</li>
                  <li>Copia tu cadena de conexión (URI) con formato: <code className="text-blue-900 font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-200">mongodb+srv://&lt;usuario&gt;:&lt;password&gt;@cluster0.mongodb.net/uniminuto_acceso</code></li>
                  <li>Configura la variable de entorno <code className="text-blue-900 font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-200">MONGODB_URI</code> en tu archivo <code className="font-mono">.env</code> o pruébala abajo.</li>
                </ol>
              </div>

              {/* Formulario de prueba de conexión */}
              <form onSubmit={handleTestConnection} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  Cadena de Conexión MongoDB URI:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customUri}
                    onChange={(e) => setCustomUri(e.target.value)}
                    placeholder="mongodb://localhost:27017/uniminuto_acceso o mongodb+srv://..."
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-900"
                  />
                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isConnecting ? 'Probando...' : 'Conectar / Probar'}
                  </button>
                </div>

                {connectMsg && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 font-medium ${
                    connectMsg.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                      : 'bg-rose-50 text-rose-800 border border-rose-300'
                  }`}>
                    {connectMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{connectMsg.text}</span>
                  </div>
                )}

                {mongoStatus?.isConnected && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-emerald-700 font-bold">
                      ¡Conexión activa lista para sembrar!
                    </span>
                    <button
                      type="button"
                      onClick={handleSeedMongo}
                      disabled={isSeeding}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {isSeeding ? 'Sembrando...' : 'Sembrar Colecciones en MongoDB'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className="font-medium">UNIMINUTO Sede Ibagué • Base de Datos MongoDB NoSQL</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
