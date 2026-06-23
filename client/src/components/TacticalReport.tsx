import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Target,
  Zap,
  TrendingUp,
  Play,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Severidad } from '../models/types';

export function TacticalReport() {
  const { analisisActual, clearAnalisisActual } = useApp();
  const [activeFighterIndex, setActiveFighterIndex] = useState(0);

  if (!analisisActual) return null;

  // Extrae la URL de YouTube y el ID del video si existe en el texto
  const extractYoutubeVideo = (text: string) => {
    const regex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11}))/i;
    const match = text.match(regex);
    if (match) {
      // Limpiar texto eliminando la URL y frases introductorias del link al final
      const clean = text
        .replace(match[1], '')
        .replace(/video de soporte:?\s*$/i, '')
        .replace(/video de apoyo:?\s*$/i, '')
        .trim();
      return {
        url: match[1],
        id: match[2],
        cleanText: clean
      };
    }
    return null;
  };

  const ytVideo = extractYoutubeVideo(analisisActual.recomendacionAdaptativa.contenido);
  const displayContenido = ytVideo ? ytVideo.cleanText : analisisActual.recomendacionAdaptativa.contenido;

  const getSeverityConfig = (severidad: string) => {
    switch (severidad) {
      case Severidad.Critico:
        return { color: 'severity-critical', icon: <XCircle size={18} />, label: 'Crítico' };
      case Severidad.Moderado:
        return { color: 'severity-moderate', icon: <AlertTriangle size={18} />, label: 'Moderado' };
      case Severidad.Leve:
      default:
        return { color: 'severity-mild', icon: <CheckCircle size={18} />, label: 'Leve' };
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-moderate';
    return 'score-poor';
  };

  const hasFighters = Array.isArray(analisisActual.fighters) && analisisActual.fighters.length > 0;
  const activeFighter = hasFighters ? analisisActual.fighters![activeFighterIndex] : null;

  const handleOpenReferenceVideo = () => {
    if (activeFighter?.youtube_query) {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(activeFighter.youtube_query + ' BJJ tutorial')}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (ytVideo) {
      window.open(ytVideo.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="tactical-report">
      {/* Header con botón volver */}
      <button className="btn btn-ghost btn-back" onClick={clearAnalisisActual}>
        <ArrowLeft size={20} />
        Volver a Historial
      </button>

      {/* Score Card */}
      <div className="glass-card score-card">
        <div className="score-display">
          <div className={`score-circle ${getScoreColor(analisisActual.puntuacionGeneral)}`}>
            <span className="score-number">{analisisActual.puntuacionGeneral}</span>
            <span className="score-label">/ 100</span>
          </div>
          <div className="score-info">
            <h2 className="report-title">{analisisActual.tecnicaNombre}</h2>
            <p className="report-date">
              {new Date(analisisActual.fecha).toLocaleDateString('es-BO', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Two Fighter Switcher (Tsmrain / OpenBJJ Layout) */}
      {hasFighters && (
        <div className="fighter-section" style={{ marginTop: '20px' }}>
          <div className="fighter-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border-glass)' }}>
            {analisisActual.fighters!.map((fighter, idx) => (
              <button
                key={idx}
                className={`btn ${activeFighterIndex === idx ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveFighterIndex(idx)}
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem', borderRadius: '10px', border: 'none', transition: 'all 0.2s', cursor: 'pointer', background: activeFighterIndex === idx ? 'var(--accent-primary)' : 'transparent', color: activeFighterIndex === idx ? '#fff' : 'var(--text-secondary)' }}
              >
                {fighter.role}
              </button>
            ))}
          </div>

          {activeFighter && (
            <div className="fighter-detail-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Status Banner */}
              <div 
                className="status-banner" 
                style={{
                  background: activeFighter.status === 'approved' ? 'linear-gradient(135deg, #06d6a0 0%, #05a87e 100%)' : 'linear-gradient(135deg, #f4a261 0%, #e76f51 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  color: '#ffffff',
                  boxShadow: 'var(--glass-shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ background: 'rgba(255,255,255,0.2)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {activeFighter.status === 'approved' ? (
                    <Check size={28} strokeWidth={3} />
                  ) : (
                    <AlertTriangle size={28} />
                  )}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', margin: 0, textTransform: 'uppercase' }}>
                  {activeFighter.status === 'approved' ? 'POSTURA APROBADA' : 'CORRECCIÓN REQUERIDA'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', opacity: 0.95, maxWidth: '480px' }}>
                  {activeFighter.summary}
                </p>
              </div>

              {/* Detected Techniques */}
              {activeFighter.techniques.length > 0 && (
                <div className="glass-card" style={{ padding: '16px' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Técnicas Detectadas</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {activeFighter.techniques.map((tech, i) => (
                      <span key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', borderRadius: '99px', padding: '6px 14px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Mistakes */}
              {activeFighter.status === 'correction_needed' && activeFighter.mistakes.length > 0 && (
                <div 
                  className="mistakes-card" 
                  style={{ 
                    borderLeft: '4px solid var(--severity-critical)', 
                    background: 'rgba(230, 57, 70, 0.05)', 
                    borderRadius: '12px', 
                    padding: '16px',
                    boxShadow: 'var(--glass-shadow)'
                  }}
                >
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--severity-critical)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={16} />
                    Errores Críticos Detectados
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activeFighter.mistakes.map((mistake, i) => (
                      <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {mistake}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvement Plan (Tips) */}
              {activeFighter.tips.length > 0 && (
                <div 
                  className="tips-card" 
                  style={{ 
                    borderLeft: '4px solid var(--accent-green)', 
                    background: 'rgba(6, 214, 160, 0.05)', 
                    borderRadius: '12px', 
                    padding: '16px',
                    boxShadow: 'var(--glass-shadow)'
                  }}
                >
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-green)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={16} />
                    Plan de Mejora Adaptativo
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activeFighter.tips.map((tip, i) => (
                      <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Learning Resources */}
              <div className="resources-section" style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <button 
                  className="btn btn-ghost" 
                  onClick={handleOpenReferenceVideo}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <Play size={18} />
                  Video de Soporte
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Biomechanical Errors (For detailed angular metrics inspection) */}
      {analisisActual.errores.length > 0 && (
        <div className="glass-card errors-card" style={{ marginTop: '20px' }}>
          <h3 className="card-title">
            <Target size={20} className="text-orange" />
            Métricas Biomecánicas e Inclinación Articular
          </h3>
          <div className="errors-list" style={{ marginTop: '10px' }}>
            {analisisActual.errores.map((error, i) => {
              const config = getSeverityConfig(error.severidad);
              return (
                <div key={i} className={`error-item ${config.color}`}>
                  <div className="error-header">
                    {config.icon}
                    <span className="error-articulation">{error.articulacion}</span>
                    <span className={`severity-badge ${config.color}`}>{config.label}</span>
                  </div>
                  <p className="error-description">{error.descripcionFallo}</p>
                  <div className="error-metrics">
                    <span>Ángulo medido: <strong>{error.anguloMedido}°</strong></span>
                    <span>Ángulo ideal: <strong>{error.anguloIdeal}°</strong></span>
                    <span>Desviación: <strong>{error.desviacion}°</strong></span>
                  </div>
                  {error.esRecurrente && (
                    <div className="recurrent-badge">
                      <AlertTriangle size={14} />
                      Error recurrente — Estrategia adaptativa aplicada
                    </div>
                  )}
                  <div className="error-recommendation">
                    <BookOpen size={14} />
                    <span>{error.recomendacion}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Puntos Fuertes (If no fighters object was evaluated or if available) */}
      {!hasFighters && analisisActual.puntosFuertes.length > 0 && (
        <div className="glass-card strengths-card" style={{ marginTop: '20px' }}>
          <h3 className="card-title">
            <CheckCircle size={20} className="text-green" />
            Puntos Fuertes Generales
          </h3>
          <ul className="strengths-list">
            {analisisActual.puntosFuertes.map((punto, i) => (
              <li key={i} className="strength-item">
                <span className="strength-dot" />
                {punto}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Adaptive recommendations content (Legacy / Backward compatible block) */}
      {!hasFighters && (
        <div className="glass-card recommendation-card" style={{ marginTop: '20px' }}>
          <h3 className="card-title">
            <Zap size={20} className="text-yellow" />
            Recomendación General
          </h3>
          <div className="recommendation-content">
            <span className={`strategy-badge strategy-${analisisActual.recomendacionAdaptativa.tipoEstrategia}`}>
              {analisisActual.recomendacionAdaptativa.tipoEstrategia === 'tecnica'
                ? '🎯 Técnica'
                : analisisActual.recomendacionAdaptativa.tipoEstrategia === 'drill'
                ? '💪 Drill'
                : '🧠 Explicación Anatómica'}
            </span>
            <p className="recommendation-text" style={{ whiteSpace: 'pre-line', lineHeight: '1.5', marginTop: '10px' }}>
              {displayContenido}
            </p>
          </div>
        </div>
      )}

      {/* Próxima Técnica */}
      {analisisActual.proximaTecnicaSugerida && (
        <div className="glass-card next-card" style={{ marginTop: '20px' }}>
          <h3 className="card-title">
            <TrendingUp size={20} className="text-blue" />
            Siguiente Paso
          </h3>
          <p className="next-technique">
            Próxima técnica sugerida: <strong>{analisisActual.proximaTecnicaSugerida}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
