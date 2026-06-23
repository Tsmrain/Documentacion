import React, { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle, Target, Award, BarChart3, Play, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AnalisisBiomecanico } from '../models/types';

interface ErrorStat {
  articulacion: string;
  count: number;
  recurrencia: number;
  estancada: boolean;
}

export function ProgressDashboard() {
  const { historial, loadHistory, usuario, sessionController } = useApp();
  const [errorStats, setErrorStats] = useState<ErrorStat[]>([]);
  const [promedioScore, setPromedioScore] = useState(0);
  const [tendencia, setTendencia] = useState<'mejorando' | 'estable' | 'declinando'>('estable');

  const [selectedTecnica, setSelectedTecnica] = useState<string>('');
  const [comparacion, setComparacion] = useState<any>(null);
  const [loadingCompare, setLoadingCompare] = useState<boolean>(false);
  const [errorCompare, setErrorCompare] = useState<string | null>(null);

  const uniqueTechniques = React.useMemo(() => {
    const list: { id: string; nombre: string }[] = [];
    const idsSeen = new Set<string>();
    for (const a of historial) {
      if (a.tecnicaId && !idsSeen.has(a.tecnicaId)) {
        idsSeen.add(a.tecnicaId);
        list.push({ id: a.tecnicaId, nombre: a.tecnicaNombre || a.tecnicaId });
      }
    }
    return list;
  }, [historial]);

  const handleSelectTechnique = async (tecnicaId: string) => {
    setSelectedTecnica(tecnicaId);
    if (!tecnicaId) {
      setComparacion(null);
      return;
    }
    try {
      setLoadingCompare(true);
      setErrorCompare(null);
      const res = await sessionController.compareTechnique(tecnicaId, usuario?.id || 'default');
      setComparacion(res);
    } catch (err: any) {
      setErrorCompare(err.message || 'Error al obtener la comparación técnica.');
      setComparacion(null);
    } finally {
      setLoadingCompare(false);
    }
  };

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

  // CU03: Extensión 2a - Historial vacío
  if (historial.length === 0) {
    return (
      <div className="progress-dashboard">
        <div className="glass-card empty-state">
          <div className="empty-content">
            <span className="empty-emoji">📊</span>
            <h2>¡Sube tus primeros videos!</h2>
            <p>Analiza tus secuencias de Brazilian Jiu-Jitsu para iniciar tu seguimiento biomecánico y comparativo.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="progress-dashboard">
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <h2 className="section-title">
        <TrendingUp size={22} />
        Mi Progreso
      </h2>

      {historial.length < 3 && (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--severity-moderate)', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} style={{ color: '#f4a261' }} />
            <div>
              <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Historial reducido ({historial.length}/3)</h4>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                Necesitas realizar al menos 3 análisis de video para activar la Ruta de Aprendizaje Adaptativa y las métricas avanzadas. Sin embargo, ya puedes utilizar el Comparador de Técnicas a continuación.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selector y Comparador de Técnicas */}
      <div className="glass-card compare-card" style={{ marginBottom: '20px', padding: '20px' }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Award size={18} style={{ color: 'var(--accent-primary)' }} />
          Seguimiento y Comparativa de Técnicas Realizadas
        </h3>
        
        <div className="compare-selector-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selecciona una técnica de tu historial para compararla con su referencia técnica:</label>
          <select 
            value={selectedTecnica} 
            onChange={(e) => handleSelectTechnique(e.target.value)}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-glass)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            <option value="" style={{ background: 'var(--bg-tertiary)' }}>-- Seleccionar técnica realizada --</option>
            {uniqueTechniques.map(tech => (
              <option key={tech.id} value={tech.id} style={{ background: 'var(--bg-tertiary)' }}>
                {tech.nombre}
              </option>
            ))}
          </select>
        </div>

        {loadingCompare && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '12px' }}>
            <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', animation: 'pulse 1.5s infinite' }}>
              Generando análisis comparativo con RAG/Internet...
            </span>
          </div>
        )}

        {errorCompare && (
          <div className="error-alert" style={{ background: 'rgba(230, 57, 70, 0.1)', border: '1px solid var(--score-poor)', color: 'var(--score-poor)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
            {errorCompare}
          </div>
        )}

        {comparacion && !loadingCompare && (
          <div className="comparison-results" style={{ marginTop: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
            {/* Reference Source */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', padding: '12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase', marginRight: '8px', background: comparacion.isRAG ? 'rgba(6, 214, 160, 0.15)' : 'rgba(134, 59, 255, 0.15)', color: comparacion.isRAG ? '#06d6a0' : '#863bff' }}>
                  {comparacion.isRAG ? 'RAG Interno' : 'Internet'}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Ref: {comparacion.referenceTitle}
                </span>
              </div>
              {comparacion.sourceUrl && (
                <a 
                  href={comparacion.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)', fontWeight: 600 }}
                >
                  <Play size={14} />
                  Ver Video
                </a>
              )}
            </div>

            {/* Side-by-side strengths & mistakes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(6, 214, 160, 0.04)', border: '1px solid rgba(6, 214, 160, 0.15)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#06d6a0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  🏆 Lo que haces bien
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {comparacion.haceBien}
                </p>
              </div>

              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(230, 57, 70, 0.04)', border: '1px solid rgba(230, 57, 70, 0.15)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#e63946', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  ⚠️ Lo que haces mal (Errores Recurrentes)
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {comparacion.haceMal}
                </p>
              </div>
            </div>

            {/* YouTube Suggestion */}
            <div style={{ marginTop: '20px', padding: '16px', borderRadius: '12px', background: 'rgba(244, 162, 97, 0.04)', border: '1px solid rgba(244, 162, 97, 0.15)' }}>
              <h4 style={{ margin: '0 0 6px 0', color: '#f4a261', fontSize: '0.95rem', fontWeight: 600 }}>
                🎥 Clase de Refuerzo Recomendada (YouTube)
              </h4>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Estudia esta búsqueda en YouTube para comprender y corregir tus debilidades específicas:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                  {comparacion.consultaYouTube}
                </span>
                <a 
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(comparacion.consultaYouTube)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, padding: '10px 18px', borderRadius: '8px', background: 'var(--accent-primary)', color: '#fff', border: 'none', textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <ExternalLink size={16} />
                  Buscar en YouTube
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

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
