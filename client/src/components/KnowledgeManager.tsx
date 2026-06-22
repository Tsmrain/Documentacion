import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Upload, FileText, Video as YoutubeIcon, Loader, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  FuenteConocimiento,
  TipoFuente,
  EstadoValidacion,
  TECNICAS_BJJ
} from '../models/types';

export function KnowledgeManager() {
  const { ragController } = useApp();
  const [fuentes, setFuentes] = useState<FuenteConocimiento[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [stats, setStats] = useState({ totalChunks: 0, totalFuentes: 0 });

  // Upload form state
  const [tipoFuente, setTipoFuente] = useState<TipoFuente>(TipoFuente.ManualPDF);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [selectedFuente, setSelectedFuente] = useState<FuenteConocimiento | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

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

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
  };

  const handleIngest = async () => {
    if (tipoFuente === TipoFuente.ManualPDF && !pdfFile) return;
    if (tipoFuente === TipoFuente.VideoYouTube && !youtubeUrl.trim()) return;

    setErrorMsg(null);
    setUploading(true);
    setUploadProgress('Enviando fuente al servidor...');

    try {
      const fuente: FuenteConocimiento = {
        titulo: '', // Se autodetectará en el servidor
        tipo: tipoFuente,
        estadoValidacion: EstadoValidacion.Validado,
        tecnicaId: '', // Se autodetectará en el servidor
        fechaCreacion: new Date(),
        youtubeUrl: tipoFuente === TipoFuente.VideoYouTube ? youtubeUrl : undefined
      };

      setUploadProgress('Procesando e indexando contenido...');
      await ragController.ingestSource(
        fuente,
        undefined,
        pdfFile || undefined,
        (p) => setUploadProgress(`Indexando... ${p}%`)
      );

      setUploadProgress('¡Fuente indexada exitosamente!');
      setTimeout(() => {
        setShowUpload(false);
        setPdfFile(null);
        setYoutubeUrl('');
        setUploading(false);
        loadData();
      }, 1500);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      if (msg.includes('no está relacionado con Brazilian Jiu-Jitsu') || msg.toLowerCase().includes('rechazado')) {
        setErrorMsg('⚠️ Solo se acepta contenido relacionado a Brazilian Jiu-Jitsu. La Inteligencia Artificial determinó que el recurso provisto no es relevante para el tatami.');
      } else {
        setErrorMsg(`Error al procesar: ${msg}`);
      }
      setUploading(false);
    }
  };

  const handleDeleteSource = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      try {
        await ragController.deleteSource(id);
        setConfirmDeleteId(null);
        loadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al eliminar fuente');
      }
    } else {
      setConfirmDeleteId(id);
      // Cancel confirm after 4 seconds
      setTimeout(() => setConfirmDeleteId(null), 4000);
    }
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
        </div>
      </div>

      {/* Upload Section */}
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

          {errorMsg && (
            <div className="glass-card error-banner text-danger" style={{ padding: '12px', marginBottom: '16px', background: 'rgba(230, 57, 70, 0.1)', borderColor: 'rgba(230, 57, 70, 0.3)', borderRadius: '8px', fontSize: '13px', lineHeight: '1.4' }}>
              {errorMsg}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Tipo de fuente</label>
            <div className="type-selector">
              <button
                className={`type-btn ${tipoFuente === TipoFuente.ManualPDF ? 'active' : ''}`}
                onClick={() => {
                  setTipoFuente(TipoFuente.ManualPDF);
                }}
              >
                <FileText size={20} />
                Manual / PDF
              </button>
              <button
                className={`type-btn ${tipoFuente === TipoFuente.VideoYouTube ? 'active' : ''}`}
                onClick={() => {
                  setTipoFuente(TipoFuente.VideoYouTube);
                }}
              >
                <YoutubeIcon size={20} />
                YouTube
              </button>
            </div>
          </div>

          {/* Título y técnica se autodetectan de forma inteligente mediante IA */}

          {tipoFuente === TipoFuente.ManualPDF ? (
            <div className="form-group">
              <label className="form-label">Archivo PDF del Manual</label>
              <div className="upload-text-area" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  className="btn btn-ghost btn-lg btn-full"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <Upload size={18} />
                  {pdfFile ? `Cambiar archivo PDF` : `Seleccionar archivo PDF`}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfChange}
                  className="hidden"
                />
                {pdfFile && (
                  <div className="file-info text-green" style={{ fontSize: '14px', textAlign: 'center', marginTop: '4px' }}>
                    📄 {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Enlace / URL de YouTube</label>
              <input
                type="url"
                className="form-input"
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          )}

          {uploading ? (
            <div className="upload-status">
              <Loader size={20} className="spin" />
              <span>{uploadProgress}</span>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-lg btn-full"
              onClick={handleIngest}
              disabled={
                (tipoFuente === TipoFuente.ManualPDF && !pdfFile) ||
                (tipoFuente === TipoFuente.VideoYouTube && !youtubeUrl.trim())
              }
            >
              Indexar Fuente de Forma Inteligente
            </button>
          )}
        </div>
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
            <div key={f.id} className="glass-card fuente-card clickable" onClick={() => setSelectedFuente(f)} title="Clic para previsualizar">
              <div className="fuente-header">
                {f.tipo === TipoFuente.ManualPDF
                  ? <FileText size={18} />
                  : <YoutubeIcon size={18} />}
                <span className="fuente-titulo">{f.titulo}</span>
                <span className={`validation-badge ${f.estadoValidacion.toLowerCase()}`}>
                  {f.estadoValidacion}
                </span>
                {f.id !== undefined && (
                  <button
                    className={`btn-icon ${confirmDeleteId === f.id ? 'btn-danger' : 'btn-danger-hover'}`}
                    onClick={(e) => handleDeleteSource(f.id!, e)}
                    title={confirmDeleteId === f.id ? "Haga clic de nuevo para confirmar eliminación" : "Eliminar fuente"}
                    style={{ background: 'transparent', border: 'none', color: confirmDeleteId === f.id ? 'var(--severity-critical)' : 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="fuente-meta">
                <span>
                  Técnicas: {f.tecnicaId ? f.tecnicaId.split(',').map(id => TECNICAS_BJJ.find(t => t.id === id.trim())?.nombre || id.trim()).join(', ') : 'general'}
                </span>
                {confirmDeleteId === f.id ? (
                  <span
                    className="text-danger"
                    style={{ fontWeight: 600, fontSize: '0.65rem', animation: 'pulse 1s infinite', cursor: 'pointer', color: 'var(--severity-critical)' }}
                    onClick={(e) => handleDeleteSource(f.id!, e)}
                  >
                    ⚠️ ¿Confirmar eliminación?
                  </span>
                ) : (
                  <span>
                    {new Date(f.fechaCreacion).toLocaleDateString('es-BO')}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedFuente && (
        <div className="modal-overlay" onClick={() => setSelectedFuente(null)}>
          <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedFuente.titulo}</h3>
              <button className="btn-close" onClick={() => setSelectedFuente(null)}>×</button>
            </div>
            <div className="modal-meta-badges">
              <span className="badge-type">
                {selectedFuente.tipo === TipoFuente.ManualPDF ? '📄 PDF' : '🎥 YouTube'}
              </span>
              <span className="badge-techniques">
                Técnicas: {selectedFuente.tecnicaId ? selectedFuente.tecnicaId.split(',').map(id => TECNICAS_BJJ.find(t => t.id === id.trim())?.nombre || id.trim()).join(', ') : 'general'}
              </span>
            </div>
            <div className="modal-body scrollable">
              {selectedFuente.contenidoOriginal ? (
                <p className="source-content-text">{selectedFuente.contenidoOriginal}</p>
              ) : (
                <p className="no-content-text">No hay contenido de texto disponible para previsualizar.</p>
              )}
            </div>
            {selectedFuente.youtubeUrl && (
              <div className="modal-footer">
                <a
                  href={selectedFuente.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm btn-full"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <YoutubeIcon size={16} />
                  Ver video en YouTube
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
