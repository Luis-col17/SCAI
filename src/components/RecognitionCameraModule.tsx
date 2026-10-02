import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  User, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  ShieldAlert, 
  Scan, 
  Volume2, 
  VolumeX, 
  FileText,
  UserX,
  LogIn,
  LogOut,
  Lock,
  Unlock,
  RefreshCw,
  Check
} from 'lucide-react';
import type { UserProfile, AccessLog, AccessDirection } from '../types.ts';
import { getStoredToken, AVATAR_FALLBACK } from '../lib/api.ts';

interface RecognitionModuleProps {
  users: UserProfile[];
  onNewAccessLog: (log: AccessLog) => void;
  darkMode?: boolean;
}

export const RecognitionCameraModule: React.FC<RecognitionModuleProps> = ({
  users,
  onNewAccessLog,
  darkMode = false,
}) => {
  const [direction, setDirection] = useState<AccessDirection>('entry'); // 'entry' | 'exit'
  const [entryPoint, setEntryPoint] = useState('Torniquetes Entrada Cra 5');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [turnstileOpen, setTurnstileOpen] = useState(false);

  // La estación de cámara es una zona de vigilancia: sus rutas exigen rol admin/security.
const authHeaders = (): Record<string, string> => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

  // Result states
  const [lastResult, setLastResult] = useState<{
    authorized: boolean;
    direction: AccessDirection;
    title: string;
    details: string;
    confidence: number;
    user?: UserProfile;
    timestamp: string;
  } | null>(null);

  const [activeAlert, setActiveAlert] = useState<{
    title: string;
    message: string;
    severity: 'high' | 'medium';
  } | null>(null);

  // Simulated target persona selector for vision testing
  const [simulatedPersonId, setSimulatedPersonId] = useState<string>('unknown'); // sin persona → rostro no registrado
  const [showContingencyModal, setShowContingencyModal] = useState(false);

  // Contingency form state (RF-11)
  const [manualName, setManualName] = useState('');
  const [manualRole, setManualRole] = useState('visitor');
  const [manualDoc, setManualDoc] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Synchronize entryPoint with direction
  useEffect(() => {
    if (direction === 'entry') {
      setEntryPoint('Torniquetes Entrada Cra 5');
    } else {
      setEntryPoint('Torniquetes Salida Cra 5');
    }
  }, [direction]);

  // Web Audio feedback
  const playSound = (success: boolean) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (success) {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.setValueAtTime(160, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch {
      // Audio not supported or allowed
    }
  };

  // Start real webcam stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('No se pudo acceder a la cámara física:', err.message);
      setCameraError('Cámara física no disponible en este entorno. Puedes probar con el simulador de visión biométrica abajo.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // HUD canvas overlay animation for face recognition mesh
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let scanLineY = 0;
    let scanDirection = 1;

    const renderOverlay = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Draw Face Detection Box
      const boxW = Math.min(w * 0.48, 280);
      const boxH = Math.min(h * 0.65, 340);
      const boxX = (w - boxW) / 2;
      const boxY = (h - boxH) / 2 - 15;

      // Corner markers
      const markerSize = 24;
      ctx.strokeStyle = scanning ? '#10b981' : '#f59e0b';
      ctx.lineWidth = 3;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + markerSize);
      ctx.lineTo(boxX, boxY);
      ctx.lineTo(boxX + markerSize, boxY);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - markerSize, boxY);
      ctx.lineTo(boxX + boxW, boxY);
      ctx.lineTo(boxX + boxW, boxY + markerSize);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + boxH - markerSize);
      ctx.lineTo(boxX, boxY + boxH);
      ctx.lineTo(boxX + markerSize, boxY + boxH);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - markerSize, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH - markerSize);
      ctx.stroke();

      // Animated Scan Line when scanning
      if (scanning) {
        scanLineY += 3.5 * scanDirection;
        if (scanLineY > boxH || scanLineY < 0) {
          scanDirection *= -1;
        }

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(boxX + 4, boxY + scanLineY);
        ctx.lineTo(boxX + boxW - 4, boxY + scanLineY);
        ctx.stroke();

        // Biometric Face Grid
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.fillRect(boxX + 2, boxY + Math.max(0, scanLineY - 30), boxW - 4, 30);
      }

      // Live Telemetry Label in HUD
      ctx.font = '10px monospace';
      ctx.fillStyle = scanning ? '#10b981' : '#f59e0b';
      ctx.fillText(
        `AI: MOBILENET-V3 • ${direction === 'entry' ? 'ENTRADA' : 'SALIDA'} • 30 FPS`,
        boxX,
        boxY - 8
      );

      animId = requestAnimationFrame(renderOverlay);
    };

    renderOverlay();
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [scanning, direction]);

  // Execute Facial Recognition Scan
  const handlePerformScan = async () => {
    if (scanning) return;
    setScanning(true);
    setActiveAlert(null);
    setLastResult(null);

    // Capture canvas snapshot image
    let snapshotUrl: string | undefined;
    if (canvasRef.current && videoRef.current && isCameraActive) {
      try {
        const snapCanvas = document.createElement('canvas');
        snapCanvas.width = videoRef.current.videoWidth || 640;
        snapCanvas.height = videoRef.current.videoHeight || 480;
        const snapCtx = snapCanvas.getContext('2d');
        if (snapCtx) {
          snapCtx.drawImage(videoRef.current, 0, 0);
          snapshotUrl = snapCanvas.toDataURL('image/jpeg', 0.6);
        }
      } catch {
        // snapshot fallback
      }
    }

    try {
      // Simulate neural network facial embedding inference (850ms latency)
      await new Promise((res) => setTimeout(res, 850));

      const matchedUserId = simulatedPersonId === 'unknown' ? undefined : simulatedPersonId;

      const res = await fetch('/api/recognition/verify-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          matchedUserId,
          direction,
          entryPoint,
          snapshotUrl,
        }),
      });

      const data = await res.json();

      if (data.authorized) {
        playSound(true);
        setTurnstileOpen(true);
        setTimeout(() => setTurnstileOpen(false), 3500); // Turnstile closes after 3.5s

        setLastResult({
          authorized: true,
          direction,
          title: `¡${direction === 'entry' ? 'Ingreso' : 'Salida'} Peatonal Autorizado!`,
          details: `${data.user?.name} (${data.user?.role.toUpperCase()}) • Cédula: ${data.user?.documentId} • ${data.user?.facultyOrDept || ''}`,
          confidence: data.confidence,
          user: data.user,
          timestamp: new Date().toLocaleTimeString('es-CO'),
        });
      } else {
        playSound(false);
        setTurnstileOpen(false);

        setLastResult({
          authorized: false,
          direction,
          title: `Acceso Peatonal Denegado (${direction === 'entry' ? 'Entrada' : 'Salida'})`,
          details: data.message || 'Rostro no registrado o suspendido en base de datos de Uniminuto.',
          confidence: data.confidence || 0.4,
          user: data.user,
          timestamp: new Date().toLocaleTimeString('es-CO'),
        });

        if (data.alert) {
          setActiveAlert(data.alert);
        }
      }

      if (data.log) {
        onNewAccessLog(data.log);
      }
    } catch (err: any) {
      console.error('Error en escaneo facial:', err);
      playSound(false);
      setLastResult({
        authorized: false,
        direction,
        title: 'Error de Red / Visión',
        details: 'No se pudo comunicar con el servicio de reconocimiento neuronal.',
        confidence: 0,
        timestamp: new Date().toLocaleTimeString('es-CO'),
      });
    } finally {
      setScanning(false);
    }
  };

  // Manual Contingency Submit (RF-11)
  const handleContingencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName && !manualDoc) return;

    try {
      const res = await fetch('/api/recognition/manual-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          direction,
          entryPoint,
          userName: manualName,
          userRole: manualRole,
          documentId: manualDoc,
          notes: manualNotes || 'Pase autorizado manualmente por oficial de seguridad',
        }),
      });

      const data = await res.json();
      if (data.success) {
        playSound(true);
        setTurnstileOpen(true);
        setTimeout(() => setTurnstileOpen(false), 3000);

        setLastResult({
          authorized: true,
          direction,
          title: `Pase Manual de ${direction === 'entry' ? 'Entrada' : 'Salida'} Concedido`,
          details: `${manualName} (${manualRole}) • Doc: ${manualDoc || 'N/A'} • Torniquete Habilitado`,
          confidence: 1.0,
          timestamp: new Date().toLocaleTimeString('es-CO'),
        });

        if (data.log) {
          onNewAccessLog(data.log);
        }

        setShowContingencyModal(false);
        setManualName('');
        setManualDoc('');
        setManualNotes('');
      }
    } catch (err: any) {
      alert(`Error al registrar contingencia: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls: Mode Switcher (Entrada vs Salida) */}
      <div className={`border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border shadow-xs ${
              darkMode ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}>
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base sm:text-lg font-black flex items-center gap-2 ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Reconocimiento Facial Peatonal
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${
                  darkMode ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  IA ACTIVA • 4K
                </span>
              </h2>
              <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Control biométrico manos libres para torniquetes peatonales • Cra 5 UNIMINUTO Ibagué
              </p>
            </div>
          </div>
        </div>

        {/* Direction Switcher (ENTRADA / SALIDA) */}
        <div className="flex items-center gap-2">
          <div className={`grid grid-cols-2 gap-1 p-1.5 rounded-xl border ${
            darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              id="btn-direction-entry"
              onClick={() => setDirection('entry')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                direction === 'entry'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>MODO ENTRADA</span>
            </button>

            <button
              id="btn-direction-exit"
              onClick={() => setDirection('exit')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                direction === 'exit'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogOut className="w-4 h-4" />
              <span>MODO SALIDA</span>
            </button>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-colors ${
              soundEnabled
                ? darkMode ? 'bg-amber-950 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-700 shadow-xs'
                : darkMode ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
            title={soundEnabled ? 'Silenciar alertas acústicas' : 'Activar alertas acústicas'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Grid: Video Stream & Recognition Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live Camera Video Stream & Torniquete State */}
        <div className="lg:col-span-8 space-y-4">
          <div className={`border-2 rounded-3xl overflow-hidden shadow-md relative transition-colors ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            
            {/* Camera Viewport Housing */}
            <div className="relative aspect-video sm:aspect-16/10 bg-slate-950 flex items-center justify-center overflow-hidden">
              
              {/* Real Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 ${
                  isCameraActive ? 'block' : 'hidden'
                }`}
              />

              {/* Fallback Simulation View if camera is disabled or denied */}
              {!isCameraActive && (
                <div className="w-full h-full relative flex items-center justify-center bg-radial from-slate-900 via-slate-950 to-black p-6">
                  {/* Subtle Grid Pattern */}
                  <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:24px_24px]" />
                  
                  <div className="relative text-center space-y-3 max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-dashed border-amber-400 flex items-center justify-center mx-auto text-amber-400 shadow-lg">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Cámara Facial en Vivo Lista
                      </h4>
                      <p className="text-xs text-slate-300 mt-1">
                        {cameraError || 'La cámara física se iniciará automáticamente. Puedes probar el reconocimiento con los perfiles del panel derecho.'}
                      </p>
                    </div>
                    <button
                      onClick={startCamera}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition-colors inline-flex items-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                      Reintentar Iniciar Cámara
                    </button>
                  </div>
                </div>
              )}

              {/* Canvas HUD Overlay for Face Tracking */}
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
              />

              {/* Status Header Overlay */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700 text-[11px] font-mono font-bold text-white shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    EN VIVO • {entryPoint}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full backdrop-blur-md text-[11px] font-black uppercase font-mono tracking-wide ${
                      direction === 'entry'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-sky-600 text-white shadow-sm'
                    }`}
                  >
                    {direction === 'entry' ? 'Ingreso Peatonal' : 'Salida Peatonal'}
                  </span>
                </div>
              </div>

              {/* Turnstile Barrier Physical State Indicator */}
              <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
                <div
                  className={`p-3 rounded-2xl backdrop-blur-md transition-all duration-300 border flex items-center justify-between ${
                    turnstileOpen
                      ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100 shadow-xl shadow-emerald-500/30'
                      : 'bg-slate-950/80 border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform ${
                        turnstileOpen
                          ? 'bg-emerald-400 text-slate-950 scale-110 font-black'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {turnstileOpen ? <Unlock className="w-5 h-5 text-slate-950" /> : <Lock className="w-5 h-5 text-amber-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <span>Torniquete Físico:</span>
                        <span
                          className={`font-black ${
                            turnstileOpen ? 'text-emerald-300 animate-pulse' : 'text-slate-300'
                          }`}
                        >
                          {turnstileOpen ? 'HABILITADO (PASO LIBRE)' : 'BLOQUEADO (EN ESPERA)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {turnstileOpen
                          ? `Sensor activado. Registro de ${direction === 'entry' ? 'entrada' : 'salida'} completado.`
                          : 'Esperando detección facial válida frente al sensor'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-300">
                      IP Torniquete: 192.168.10.21
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Scan Action Bar */}
            <div className={`p-4 border-t flex flex-wrap items-center justify-between gap-3 transition-colors ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <button
                  id="btn-scan-face"
                  onClick={handlePerformScan}
                  disabled={scanning}
                  className={`px-6 py-3 rounded-xl font-black text-xs sm:text-sm transition-all shadow-md flex items-center gap-2.5 ${
                    scanning
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : direction === 'entry'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                      : 'bg-sky-600 hover:bg-sky-500 text-white active:scale-95'
                  }`}
                >
                  <Scan className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                  <span>
                    {scanning
                      ? 'Procesando Biometría Facial...'
                      : `Escanear Rostro para ${direction === 'entry' ? 'Ingreso' : 'Salida'}`}
                  </span>
                </button>

                <button
                  id="btn-open-contingency"
                  onClick={() => setShowContingencyModal(true)}
                  className={`px-4 py-3 rounded-xl text-xs font-bold border shadow-xs transition-colors flex items-center gap-1.5 ${
                    darkMode 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                      : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pase Manual (Vigilancia)</span>
                </button>
              </div>

              <div className={`flex items-center gap-2 text-xs font-semibold ${
                darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Modelo: ResNet-50 + Detección de Parpadeo</span>
              </div>
            </div>

          </div>

          {/* Alert Banner if present */}
          {activeAlert && (
            <div className={`p-4 rounded-2xl border shadow-md flex items-start gap-3 animate-in fade-in duration-200 ${
              darkMode ? 'bg-rose-950/80 border-rose-800 text-rose-200' : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-black">{activeAlert.title}</h4>
                <p className="text-xs leading-relaxed font-medium">{activeAlert.message}</p>
              </div>
            </div>
          )}

          {/* Last Result Card */}
          {lastResult && (
            <div
              className={`p-4 rounded-2xl border shadow-md transition-all animate-in fade-in duration-200 ${
                lastResult.authorized
                  ? darkMode ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : darkMode ? 'bg-rose-950/80 border-rose-800 text-rose-200' : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      lastResult.authorized
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-rose-600 text-white shadow-xs'
                    }`}
                  >
                    {lastResult.authorized ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <XCircle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black">{lastResult.title}</h4>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                        darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                      }`}>
                        {lastResult.timestamp}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {lastResult.details}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-bold block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Certeza Neuronal
                  </span>
                  <span className={`text-base font-black font-mono ${darkMode ? 'text-amber-400' : 'text-blue-950'}`}>
                    {(lastResult.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Simulated Persona Selector & Biometric Verification */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Persona selector for testing & simulation */}
          <div className={`border rounded-3xl p-5 shadow-xs space-y-4 transition-colors ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div>
              <h3 className={`text-sm font-black flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <User className="w-4 h-4 text-blue-500" />
                <span>Perfil Frente a la Cámara</span>
              </h3>
              <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Selecciona la persona a simular frente al sensor de los torniquetes:
              </p>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {users.map((u) => {
                const isSelected = simulatedPersonId === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSimulatedPersonId(u.id);
                      setActiveAlert(null);
                    }}
                    className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? darkMode ? 'bg-blue-950/80 border-blue-600 shadow-sm' : 'bg-blue-50/70 border-blue-900 shadow-xs'
                        : darkMode ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50' : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={u.avatarUrl || AVATAR_FALLBACK}
                        alt={u.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-slate-400 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className={`text-xs font-bold truncate ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                            {u.name}
                          </h4>
                        </div>
                        <p className={`text-[11px] font-mono font-semibold ${darkMode ? 'text-amber-400' : 'text-blue-950'}`}>
                          CC: {u.documentId} • {u.role}
                        </p>
                        <p className={`text-[10px] truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {u.facultyOrDept}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className={`w-5 h-5 rounded-full border ${darkMode ? 'border-slate-700 bg-slate-950' : 'border-slate-300 bg-white'}`} />
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Option to test unknown / non-registered visitor face */}
              <button
                onClick={() => {
                  setSimulatedPersonId('unknown');
                  setActiveAlert(null);
                }}
                className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                  simulatedPersonId === 'unknown'
                    ? darkMode ? 'bg-rose-950/80 border-rose-600 shadow-sm' : 'bg-rose-50 border-rose-500 shadow-xs'
                    : darkMode ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                    <UserX className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`text-xs font-black ${darkMode ? 'text-rose-300' : 'text-rose-900'}`}>
                      Rostro No Registrado (Desconocido)
                    </h4>
                    <p className={`text-[11px] ${darkMode ? 'text-rose-400' : 'text-rose-700'}`}>
                      Simula intento de acceso sin perfil en base de datos (RF-08)
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {simulatedPersonId === 'unknown' ? (
                    <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className={`w-5 h-5 rounded-full border ${darkMode ? 'border-slate-700 bg-slate-950' : 'border-slate-300 bg-white'}`} />
                  )}
                </div>
              </button>
            </div>

            {/* Quick Helper Notice */}
            <div className={`p-3 rounded-xl border text-[11px] space-y-1 ${
              darkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <span className={`font-bold block ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                Flujo de Torniquete:
              </span>
              <p>
                Al hacer clic en <strong>Escanear Rostro</strong>, el sistema verifica las características faciales contra la colección <code className="text-amber-400 font-mono">users</code> y comanda la apertura del torniquete en la Cra 5.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* Manual Contingency Pass Modal (RF-11) */}
      {showContingencyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              darkMode ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black">
                    Pase de Contingencia Manual (RF-11)
                  </h3>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Para visitantes, contratistas o fallas en enrolamiento biométrico
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowContingencyModal(false)}
                className={`text-sm font-bold ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-700'}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleContingencySubmit} className="space-y-4">
              <div className="space-y-1">
                <label className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Dirección del Paso
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('entry')}
                    className={`py-2 rounded-xl text-xs font-black border transition-colors ${
                      direction === 'entry'
                        ? darkMode ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : 'bg-emerald-100 border-emerald-400 text-emerald-900'
                        : darkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Entrada (Ingreso)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('exit')}
                    className={`py-2 rounded-xl text-xs font-black border transition-colors ${
                      direction === 'exit'
                        ? darkMode ? 'bg-sky-950 border-sky-700 text-sky-300' : 'bg-sky-100 border-sky-400 text-sky-900'
                        : darkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Salida (Egreso)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Ej: Visitante Juan Pérez"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-hidden ${
                    darkMode 
                      ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Cédula / Documento
                  </label>
                  <input
                    type="text"
                    value={manualDoc}
                    onChange={(e) => setManualDoc(e.target.value)}
                    placeholder="1005892..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono focus:outline-hidden ${
                      darkMode 
                        ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Rol
                  </label>
                  <select
                    value={manualRole}
                    onChange={(e) => setManualRole(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-hidden ${
                      darkMode 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-900'
                    }`}
                  >
                    <option value="visitor">Visitante</option>
                    <option value="student">Estudiante</option>
                    <option value="teacher">Docente</option>
                    <option value="staff">Administrativo</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Observación de Vigilancia
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Motivo del pase manual (ej: carné en trámite, visita a secretaría)..."
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs resize-none focus:outline-hidden ${
                    darkMode 
                      ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContingencyModal(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-black transition-colors shadow-md active:scale-95"
                >
                  Habilitar Torniquete y Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
