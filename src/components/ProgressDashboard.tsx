import React, { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle, Target, Award, BarChart3 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AnalisisBiomecanico } from '../models/types';

interface ErrorStat {
  articulacion: string;
  count: number;
  recurrencia: number;
  estancada: boolean;
}

export function ProgressDashboard() {
  const { historial, loadHistory, usuario } = useApp();
  const [errorStats, setErrorStats] = useState<ErrorStat[]>([]);
  const [promedioScore, setPromedioScore] = useState(0);
  const [tendencia, setTendencia] = useState<'mejorando' | 'estable' | 'declinando'>('estable');

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (historial.length < 1) return;

    // Calcular promedio
    const avg = historial.reduce((s, a) => s + a.puntuacionGeneral, 0) / historial.length;
    setPromedioScore(Math.round(avg));

    // Calcular tendencia (comparar últimos 3 con anteriores)
    if (historial.length >= 6) {
      const recent = historial.slice(0, 3);
      const older = historial.slice(3, 6);
      const recentAvg = recent.reduce((s, a) => s + a.puntuacionGeneral, 0) / 3;
      const olderAvg = older.reduce((s, a) => s + a.puntuacionGeneral, 0) / 3;
      if (recentAvg > olderAvg + 5) setTendencia('mejorando');
      else if (recentAvg < olderAvg - 5) setTendencia('declinando');
      else setTendencia('estable');
    }

    // Calcular estadísticas de errores
    const errorMap: Record<string, { count: number; analyses: Set<number> }> = {};
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentHistory = historial.filter(a => new Date(a.fecha) >= last30Days);

    for (const analisis of recentHistory) {
      for (const error of analisis.errores) {
        if (!errorMap[error.articulacion]) {
          errorMap[error.articulacion] = { count: 0, analyses: new Set() };
        }
        errorMap[error.articulacion].count++;
        errorMap[error.articulacion].analyses.add(analisis.id!);
      }
    }

    const stats: ErrorStat[] = Object.entries(errorMap).map(([art, data]) => ({
      articulacion: art,
      count: data.count,
      recurrencia: recentHistory.length > 0
        ? Math.round((data.analyses.size / recentHistory.length) * 100)
        : 0,
      estancada: recentHistory.length >= 3 && data.analyses.size / recentHistory.length > 0.7
    }));

    setErrorStats(stats.sort((a, b) => b.recurrencia - a.recurrencia));
  }, [historial]);

  // CU03: Extensión 2a - Historial insuficiente
  if (historial.length < 3) {
    return (
      <div className="progress-dashboard">
        <div className="glass-card empty-state">
          <div className="empty-content">
            <span className="empty-emoji">📊</span>
            <h2>¡Sigue entrenando!</h2>
            <p>Necesitamos al menos 3 análisis para personalizar tu ruta de aprendizaje.</p>
            <div className="progress-mini">
              <div className="progress-dots">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className={`progress-dot ${i < historial.length ? 'filled' : ''}`}
                  />
                ))}
              </div>
              <span className="progress-label">{historial.length} de 3 análisis</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="progress-dashboard">
      <h2 className="section-title">
        <TrendingUp size={22} />
        Mi Progreso
      </h2>

      {/* Score Overview */}
      <div className="glass-card overview-card">
        <div className="overview-grid">
          <div className="overview-item">
            <span className="overview-value">{promedioScore}</span>
            <span className="overview-label">Puntuación Promedio</span>
          </div>
          <div className="overview-item">
            <span className="overview-value">{historial.length}</span>
            <span className="overview-label">Total Análisis</span>
          </div>
          <div className="overview-item">
            <span className={`overview-value trend-${tendencia}`}>
              {tendencia === 'mejorando' ? '↗️' : tendencia === 'declinando' ? '↘️' : '→'}
            </span>
            <span className="overview-label">Tendencia</span>
          </div>
        </div>
      </div>

      {/* Score Timeline */}
      <div className="glass-card timeline-card">
        <h3 className="card-title">
          <BarChart3 size={18} />
          Evolución de Puntuación
        </h3>
        <div className="score-timeline">
          {historial.slice(0, 10).reverse().map((a, i) => (
            <div key={i} className="timeline-bar-container">
              <div
                className={`timeline-bar ${
                  a.puntuacionGeneral >= 80 ? 'bar-excellent' :
                  a.puntuacionGeneral >= 60 ? 'bar-good' :
                  a.puntuacionGeneral >= 40 ? 'bar-moderate' : 'bar-poor'
                }`}
                style={{ height: `${a.puntuacionGeneral}%` }}
              >
                <span className="bar-value">{a.puntuacionGeneral}</span>
              </div>
              <span className="bar-label">
                {new Date(a.fecha).toLocaleDateString('es', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Error Recurrence */}
      <div className="glass-card errors-stats-card">
        <h3 className="card-title">
          <Target size={18} />
          Errores Frecuentes (últimos 30 días)
        </h3>
        {errorStats.length === 0 ? (
          <div className="no-errors">
            <Award size={24} />
            <p>¡Sin errores recurrentes! Excelente trabajo.</p>
          </div>
        ) : (
          <div className="error-stats-list">
            {errorStats.map((stat, i) => (
              <div key={i} className={`error-stat-item ${stat.estancada ? 'stalled' : ''}`}>
                <div className="error-stat-header">
                  <span className="error-stat-name">{stat.articulacion}</span>
                  {stat.estancada && (
                    <span className="stalled-badge">
                      <AlertTriangle size={12} />
                      Estancada
                    </span>
                  )}
                </div>
                <div className="error-stat-bar-container">
                  <div
                    className={`error-stat-bar ${
                      stat.recurrencia > 70 ? 'bar-critical' :
                      stat.recurrencia > 40 ? 'bar-warning' : 'bar-ok'
                    }`}
                    style={{ width: `${stat.recurrencia}%` }}
                  />
                  <span className="error-stat-pct">{stat.recurrencia}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ruta de Aprendizaje */}
      {usuario?.rutaAprendizaje && usuario.rutaAprendizaje.recomendacionesActivas.length > 0 && (
        <div className="glass-card route-card">
          <h3 className="card-title">🗺️ Tu Ruta de Aprendizaje</h3>
          {usuario.rutaAprendizaje.recomendacionesActivas.map((rec, i) => (
            <div key={i} className="route-recommendation">
              <span className={`strategy-badge strategy-${rec.tipoEstrategia}`}>
                {rec.tipoEstrategia === 'tecnica' ? '🎯' : rec.tipoEstrategia === 'drill' ? '💪' : '🧠'}
                {' '}{rec.tipoEstrategia}
              </span>
              <p>{rec.contenido}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
