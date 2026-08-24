
import { useState, useEffect } from "react";

interface AnalysisReportViewProps {
  report: any;
  onClear: () => void;
}

export function AnalysisReportView({ report, onClear }: AnalysisReportViewProps) {
  const [feedbackConfirmed, setFeedbackConfirmed] = useState<boolean>(false);
  const [isEditingTechnique, setIsEditingTechnique] = useState<boolean>(false);
  const [customTechnique, setCustomTechnique] = useState<string>("");
  const [activeReport, setActiveReport] = useState<any>(report);

  useEffect(() => {
    setActiveReport(report);
    setFeedbackConfirmed(false);
    setIsEditingTechnique(false);
    setCustomTechnique("");
  }, [report]);

  if (!activeReport) return null;

  const { success, reporte, planAdaptativo, error } = activeReport;

  if (!success && error) {
    return (
      <div className="glass-panel p-6 animate-fade-in mb-6" style={{ padding: "24px", background: "#f2f2f7" }}>
        <h3 style={{ color: "#ef4444", marginTop: 0 }}>Análisis Cancelado</h3>
        <p style={{ color: "#64748b" }}>{error}</p>
        <button className="btn-secondary" onClick={onClear}>Volver al Analizador</button>
      </div>
    );
  }

  const severidad = (reporte?.severidad || "Moderado").toLowerCase();
  const isApproved = severidad === "leve";
  const isCritical = severidad === "critico";

  const cardBg = isApproved ? "#16a34a" : isCritical ? "#dc2626" : "#ea580c";
  const titleText = isApproved ? "TÉCNICA APROBADA (BUENA EJECUCIÓN)" : isCritical ? "CORRECCIÓN CRÍTICA" : "AJUSTE RECOMENDADO";
  
  // RAG Content
  let evaluacionText = "No se detectaron problemas mayores en la técnica.";
  if (reporte?.sugerenciaPedagogica) {
    evaluacionText = reporte.sugerenciaPedagogica;
  } else if (reporte?.evaluacion) {
    evaluacionText = reporte.evaluacion;
  } else if (!isApproved) {
    evaluacionText = "Estás perdiendo tu base y postura. Corrige tus frames y distribución de peso para evitar ser raspado o finalizado.";
  }

  const tecnicaRaw = reporte?.tecnicaId || "SPARRING GENERAL";
  const tecnicaName = (tecnicaRaw === "TECNICA_DESCONOCIDA_D" ? "Técnica Libre / Sparring Dinámico" : tecnicaRaw).replace(/-/g, " ").toUpperCase();

  const handleResourceClick = (type: string) => {
    if (type === "video" && planAdaptativo?.videoYouTubeUrl) {
      window.open(planAdaptativo.videoYouTubeUrl, "_blank");
    } else {
      alert("Alineación con el motor RAG. El conocimiento base ha sido actualizado.");
    }
  };

  const handleCorregirTecnica = async () => {
    if (!customTechnique.trim()) return;
    const nuevaTecnica = customTechnique.trim();
    
    // Actualizar localmente el reporte
    setActiveReport((prev: any) => ({
      ...prev,
      reporte: {
        ...prev.reporte,
        tecnicaId: nuevaTecnica
      },
      planAdaptativo: {
        ...prev.planAdaptativo,
        drillRecomendado: `Ejercicio: Practica repeticiones de entrada y control de ${nuevaTecnica}`,
        videoYouTubeUrl: `https://www.youtube.com/results?search_query=Tutorial+BJJ+${encodeURIComponent(nuevaTecnica)}`
      }
    }));
    setFeedbackConfirmed(true);
    setIsEditingTechnique(false);

    try {
      const token = localStorage.getItem("openbjj_jwt");
      await fetch("/api/sesion/corregir-tecnica", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          tecnicaCorregida: nuevaTecnica
        })
      });
    } catch (e) {
      console.warn("[Reporte] Error al persistir corrección de técnica:", e);
    }
  };

  return (
    <div className="animate-fade-in" style={{ background: "#f8fafc", minHeight: "100%", paddingBottom: "20px", borderRadius: "16px", color: "#1e293b" }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', padding: '20px', background: '#ffffff', borderTopLeftRadius: "16px", borderTopRightRadius: "16px", borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ background: '#000', color: '#fff', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold', marginRight: '10px' }}>
          IA
        </div>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Diagnóstico y Tutoría del Sensei</h2>
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
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5', opacity: 0.95 }}>
              {evaluacionText}
            </p>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              TÉCNICA PRINCIPAL DETECTADA
            </span>
            <div style={{ display: 'inline-block', background: '#f1f5f9', color: '#1e293b', padding: '6px 14px', borderRadius: '100px', fontSize: '0.82rem', fontWeight: 700, border: '1px solid #cbd5e1' }}>
              {tecnicaName}
            </div>

            {/* Secuencia Multi-Posición si está disponible */}
            {reporte?.fasesSecuencia && Array.isArray(reporte.fasesSecuencia) && reporte.fasesSecuencia.length > 0 && (
              <div style={{ marginTop: "14px", padding: "12px", background: "rgba(241,245,249,0.7)", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "8px" }}>
                  Secuencia de Posiciones en el Combate
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {reporte.fasesSecuencia.map((fase: string, idx: number) => (
                    <span key={idx} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 10px", fontSize: "0.75rem", color: "#334155", fontWeight: 600 }}>
                      {fase}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Active Learning: Feedback Human-in-the-Loop */}
            <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
              {!isEditingTechnique ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                  <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                    ¿La técnica detectada fue correcta?
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setFeedbackConfirmed(true)}
                      disabled={feedbackConfirmed}
                      style={{ padding: "5px 12px", fontSize: "0.72rem", fontWeight: 600, background: feedbackConfirmed ? "#dcfce7" : "#f1f5f9", color: feedbackConfirmed ? "#16a34a" : "#475569", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}
                    >
                      {feedbackConfirmed ? "✓ Técnica Confirmada" : "✓ Sí, es correcta"}
                    </button>
                    {!feedbackConfirmed && (
                      <button
                        onClick={() => setIsEditingTechnique(true)}
                        style={{ padding: "5px 12px", fontSize: "0.72rem", fontWeight: 600, background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}
                      >
                        ✏️ Ajustar nombre
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "6px" }}>
                    Escribe el nombre real de la técnica ejecutada:
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="text"
                      value={customTechnique}
                      onChange={(e) => setCustomTechnique(e.target.value)}
                      placeholder="Ej: Llave de Brazo Voladora, Kimura..."
                      style={{ flex: 1, padding: "6px 10px", fontSize: "0.8rem", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }}
                    />
                    <button
                      onClick={handleCorregirTecnica}
                      style={{ padding: "6px 12px", fontSize: "0.75rem", fontWeight: 600, background: "#6366f1", color: "#ffffff", border: "none", borderRadius: "6px", cursor: "pointer" }}
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setIsEditingTechnique(false)}
                      style={{ padding: "6px 10px", fontSize: "0.75rem", fontWeight: 600, background: "#e2e8f0", color: "#475569", border: "none", borderRadius: "6px", cursor: "pointer" }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Recurring Mistake Highlight (Alerta del Sensei) */}
        {planAdaptativo?.esFalloRecurrente && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', marginBottom: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>Atención del Sensei: Detalle Recurrente Detectado</h4>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.84rem', color: '#78350f', lineHeight: '1.5' }}>
              {planAdaptativo.mensajeAdaptativo || "Has repetido este detalle en más de 3 sesiones. Recomendamos revisar este video específico para corregirlo."}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleResourceClick('video')}
                style={{ flex: 1, minWidth: '160px', padding: '10px 14px', background: '#f59e0b', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Ver Video de Corrección Recomendado
              </button>
              {planAdaptativo.videoYouTubeAlternativo && (
                <button
                  onClick={() => window.open(planAdaptativo.videoYouTubeAlternativo, "_blank")}
                  style={{ flex: 1, minWidth: '160px', padding: '10px 14px', background: '#ffffff', color: '#b45309', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  🔍 Ver Video Alternativo en YouTube
                </button>
              )}
            </div>
          </div>
        )}

        {/* Critical Mistakes / Coaching Points */}
        <div style={{ background: '#fff0f2', border: '1px solid #ffe4e6', borderLeft: '4px solid #ef4444', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', marginBottom: '12px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Puntos Clave del Sensei para tu Próximo Intento</h4>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '0.85rem', lineHeight: '1.6' }}>
            {reporte?.evaluacion && <li>{reporte.evaluacion}</li>}
            {reporte?.desviacionArticular && (
              <li>Detalle postural: Mantén tu {reporte.desviacionArticular.replace(/_/g, " ")} bien protegido y cerrado contra el cuerpo para no regalar espacio.</li>
            )}
          </ul>
        </div>

        {/* Improvement Plan */}
        <div style={{ background: '#f0fdf4', border: '1px solid #dcfce3', borderLeft: '4px solid #22c55e', borderRadius: '12px', padding: '16px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', marginBottom: '12px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Plan de Práctica Recomendado</h4>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '0.85rem', lineHeight: '1.6' }}>
            {planAdaptativo?.drillRecomendado ? (
              <li>{planAdaptativo.drillRecomendado}</li>
            ) : (
              <li>Practica repeticiones suaves enfocándote en cerrar los espacios y mantener una base sólida.</li>
            )}
            {planAdaptativo?.mensajeAdaptativo && !planAdaptativo.esFalloRecurrente && (
              <li>{planAdaptativo.mensajeAdaptativo}</li>
            )}
          </ul>
        </div>

        {/* Learning Resources */}
        <div style={{ marginBottom: '30px' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '12px' }}>
            RECURSOS DE APRENDIZAJE
          </span>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => handleResourceClick('video')}
              style={{ flex: 1, minWidth: '200px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
              onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseOut={e => e.currentTarget.style.background = '#ffffff'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>Video de Referencia del Dojo</span>
            </button>
            {planAdaptativo?.videoYouTubeAlternativo && (
              <button 
                onClick={() => window.open(planAdaptativo.videoYouTubeAlternativo, "_blank")}
                style={{ flex: 1, minWidth: '200px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.background = '#ffffff'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>Ver Más Tutoriales en YouTube</span>
              </button>
            )}
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

