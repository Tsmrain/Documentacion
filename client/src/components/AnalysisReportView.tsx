
interface AnalysisReportViewProps {
  report: any;
  onClear: () => void;
}



export function AnalysisReportView({ report, onClear }: AnalysisReportViewProps) {
  if (!report) return null;

  const { success, reporte, planAdaptativo, error } = report;

  if (!success && error) {
    return (
      <div className="glass-panel p-6 animate-fade-in mb-6" style={{ padding: "24px", background: "#f2f2f7" }}>
        <h3 style={{ color: "#ef4444", marginTop: 0 }}>Análisis Cancelado</h3>
        <p style={{ color: "#64748b" }}>{error}</p>
        <button className="btn-secondary" onClick={onClear}>Volver al Analizador</button>
      </div>
    );
  }

  const desviacion = reporte.desviacionGrados || 0;
  const puntuacion = Math.max(0, Math.min(100, 100 - Math.round(desviacion * 1.8)));
  const isApproved = puntuacion >= 80;

  const cardBg = isApproved ? "#22c55e" : "#f97316";
  const titleText = isApproved ? "TÉCNICA APROBADA" : "CORRECCIÓN NECESARIA";
  
  // RAG Content
  let evaluacionText = "No se detectaron problemas mayores en la técnica.";
  if (!isApproved) {
    evaluacionText = reporte.sugerenciaPedagogica || "La ejecución presenta desviaciones importantes que podrían exponer las extremidades o romper la postura. Se requiere ajuste estructural inmediato.";
  } else if (reporte.sugerenciaPedagogica) {
    evaluacionText = reporte.sugerenciaPedagogica;
  }

  const tecnicaName = (reporte.tecnicaId || "SPARRING GENERAL").replace(/-/g, " ").toUpperCase();

  const handleResourceClick = (type: string) => {
    if (type === "video" && planAdaptativo?.videoYouTubeUrl) {
      window.open(planAdaptativo.videoYouTubeUrl, "_blank");
    } else {
      alert("Alineación con el motor RAG. El conocimiento base ha sido actualizado.");
    }
  };

  return (
    <div className="animate-fade-in" style={{ background: "#f8fafc", minHeight: "100%", paddingBottom: "20px", borderRadius: "16px", color: "#1e293b" }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', padding: '20px', background: '#ffffff', borderTopLeftRadius: "16px", borderTopRightRadius: "16px", borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ background: '#000', color: '#fff', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold', marginRight: '10px' }}>
          IA
        </div>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Diagnóstico</h2>
      </header>

      <div style={{ padding: '20px' }}>
        
        {/* Verdict Card */}
        <div style={{ background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '20px' }}>
          <div style={{ background: cardBg, padding: '30px 20px', color: '#ffffff', textAlign: 'center' }}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' 
            }}>
              {isApproved ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              )}
            </div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 800 }}>
              {titleText}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.5', opacity: 0.9 }}>
              {evaluacionText}
            </p>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              TÉCNICAS DETECTADAS
            </span>
            <div style={{ display: 'inline-block', background: '#f1f5f9', color: '#475569', padding: '6px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #e2e8f0' }}>
              {tecnicaName}
            </div>
          </div>
        </div>

        {/* Critical Mistakes (Only if not approved) */}
        {!isApproved && (
          <div style={{ background: '#fff0f2', border: '1px solid #ffe4e6', borderLeft: '4px solid #ef4444', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', marginBottom: '12px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Errores Críticos</h4>
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '0.85rem', lineHeight: '1.6' }}>
              {reporte.desviacionArticular && <li>Desviación significativa en: {reporte.desviacionArticular.replace(/_/g, " ")} ({desviacion} grados).</li>}
              <li>Postura comprometida permitiendo ventaja mecánica al oponente.</li>
            </ul>
          </div>
        )}

        {/* Improvement Plan */}
        <div style={{ background: '#f0fdf4', border: '1px solid #dcfce3', borderLeft: '4px solid #22c55e', borderRadius: '12px', padding: '16px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', marginBottom: '12px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Plan de Mejora (RAG)</h4>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '0.85rem', lineHeight: '1.6' }}>
            {planAdaptativo?.drillRecomendado ? (
              <li>{planAdaptativo.drillRecomendado}</li>
            ) : (
              <li>Manten tu peso distribuido y usa los frames correctamente para evitar pérdida de posición.</li>
            )}
            {planAdaptativo?.mensajeAdaptativo && (
              <li>{planAdaptativo.mensajeAdaptativo}</li>
            )}
          </ul>
        </div>

        {/* Learning Resources */}
        <div style={{ marginBottom: '30px' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '12px' }}>
            RECURSOS DE APRENDIZAJE
          </span>
          <div style={{ display: 'flex' }}>
            <button 
              onClick={() => handleResourceClick('video')}
              style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
              onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseOut={e => e.currentTarget.style.background = '#ffffff'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e293b' }}>Video de Referencia</span>
            </button>
          </div>
        </div>

        {/* Back Button */}
        <button 
          onClick={onClear}
          style={{ width: '100%', background: 'transparent', border: 'none', color: '#0f172a', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38l-5.67-2"></path></svg>
          Volver al Historial
        </button>

      </div>
    </div>
  );
}

