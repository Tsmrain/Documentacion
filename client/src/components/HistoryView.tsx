import { useEffect, useState } from "react";

interface HistoryViewProps {
  usuarioId: string;
  onSelectReport: (report: any) => void;
}

export function HistoryView({ usuarioId, onSelectReport }: HistoryViewProps) {
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTecnica, setFiltroTecnica] = useState("");

  useEffect(() => {
    fetchHistorial();
  }, [usuarioId]);

  const fetchHistorial = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sesion/historial?usuarioId=${usuarioId}`);
      if (!res.ok) throw new Error("Error al obtener el historial de análisis.");
      const json = await res.json();
      setHistorial(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-6 animate-fade-in" style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8' }}>Cargando historial de análisis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-6 animate-fade-in" style={{ padding: '24px' }}>
        <h3 style={{ color: '#ef4444', marginTop: 0 }}>Error al Cargar Historial</h3>
        <p style={{ color: '#cbd5e1' }}>{error}</p>
        <button className="btn-secondary" onClick={fetchHistorial}>Reintentar</button>
      </div>
    );
  }

  const itemsFiltrados = historial.filter(item => {
    if (!filtroTecnica) return true;
    const tecnica = item.reporte?.tecnicaId || "";
    return tecnica.toLowerCase().includes(filtroTecnica.toLowerCase());
  });

  return (
    <div className="glass-panel p-6 animate-fade-in mb-6" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#818cf8', fontSize: '1.4rem' }}>Historial de Análisis (CU05)</h2>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
            Registro cronológico de evaluaciones cinemáticas realizadas.
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input type="text" placeholder="Filtrar por técnica (ej. guardia, pasaje)..." value={filtroTecnica} onChange={(e) => setFiltroTecnica(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#ffffff', fontSize: '0.9rem' }} />
      </div>

      {historial.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '8px' }}>
          <h3 style={{ color: '#818cf8', marginTop: 0, fontSize: '1.1rem' }}>Sin Registros Previos</h3>
          <p style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
            Aún no has realizado ningún análisis. Sube tu primer video en el Analizador para ver tu historial.
          </p>
        </div>
      ) : itemsFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}>
          No se encontraron análisis que coincidan con la búsqueda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {itemsFiltrados.map((item) => {
            const reporte = item.reporte || {};
            const desviacion = reporte.desviacionGrados || 0;
            const puntuacion = Math.max(0, Math.min(100, 100 - Math.round(desviacion * 1.8)));

            let colorSeveridad = "#10b981";
            if (reporte.severidad === "MODERADA") colorSeveridad = "#f59e0b";
            else if (reporte.severidad === "GRAVE" || desviacion > 30) colorSeveridad = "#ef4444";

            const fechaFormateada = new Date(item.fecha).toLocaleDateString("es-ES", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <div key={item.id} className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderLeft: `4px solid ${colorSeveridad}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>{fechaFormateada}</span>
                    <h3 style={{ margin: '2px 0 0 0', fontSize: '1.05rem', color: '#f1f5f9' }}>
                      {reporte.tecnicaId ? reporte.tecnicaId.replace("-", " ").toUpperCase() : "SPARRING GENERAL"}
                    </h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: colorSeveridad }}>
                      {puntuacion}%
                    </span>
                    <span style={{ fontSize: '0.7rem', display: 'block', color: colorSeveridad, fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {reporte.severidad || "LEVE"}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Desviación: {reporte.desviacionArticular ? reporte.desviacionArticular.replace("_", " ") : "N/A"} ({desviacion} deg)
                  </span>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => onSelectReport({ success: true, reporte, planAdaptativo: item.planAdaptativo })}>
                    Ver Reporte Completo (CU06)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
