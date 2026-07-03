import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Play, AlertTriangle, Square, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProcessingView } from './ProcessingView';

export function VideoUploader() {
  const { analyzeVideo, procesando, analisisActual, error, clearError } = useApp();
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('top');

  // Estados de cámara y grabación
  const [cameraActive, setCameraActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalError(null);
    clearError();

    // Validar formato
    if (!file.type.startsWith('video/')) {
      setLocalError('Por favor seleccione un archivo de video válido.');
      return;
    }

    // Validar tamaño (máx 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setLocalError('El archivo es demasiado grande. Máximo 100MB.');
      return;
    }

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
  };

  const startCamera = async () => {
    try {
      setLocalError(null);
      clearError();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false // La biomecánica posicional no requiere audio
      });

      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Error accediendo a la cámara:', err);
      setLocalError('No se pudo acceder a la cámara. Por favor verifique los permisos en su navegador.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startRecording = async () => {
    setLocalError(null);
    clearError();

    if (!streamRef.current) {
      await startCamera();
    }

    if (!streamRef.current) return;

    const chunks: BlobPart[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9' });
    } catch (e) {
      try {
        recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
      } catch (e2) {
        recorder = new MediaRecorder(streamRef.current);
      }
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const file = new File([blob], 'grabacion_camara.webm', { type: 'video/webm' });
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
      stopCamera();
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 44) {
          stopRecording();
          return 45;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const handleAnalyze = async () => {
    if (!videoFile) return;

    setLocalError(null);

    // Validar duración en el cliente
    if (videoRef.current && videoRef.current.duration > 45) {
      setLocalError(`Video no válido. Máximo 45 segundos. Su video dura ${Math.round(videoRef.current.duration)} segundos.`);
      return;
    }

    const blob = new Blob([await videoFile.arrayBuffer()], { type: videoFile.type });
    await analyzeVideo(blob, userRole);
  };

  const handleClear = () => {
    setVideoFile(null);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
    setLocalError(null);
    clearError();
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Si está en modo grabación, reactivar cámara para un nuevo intento
    if (activeTab === 'record') {
      startCamera();
    }
  };

  const switchTab = (tab: 'upload' | 'record') => {
    setActiveTab(tab);
    setLocalError(null);
    clearError();
    if (tab === 'record') {
      startCamera();
    } else {
      stopCamera();
    }
  };

  // Si está procesando, mostrar vista de procesamiento
  if (procesando) {
    return <ProcessingView />;
  }

  // Si hay un análisis actual, no mostrar uploader (TacticalReport lo maneja)
  if (analisisActual) return null;

  const displayError = localError || error;

  return (
    <div className="video-uploader">
      <div className="glass-card uploader-card">
        <h2 className="card-title">
          <Camera size={24} />
          Análisis Biomecánico
        </h2>
        <p className="card-subtitle">
          Carga o graba un video de tu ejecución técnica (máx. 45 seg)
        </p>

        {/* Selector de Pestañas */}
        {!videoFile && (
          <div className="uploader-tabs">
            <button
              className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => switchTab('upload')}
            >
              <Upload size={16} />
              Subir Video
            </button>
            <button
              className={`tab-btn ${activeTab === 'record' ? 'active' : ''}`}
              onClick={() => switchTab('record')}
            >
              <Camera size={16} />
              Grabar con Cámara
            </button>
          </div>
        )}

        {/* Zona de Upload / Grabación */}
        {!videoFile ? (
          activeTab === 'upload' ? (
            <div
              className="upload-zone"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={48} className="upload-icon" />
              <p className="upload-text">Toca para seleccionar video</p>
              <p className="upload-hint">Formatos: MP4, WebM, MOV • Máx. 45 seg</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="video-input"
              />
            </div>
          ) : (
            <div className="camera-recorder-container">
              <div className="camera-viewport">
                <video
                  ref={liveVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`camera-live-stream ${cameraActive ? 'active' : ''}`}
                />
                {!cameraActive && !recording && (
                  <div className="camera-placeholder">
                    <Camera size={48} className="placeholder-icon" />
                    <button className="btn btn-secondary" onClick={startCamera}>
                      Activar Cámara
                    </button>
                  </div>
                )}
                {recording && (
                  <div className="recording-indicator">
                    <span className="recording-dot"></span>
                    <span className="recording-timer">00:{recordingTime.toString().padStart(2, '0')}</span>
                  </div>
                )}
              </div>

              <div className="camera-controls">
                {cameraActive && !recording && (
                  <button className="btn btn-primary record-start-btn" onClick={startRecording}>
                    <span className="dot-icon"></span>
                    Iniciar Grabación
                  </button>
                )}
                {recording && (
                  <button className="btn btn-danger record-stop-btn" onClick={stopRecording}>
                    <Square size={16} fill="currentColor" />
                    Detener Grabación
                  </button>
                )}
                {cameraActive && !recording && (
                  <button className="btn btn-ghost" onClick={stopCamera}>
                    Desactivar Cámara
                  </button>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="video-preview-container">
            <video
              ref={videoRef}
              src={videoPreview || undefined}
              controls
              className="video-preview"
              playsInline
            />
            <div className="video-info">
              <span className="file-name">{videoFile.name}</span>
              <span className="file-size">
                {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            </div>
            
            <div className="role-selector-container" style={{ margin: '16px 0', background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                🥋 Identifica tu vestimenta en el video:
              </span>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-glass)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="white">Gi Blanco / Vestimenta Clara</option>
                <option value="blue">Gi Azul / Vestimenta Oscura</option>
              </select>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                La IA rastrea el color de tu vestimenta a lo largo del combate (inicie de pie o en el suelo) para asignar tus métricas y progresos de forma correcta.
              </p>
            </div>

            <div className="video-actions">
              <button
                id="btn-analyze"
                className="btn btn-primary btn-lg"
                onClick={handleAnalyze}
                disabled={procesando}
              >
                <Play size={20} />
                Analizar Técnica
              </button>
              <button
                className="btn btn-ghost"
                onClick={handleClear}
              >
                {activeTab === 'record' ? 'Grabar de nuevo' : 'Cambiar video'}
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {displayError && (
          <div className="error-banner">
            <AlertTriangle size={20} />
            <span>{displayError}</span>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="glass-card info-card">
        <h3 className="info-title">💡 Consejos para un buen análisis</h3>
        <ul className="info-list">
          <li>Graba con el cuerpo completo visible en el encuadre</li>
          <li>Asegura buena iluminación y contraste con el fondo</li>
          <li>Evita oclusiones severas (no cubrir partes del cuerpo)</li>
          <li>Tu video se procesa localmente — nunca sale de tu dispositivo</li>
        </ul>
      </div>
    </div>
  );
}
