import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Target,
  Zap,
  BookOpen,
  TrendingUp
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Severidad } from '../models/types';

export function TacticalReport() {
  const { analisisActual, clearAnalisisActual } = useApp();

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

  return (
    <div className="tactical-report">
      {/* Header con botón volver */}
      <button className="btn btn-ghost btn-back" onClick={clearAnalisisActual}>
        <ArrowLeft size={20} />
        Nuevo Análisis
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

      {/* Puntos Fuertes */}
      {analisisActual.puntosFuertes.length > 0 && (
        <div className="glass-card strengths-card">
          <h3 className="card-title">
            <CheckCircle size={20} className="text-green" />
            Puntos Fuertes
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

      {/* Errores Biomecánicos */}
      {analisisActual.errores.length > 0 && (
        <div className="glass-card errors-card">
          <h3 className="card-title">
            <Target size={20} className="text-orange" />
            Errores Biomecánicos Detectados
          </h3>
          <div className="errors-list">
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
                      Error recurrente — Estrategia pedagógica adaptada
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

      {/* Recomendación Adaptativa */}
      <div className="glass-card recommendation-card">
        <h3 className="card-title">
          <Zap size={20} className="text-yellow" />
          Recomendación Adaptativa
        </h3>
        <div className="recommendation-content">
          <span className={`strategy-badge strategy-${analisisActual.recomendacionAdaptativa.tipoEstrategia}`}>
            {analisisActual.recomendacionAdaptativa.tipoEstrategia === 'tecnica'
              ? '🎯 Técnica'
              : analisisActual.recomendacionAdaptativa.tipoEstrategia === 'drill'
              ? '💪 Drill'
              : '🧠 Explicación Anatómica'}
          </span>
          <p className="recommendation-text" style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>
            {displayContenido}
          </p>

          {ytVideo && (
            <div className="support-video-container" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="video-responsive" style={{ overflow: 'hidden', paddingBottom: '56.25%', position: 'relative', height: 0, borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <iframe
                  style={{ left: 0, top: 0, height: '100%', width: '100%', position: 'absolute', border: 'none', borderRadius: '8px' }}
                  src={`https://www.youtube.com/embed/${ytVideo.id}`}
                  title="Video de soporte sugerido"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <a
                href={ytVideo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: 'flex-start', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '6px' }}
              >
                🎥 Ver en YouTube ↗
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Próxima Técnica */}
      {analisisActual.proximaTecnicaSugerida && (
        <div className="glass-card next-card">
          <h3 className="card-title">
            <TrendingUp size={20} className="text-blue" />
            Siguiente Paso
          </h3>
          <p className="next-technique">
            Próxima técnica sugerida: <strong>{analisisActual.proximaTecnicaSugerida}</strong>
          </p>
        </div>
      )}

      {/* Errores vacíos */}
      {analisisActual.errores.length === 0 && (
        <div className="glass-card perfect-card">
          <div className="perfect-content">
            <span className="perfect-emoji">🏆</span>
            <h3>¡Ejecución Excelente!</h3>
            <p>No se detectaron errores biomecánicos significativos. ¡Sigue así!</p>
          </div>
        </div>
      )}
    </div>
  );
}
