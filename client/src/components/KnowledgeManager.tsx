import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Upload, Check, X, AlertTriangle,
  FileText, Video as YoutubeIcon, Lock, Unlock, Loader
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  FuenteConocimiento,
  TipoFuente,
  EstadoValidacion,
  TECNICAS_BJJ
} from '../models/types';

export function KnowledgeManager() {
  const { ragController, modoInstructor, toggleModoInstructor } = useApp();
  const [fuentes, setFuentes] = useState<FuenteConocimiento[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [stats, setStats] = useState({ totalChunks: 0, totalFuentes: 0 });

  // Upload form state
  const [titulo, setTitulo] = useState('');
  const [tipoFuente, setTipoFuente] = useState<TipoFuente>(TipoFuente.ManualPDF);
  const [tecnicaId, setTecnicaId] = useState(TECNICAS_BJJ[0].id);
  const [textoContenido, setTextoContenido] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allFuentes = await ragController.getFuentes();
      setFuentes(allFuentes);
      const ragStats = await ragController.getStats();
      setStats(ragStats);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePinSubmit = () => {
    const success = toggleModoInstructor(pinInput);
    if (!success) {
      setPinError(true);
      setTimeout(() => setPinError(false), 2000);
    }
    setPinInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setTextoContenido(text);
      if (!titulo) setTitulo(file.name.replace('.pdf', '').replace('.txt', ''));
    } catch {
      setTextoContenido('Error leyendo archivo. Use un archivo de texto plano (.txt).');
    }
  };

  const handleIngest = async () => {
    if (!titulo.trim() || !textoContenido.trim()) return;

    setUploading(true);
    setUploadProgress('Segmentando texto...');

    try {
      const fuente: FuenteConocimiento = {
        titulo,
        tipo: tipoFuente,
        estadoValidacion: modoInstructor
          ? EstadoValidacion.Validado
          : EstadoValidacion.Pendiente,
        tecnicaId,
        fechaCreacion: new Date(),
        youtubeUrl: tipoFuente === TipoFuente.VideoYouTube ? youtubeUrl : undefined
      };

      setUploadProgress('Generando embeddings y almacenando...');
      await ragController.ingestSource(
        fuente,
        textoContenido,
        (p) => setUploadProgress(`Indexando... ${p}%`)
      );

      setUploadProgress('¡Fuente indexada exitosamente!');
      setTimeout(() => {
        setShowUpload(false);
        setTitulo('');
        setTextoContenido('');
        setYoutubeUrl('');
        setUploading(false);
        loadData();
      }, 1500);
    } catch (error) {
      setUploadProgress(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setUploading(false);
    }
  };

  const handleValidate = async (fuenteId: number, aprobado: boolean) => {
    await ragController.validateSource(fuenteId, aprobado);
    loadData();
  };

  return (
    <div className="knowledge-manager">
      <h2 className="section-title">
        <BookOpen size={22} />
        Gestión de Conocimiento (RAG)
      </h2>

      {/* Stats */}
      <div className="glass-card stats-card">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value">{stats.totalFuentes}</span>
            <span className="stat-label">Fuentes</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.totalChunks}</span>
            <span className="stat-label">Chunks Indexados</span>
          </div>
          <div className="stat-item">
            <span className={`stat-value ${modoInstructor ? 'text-green' : 'text-muted'}`}>
              {modoInstructor ? <Unlock size={20} /> : <Lock size={20} />}
            </span>
            <span className="stat-label">{modoInstructor ? 'Instructor' : 'Alumno'}</span>
          </div>
        </div>
      </div>

      {/* Instructor PIN toggle */}
      {!modoInstructor && (
        <div className="glass-card pin-card">
          <h3 className="card-title">
            <Lock size={18} />
            Modo Instructor
          </h3>
          <p className="pin-description">Ingresa el PIN de instructor para gestionar fuentes</p>
          <div className="pin-input-group">
            <input
              type="password"
              className={`form-input pin-input ${pinError ? 'error' : ''}`}
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              placeholder="PIN"
              maxLength={8}
              onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
            />
            <button className="btn btn-primary" onClick={handlePinSubmit}>
              Acceder
            </button>
          </div>
          {pinError && <span className="pin-error">PIN incorrecto</span>}
        </div>
      )}

      {/* Upload Section (Instructor only) */}
      {modoInstructor && (
        <>
          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={() => setShowUpload(!showUpload)}
          >
            <Upload size={20} />
            Agregar Fuente
          </button>

          {showUpload && (
            <div className="glass-card upload-form-card">
              <h3 className="card-title">Nueva Fuente de Conocimiento</h3>

              <div className="form-group">
                <label className="form-label">Tipo de fuente</label>
                <div className="type-selector">
                  <button
                    className={`type-btn ${tipoFuente === TipoFuente.ManualPDF ? 'active' : ''}`}
                    onClick={() => setTipoFuente(TipoFuente.ManualPDF)}
                  >
                    <FileText size={20} />
                    Manual / PDF
                  </button>
                  <button
                    className={`type-btn ${tipoFuente === TipoFuente.VideoYouTube ? 'active' : ''}`}
                    onClick={() => setTipoFuente(TipoFuente.VideoYouTube)}
                  >
                    <YoutubeIcon size={20} />
                    YouTube
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Título</label>
                <input
                  type="text"
                  className="form-input"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ej: Jiu-Jitsu University - Cap. 3"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Técnica asociada</label>
                <select
                  className="form-select"
                  value={tecnicaId}
                  onChange={e => setTecnicaId(e.target.value)}
                >
                  {TECNICAS_BJJ.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              {tipoFuente === TipoFuente.VideoYouTube && (
                <div className="form-group">
                  <label className="form-label">URL de YouTube</label>
                  <input
                    type="url"
                    className="form-input"
                    value={youtubeUrl}
                    onChange={e => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  Contenido técnico (texto)
                </label>
                <div className="upload-text-area">
                  <textarea
                    className="form-textarea"
                    value={textoContenido}
                    onChange={e => setTextoContenido(e.target.value)}
                    placeholder="Pegue aquí el contenido técnico del manual o transcripción del video..."
                    rows={8}
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={14} />
                    Cargar archivo .txt
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.srt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {uploading ? (
                <div className="upload-status">
                  <Loader size={20} className="spin" />
                  <span>{uploadProgress}</span>
                </div>
              ) : (
                <button
                  className="btn btn-primary btn-lg btn-full"
                  onClick={handleIngest}
                  disabled={!titulo.trim() || !textoContenido.trim()}
                >
                  Indexar Fuente
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Fuentes List */}
      <div className="fuentes-list">
        <h3 className="list-title">Fuentes Registradas</h3>
        {fuentes.length === 0 ? (
          <div className="glass-card empty-fuentes">
            <p>No hay fuentes de conocimiento registradas aún.</p>
          </div>
        ) : (
          fuentes.map(f => (
            <div key={f.id} className="glass-card fuente-card">
              <div className="fuente-header">
                {f.tipo === TipoFuente.ManualPDF
                  ? <FileText size={18} />
                  : <YoutubeIcon size={18} />}
                <span className="fuente-titulo">{f.titulo}</span>
                <span className={`validation-badge ${f.estadoValidacion.toLowerCase()}`}>
                  {f.estadoValidacion}
                </span>
              </div>
              <div className="fuente-meta">
                <span>
                  Técnica: {TECNICAS_BJJ.find(t => t.id === f.tecnicaId)?.nombre || f.tecnicaId}
                </span>
                <span>
                  {new Date(f.fechaCreacion).toLocaleDateString('es-BO')}
                </span>
              </div>

              {/* Validation buttons (Instructor, CU05) */}
              {modoInstructor && f.estadoValidacion === EstadoValidacion.Pendiente && (
                <div className="validation-actions">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleValidate(f.id!, true)}
                  >
                    <Check size={14} />
                    Aprobar
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleValidate(f.id!, false)}
                  >
                    <X size={14} />
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
