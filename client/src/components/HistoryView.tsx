import { useEffect, useState } from "react";

interface HistoryViewProps {
  usuarioId: string;
  onSelectReport: (report: any) => void;
  // refreshVersion se incrementa en App.tsx cuando termina un analisis en segundo plano,
  // forzando un re-fetch automatico del historial para cumplir CU05.
  refreshVersion?: number;
}

export function HistoryView({ usuarioId, onSelectReport, refreshVersion }: HistoryViewProps) {
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTecnica, setFiltroTecnica] = useState("");

  useEffect(() => {
    fetchHistorial();
  }, [usuarioId, refreshVersion]);

  const fetchHistorial = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("openbjj_jwt");
      const res = await fetch(`/api/sesion/historial?usuarioId=${usuarioId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Error al obtener el historial de análisis.");
      const json = await res.json();
      setHistorial(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, analisisId: string) => {
    e.stopPropagation();
    if (!window.confirm("¿Seguro que deseas eliminar este análisis del historial?")) return;
    
    try {
      const token = localStorage.getItem("openbjj_jwt");
      const res = await fetch(`/api/sesion/historial/${analisisId}?usuarioId=${usuarioId}`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setHistorial(prev => prev.filter(item => item.id !== analisisId));
      } else {
        alert("Error al eliminar el historial");
      }
    } catch (error) {
      console.error("Error deleting history", error);
      alert("Error al eliminar el historial");
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
    <div className="animate-fade-in" style={{ padding: '0px' }}>
      <header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '24px 20px', 
        background: 'rgba(17, 24, 39, 0.5)', 
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div>
          <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '1.4rem', fontWeight: 700 }}>Historial</h2>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
            Auditoría Técnica de Jiu-Jitsu
          </p>
        </div>
      </header>

      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="Filtrar por técnica (ej. guardia, pasaje)..." 
            value={filtroTecnica} 
            onChange={(e) => setFiltroTecnica(e.target.value)} 
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: '12px', 
              border: '1px solid rgba(255,255,255,0.1)', 
              background: 'rgba(0,0,0,0.3)', 
              color: '#ffffff', 
              fontSize: '0.95rem',
              outline: 'none',
              transition: 'all 0.2s'
            }} 
          />
        </div>

        {historial.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '160px', textAlign: 'center', padding: '24px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
              <path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
            </svg>
            <p style={{ color: '#94a3b8', fontWeight: 500, fontSize: '0.95rem', margin: 0 }}>Aún no hay historial</p>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>Tus análisis recientes aparecerán aquí.</p>
          </div>
        ) : itemsFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}>
            No se encontraron análisis que coincidan con la búsqueda.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {itemsFiltrados.map((item, idx) => {
              const reporte = item.reporte || {};
              const desviacion = reporte.desviacionGrados || 0;
              const isApproved = desviacion < 15 && reporte.severidad !== "GRAVE";
              
              let statusColor = isApproved ? "#10b981" : "#f59e0b";
              if (reporte.severidad === "GRAVE" || desviacion > 30) statusColor = "#ef4444";

              const fechaFormateada = new Date(item.fecha).toLocaleDateString("es-ES", {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div 
                  key={item.id || idx} 
                  onClick={() => onSelectReport({ success: true, reporte, planAdaptativo: item.planAdaptativo })}
                  className="glass-panel" 
                  style={{ 
                    padding: '16px', 
                    background: 'rgba(30, 41, 59, 0.4)', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(30, 41, 59, 0.4)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      {fechaFormateada}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        onClick={(e) => handleDelete(e, item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Eliminar del historial"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, transition: 'opacity 0.2s' }} onMouseOver={e => (e.currentTarget.style.opacity = '1')} onMouseOut={e => (e.currentTarget.style.opacity = '0.7')}>
                          <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#fff', 
                      fontSize: '12px', 
                      fontWeight: 'bold',
                      flexShrink: 0,
                      background: statusColor
                    }}>
                      {isApproved ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      ) : (
                        <span style={{ fontFamily: 'serif', fontStyle: 'italic' }}>!</span>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {reporte.tecnicaId ? reporte.tecnicaId.replace(/-/g, " ").toUpperCase() : "SPARRING GENERAL"}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {reporte.severidad || "LEVE"} • {reporte.desviacionArticular ? reporte.desviacionArticular.replace(/_/g, " ") : "General"} ({desviacion}°)
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
