

interface AnalysisReportViewProps {
  report: any;
  onClear: () => void;
}

export function AnalysisReportView({ report, onClear }: AnalysisReportViewProps) {
  if (!report) return null;

  const { success, degraded, reporte, planAdaptativo, error } = report;

  if (!success && error) {
    return (
      <div className="glass-panel p-6 animate-fade-in mb-6" style={{ padding: '24px' }}>
        <h3 style={{ color: '#ef4444', marginTop: 0 }}>Analisis Cancelado</h3>
        <p>{error}</p>
        <button className="btn-secondary" onClick={onClear}>Volver</button>
      </div>
    );
  }

  const desviacion = reporte.desviacionGrados || 0;
  const puntuacionTecnica = Math.max(0, Math.min(100, 100 - Math.round(desviacion * 1.8)));

  let colorAlerta = "#10b981";
  let estadoDesviacion = "Tolerable";

  if (desviacion >= 16 && desviacion <= 30) {
    colorAlerta = "#f59e0b";
    estadoDesviacion = "Moderada";
  } else if (desviacion > 30) {
    colorAlerta = "#ef4444";
    estadoDesviacion = "Critica";
  }

  return (
    <div className="glass-panel p-6 animate-fade-in mb-6" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#10b981', fontSize: '1.4rem' }}>Reporte de Evaluacion</h2>
        <span className={`badge-${reporte.severidad?.toLowerCase() || "leve"}`} style={{ textTransform: 'uppercase' }}>
          {reporte.severidad || "LEVE"}
        </span>
      </div>

      {degraded && (
        <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
          Fallback Baseline Activo
        </div>
      )}

      {/* Grid de Metricas Clave */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Puntuacion</span>
          <span style={{ fontSize: '2.2rem', fontWeight: 800, color: colorAlerta }}>
            {puntuacionTecnica}%
          </span>
        </div>
        <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Tecnica</span>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', display: 'block', marginTop: '10px' }}>
            {reporte.tecnicaId?.replace("-", " ").toUpperCase() || "GUARDIA CERRADA"}
          </span>
        </div>
      </div>

      {/* Barra Grafica de Desviacion */}
      {reporte.desviacionArticular && (
        <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
            <span style={{ color: '#94a3b8' }}>Articulacion: {reporte.desviacionArticular.replace("_", " ").toUpperCase()}</span>
            <span style={{ color: colorAlerta, fontWeight: 'bold' }}>{desviacion} grados ({estadoDesviacion})</span>
          </div>
          <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (desviacion / 45) * 100)}%`, height: '100%', background: colorAlerta, transition: 'width 0.3s ease' }}></div>
          </div>
        </div>
      )}

      {/* Tarjeta de Correccion / YouTube (Elemento Principal) */}
      {planAdaptativo && (
        <div className="glass-panel" style={{ padding: '18px', background: 'rgba(225, 29, 72, 0.04)', border: '1px solid rgba(225, 29, 72, 0.2)', borderRadius: '8px', marginBottom: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: '#fda4af', display: 'block', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 'bold' }}>Drill Correctivo</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9', display: 'block', marginBottom: '16px' }}>{planAdaptativo.drillRecomendado}</span>
          {planAdaptativo.videoYouTubeUrl && (
            <a href={planAdaptativo.videoYouTubeUrl} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', padding: '14px', fontWeight: 'bold', fontSize: '0.95rem' }}>
              Ver Tutorial en YouTube
            </a>
          )}
        </div>
      )}

      <button className="btn-secondary" style={{ width: '100%', padding: '12px' }} onClick={onClear}>
        Analizar Otro Video
      </button>
    </div>
  );
}
