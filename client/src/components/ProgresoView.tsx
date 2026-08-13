import { useEffect, useState } from "react";

interface ProgresoViewProps {
  usuarioId: string;
}

export function ProgresoView({ usuarioId }: ProgresoViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProgreso();
  }, [usuarioId]);

  const fetchProgreso = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("openbjj_jwt");
      const res = await fetch(`/api/sesion/progreso?usuarioId=${usuarioId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Error al obtener los datos de progreso.");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="glass-panel p-6 animate-fade-in" style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8' }}>Cargando datos de progreso adaptativo...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-panel p-6 animate-fade-in" style={{ padding: '24px' }}>
        <h3 style={{ color: '#ef4444', marginTop: 0 }}>Error al Cargar Progreso</h3>
        <p style={{ color: '#cbd5e1' }}>{error || "No se pudo recuperar la informacion del practicante."}</p>
        <button className="btn-secondary" onClick={fetchProgreso}>Reintentar</button>
      </div>
    );
  }

  // Posiciones fundamentales de BJJ expuestas en el panel de maestria.
  // Se consumen datos dinamicos del servidor si estan disponibles;
  // el fallback garantiza que siempre se muestran las 7 posiciones canonicas
  // incluso cuando el practicante no tiene historial registrado aun.
  const POSICIONES_CANONICAS = [
    "Guardia Cerrada",
    "Pasaje de Guardia",
    "Control Lateral",
    "Montada",
    "Espalda",
    "Media Guardia",
    "Guardia Abierta"
  ];

  const posicionesServidor: { nombre: string; porcentaje: number }[] = data.posicionesMaestria || [];

  // Combina datos dinamicos del servidor con el catalogo canonico.
  // Las posiciones con datos reales muestran el porcentaje calculado;
  // las posiciones sin historial aparecen en 0% para motivar la practica.
  const posicionesMaestria = POSICIONES_CANONICAS.map(nombre => {
    const found = posicionesServidor.find(p =>
      p.nombre.toLowerCase().trim() === nombre.toLowerCase().trim()
    );
    return { nombre, porcentaje: found?.porcentaje ?? 0 };
  });

  const esAlertaAdaptativa = data.mensajeAdaptativo?.includes("Alerta") || data.mensajeAdaptativo?.includes("fallado mas de 3 veces") || (data.vecesDetectadoConsecutivas && data.vecesDetectadoConsecutivas > 3);

  return (
    <div className="animate-fade-in">
      {/* --- Seccion: Maestria y Tutoria Adaptativa --- */}
      <div className="glass-panel p-6 mb-6" style={{ padding: '24px', marginBottom: '28px' }}>
        <h2 style={{ marginTop: 0, color: '#818cf8', fontSize: '1.4rem' }}>Progreso y Tutoria Adaptativa (CU03)</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Evolucion tecnica del practicante y recomendaciones pedagogicas adaptativas personalizadas.
        </p>

        {esAlertaAdaptativa && (
          <div style={{ padding: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: '24px' }}>
            <span style={{ fontSize: '0.75rem', color: '#f87171', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
              Alerta de Fallo Recurrente (Mas de 3 Fallos Consecutivos)
            </span>
            <p style={{ margin: '0 0 12px 0', color: '#fecaca', fontSize: '0.9rem', lineHeight: '1.4' }}>
              {data.mensajeAdaptativo || "Se ha detectado una desviacion persistente en tus ultimos sparrings. Se recomienda conmutar la estrategia a un drill de aislamiento."}
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block' }}>Drill Recomendado:</span>
              <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>{data.drillRecomendado}</strong>
            </div>
            {data.videoYouTubeUrl && (
              <button className="btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }} onClick={() => window.open(data.videoYouTubeUrl, "_blank")}>
                Ver Tutorial Correctivo en YouTube (CU10)
              </button>
            )}
          </div>
        )}

        {data.ultimaTecnica && (
          <div className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#a5b4fc', fontWeight: 600 }}>Ultima Tecnica Evaluada:</span>
            <span style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase' }}>{data.ultimaTecnica.replace(/-/g, " ")}</span>
          </div>
        )}

        <div>
          <h3 style={{ fontSize: '1rem', color: '#f1f5f9', marginTop: 0, marginBottom: '12px' }}>Nivel de Maestria por Posicion</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {posicionesMaestria.map((pos: { nombre: string; porcentaje: number }, idx: number) => {
              let color = "#10b981";
              if (pos.porcentaje < 50) color = "#ef4444";
              else if (pos.porcentaje < 80) color = "#f59e0b";

              return (
                <div key={idx} className="glass-panel" style={{ padding: '14px', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{pos.nombre}</span>
                    <span style={{ color, fontWeight: 'bold' }}>{pos.porcentaje}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pos.porcentaje}%`, height: '100%', background: color, transition: 'width 0.4s ease' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
