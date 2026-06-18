import React, { useState, useRef } from 'react';
import { Upload, Camera, Play, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TECNICAS_BJJ, Cinturon } from '../models/types';
import { ProcessingView } from './ProcessingView';

export function VideoUploader() {
  const { analyzeVideo, procesando, analisisActual, error, clearError, usuario } = useApp();
  const [selectedTecnica, setSelectedTecnica] = useState(TECNICAS_BJJ[0].id);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Filtrar técnicas por cinturón del usuario
  const cinturonOrder = Object.values(Cinturon);
  const userCinturonIndex = cinturonOrder.indexOf(usuario?.cinturon || Cinturon.Blanco);
  const tecnicasDisponibles = TECNICAS_BJJ.filter(t => {
    const tecCinturonIndex = cinturonOrder.indexOf(t.cinturonRequerido);
    return tecCinturonIndex <= userCinturonIndex;
  });

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

  const handleAnalyze = async () => {
    if (!videoFile) return;

    setLocalError(null);

    // Validar duración en el cliente
    if (videoRef.current && videoRef.current.duration > 45) {
      setLocalError(`Video no válido. Máximo 45 segundos. Su video dura ${Math.round(videoRef.current.duration)} segundos.`);
      return;
    }

    const blob = new Blob([await videoFile.arrayBuffer()], { type: videoFile.type });
    await analyzeVideo(blob, selectedTecnica);
  };

  const handleClear = () => {
    setVideoFile(null);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
    setLocalError(null);
    clearError();
    if (fileInputRef.current) fileInputRef.current.value = '';
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
          Carga un video de tu ejecución técnica (máx. 45 seg)
        </p>

        {/* Selector de Técnica */}
        <div className="form-group">
          <label className="form-label">Técnica a evaluar</label>
          <select
            id="select-tecnica"
            className="form-select"
            value={selectedTecnica}
            onChange={e => setSelectedTecnica(e.target.value)}
          >
            {tecnicasDisponibles.map(t => (
              <option key={t.id} value={t.id}>
                {t.nombre} ({t.categoria}) — {t.cinturonRequerido}
              </option>
            ))}
          </select>
        </div>

        {/* Zona de Upload */}
        {!videoFile ? (
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
                Cambiar video
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
