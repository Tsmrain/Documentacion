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
          <p className="recommendation-text">
            {analisisActual.recomendacionAdaptativa.contenido}
          </p>
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
