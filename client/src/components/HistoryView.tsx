import React, { useEffect, useState } from 'react';
import { Trash2, Calendar, Target, Award, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AnalisisBiomecanico } from '../models/types';

export function HistoryView() {
  const { historial, loadHistory, deleteAnalysis, setAnalisisActual, setVistaActual } = useApp();
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDelete = async (id: number) => {
    if (confirmDelete === id) {
      await deleteAnalysis(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      // Auto-cancel after 3 seconds
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-moderate';
    return 'score-poor';
  };

  // CP04: Historial vacío
  if (historial.length === 0) {
    return (
      <div className="history-view">
        <div className="glass-card empty-state">
          <div className="empty-content">
            <span className="empty-emoji">🥋</span>
            <h2>¡Tu historial está vacío!</h2>
            <p>Realiza tu primer análisis biomecánico para empezar a rastrear tu progreso.</p>
            <p className="empty-motivation">
              <em>"Un cinturón negro fue un cinturón blanco que no se rindió."</em>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="history-view">
      <div className="history-header">
        <h2 className="section-title">
          <Calendar size={22} />
          Historial de Análisis
        </h2>
        <span className="history-count">{historial.length} registros</span>
      </div>

      <div className="history-list">
        {historial.map((analisis) => (
          <div
            key={analisis.id}
            className="glass-card history-card clickable"
            onClick={() => {
              setAnalisisActual(analisis);
              setVistaActual('analisis');
            }}
            title="Clic para ver reporte biomecánico detallado"
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <div className="history-card-header">
              <div className="history-score-container">
                <div className={`history-score ${getScoreColor(analisis.puntuacionGeneral)}`}>
                  {analisis.puntuacionGeneral}
                </div>
              </div>
              <div className="history-info">
                <h3 className="history-tecnica">{analisis.tecnicaNombre}</h3>
                <p className="history-date">
                  {new Date(analisis.fecha).toLocaleDateString('es-BO', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <button
                className={`btn-icon ${confirmDelete === analisis.id ? 'btn-danger' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(analisis.id!);
                }}
                title={confirmDelete === analisis.id ? 'Confirmar eliminación' : 'Eliminar'}
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="history-card-body">
              {/* Resumen de luchadores si existen (Formato OpenBJJ) */}
              {analisis.fighters && analisis.fighters.length > 0 ? (
                <div className="history-fighters-summary" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  {analisis.fighters.map((fighter: any, fIdx: number) => (
                    <div key={fIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        flexShrink: 0,
                        background: fighter.status === 'approved' ? 'var(--accent-green)' : 'var(--accent-primary)'
                      }}>
                        {fighter.status === 'approved' ? '✓' : '!'}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{fighter.role.split(' ')[0]}:</span>
                      <span style={{ color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                        {fighter.techniques.slice(0, 2).join(', ') || 'Posturas básicas'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Errores resumen (Legacy/Backwards compatible) */}
                  <div className="history-errors-summary">
                    {analisis.errores.length > 0 ? (
                      <>
                        <Target size={14} />
                        <span>{analisis.errores.length} error{analisis.errores.length !== 1 ? 'es' : ''} detectado{analisis.errores.length !== 1 ? 's' : ''}</span>
                      </>
                    ) : (
                      <>
                        <Award size={14} />
                        <span className="text-green">Sin errores detectados</span>
                      </>
                    )}
                  </div>

                  {/* Tags de errores */}
                  {analisis.errores.length > 0 && (
                    <div className="history-error-tags">
                      {analisis.errores.slice(0, 3).map((e, i) => (
                        <span key={i} className={`error-tag severity-${e.severidad}`}>
                          {e.articulacion}
                        </span>
                      ))}
                      {analisis.errores.length > 3 && (
                        <span className="error-tag more">+{analisis.errores.length - 3}</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Confirm delete banner */}
            {confirmDelete === analisis.id && (
              <div className="confirm-delete-banner">
                <AlertCircle size={14} />
                <span>Toca de nuevo para confirmar la eliminación</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
