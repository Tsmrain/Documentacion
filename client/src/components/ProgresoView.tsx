import { useEffect, useState } from "react";

interface ProgresoViewProps {
  usuarioId: string;
}

// Mapa estatico de tecnicas BJJ con drills base y posicion en el catalogo
const CATALOGO_TECNICAS = [
  {
    id: "guardia-cerrada",
    nombre: "Guardia Cerrada",
    descripcion: "Posicion fundamental de control desde abajo. Codos pegados, postura erguida.",
    drillBase: "Movimiento de cadera (Shrimping)",
    youtubeBase: "https://www.youtube.com/watch?v=KbgQnCiX1Jo",
    color: "#6366f1"
  },
  {
    id: "pasaje-guardia",
    nombre: "Pasaje de Guardia",
    descripcion: "Romper y superar la guardia del oponente con base amplia y cadera baja.",
    drillBase: "Pasaje tipo toreador (Torreando)",
    youtubeBase: "https://www.youtube.com/watch?v=dF5lV2FgxlE",
    color: "#0ea5e9"
  },
  {
    id: "montada",
    nombre: "Control Lateral y Montada",
    descripcion: "Posicion dominante de control superior. Presion de hombro y crossface.",
    drillBase: "Drill de montada con base rodillas",
    youtubeBase: "https://www.youtube.com/watch?v=qP_wNjCJJ1k",
    color: "#10b981"
  }
];

export function ProgresoView({ usuarioId }: ProgresoViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fuentes, setFuentes] = useState<any[]>([]);
  const [cargandoFuentes, setCargandoFuentes] = useState(true);

  useEffect(() => {
    fetchProgreso();
    fetchFuentes();
  }, [usuarioId]);

  const fetchProgreso = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sesion/progreso?usuarioId=${usuarioId}`);
      if (!res.ok) throw new Error("Error al obtener los datos de progreso.");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFuentes = async () => {
    try {
      setCargandoFuentes(true);
      const res = await fetch(`/api/rag/fuentes?usuarioId=${usuarioId}`);
      if (res.ok) {
        const json = await res.json();
        setFuentes(Array.isArray(json) ? json : []);
      }
    } catch (err) {
      console.warn("[ProgresoView] No se pudieron cargar las fuentes RAG:", err);
    } finally {
      setCargandoFuentes(false);
    }
  };

  const handleVideoClick = async (youtubeUrl: string) => {
    try {
      await fetch("/api/sesion/visualizacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId,
          videoId: youtubeUrl
        })
      });
    } catch (err) {
      console.warn("Error al registrar visualizacion:", err);
    }
    window.open(youtubeUrl, "_blank");
  };

  // Asociar fuentes ingestadas a tecnicas por palabras clave
  const asociarFuentesATecnica = (tecnicaId: string): any[] => {
    if (!fuentes || fuentes.length === 0) return [];
    const keywords: Record<string, string[]> = {
      "guardia-cerrada": ["guardia", "guard", "closed", "armbar", "triangulo", "kimura", "sweep", "raspado"],
      "pasaje-guardia": ["pasaje", "pass", "toreando", "torreando", "derribo", "takedown", "standing"],
      "montada": ["montada", "mount", "lateral", "side", "espalda", "back", "crossface", "control"]
    };
    const kws = keywords[tecnicaId] || [];
    return fuentes.filter(f => {
      const titulo = (f.titulo || "").toLowerCase();
      return kws.some(kw => titulo.includes(kw));
    });
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

  const posicionesMaestria = data.posicionesMaestria || [
    { nombre: "Guardia Cerrada", porcentaje: data.maestriaGuardia || 0 },
    { nombre: "Pasaje de Guardia", porcentaje: data.maestriaPasaje || 0 },
    { nombre: "Control Lateral y Montada", porcentaje: data.maestriaMontada || 0 }
  ];

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
              <button className="btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }} onClick={() => handleVideoClick(data.videoYouTubeUrl)}>
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

      {/* --- Seccion: Catalogo de Conocimiento RAG Vivo --- */}
      <div className="glass-panel p-6" style={{ padding: '24px' }}>
        <h2 style={{ marginTop: 0, color: '#38bdf8', fontSize: '1.3rem' }}>Catalogo de Conocimiento y Tecnicas Aprendidas (RAG Vivo)</h2>
        <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '20px' }}>
          Biblioteca de posiciones del sistema indexadas con fuentes activas. Documentos PDF, videos de drills instructivos y enlaces de conocimiento ingestados por el practicante.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {CATALOGO_TECNICAS.map((tecnica) => {
            const fuentesAsociadas = asociarFuentesATecnica(tecnica.id);
            const posicion = posicionesMaestria.find((p: { nombre: string; porcentaje: number }) =>
              p.nombre.toLowerCase().includes(tecnica.nombre.split(" ")[0].toLowerCase())
            );
            const maestria = posicion?.porcentaje ?? 0;

            return (
              <div key={tecnica.id} className="glass-panel" style={{ padding: '18px', border: `1px solid ${tecnica.color}22`, background: `${tecnica.color}08` }}>
                {/* Header tecnica */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: tecnica.color }}></span>
                      <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '1rem', fontWeight: 700 }}>{tecnica.nombre}</h3>
                    </div>
                    <p style={{ margin: '4px 0 0 18px', color: '#94a3b8', fontSize: '0.82rem' }}>{tecnica.descripcion}</p>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '60px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: maestria > 0 ? (maestria >= 80 ? '#10b981' : maestria >= 50 ? '#f59e0b' : '#ef4444') : '#475569' }}>
                      {maestria}%
                    </span>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b' }}>maestria</p>
                  </div>
                </div>

                {/* Drill base recomendado */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(0,0,0,0.25)', borderRadius: '6px', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Drill Base Recomendado</span>
                    <span style={{ fontSize: '0.88rem', color: '#e2e8f0', fontWeight: 600 }}>{tecnica.drillBase}</span>
                  </div>
                  <button
                    onClick={() => handleVideoClick(tecnica.youtubeBase)}
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }}
                  >
                    Ver en YouTube
                  </button>
                </div>

                {/* Fuentes RAG ingestadas asociadas */}
                {fuentesAsociadas.length > 0 ? (
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                      Fuentes RAG Activas ({fuentesAsociadas.length})
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {fuentesAsociadas.map((f, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '5px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.75rem', color: f.tipo === 'youtube' ? '#f87171' : '#a5b4fc', fontWeight: 600, textTransform: 'uppercase' }}>
                              {f.tipo === 'youtube' ? 'YT' : 'PDF'}
                            </span>
                            <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{f.titulo || "Fuente sin titulo"}</span>
                          </div>
                          {f.url && (
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '0.75rem', color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}
                            >
                              Abrir
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '5px', border: '1px dashed rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                      Sin fuentes RAG ingestadas para esta posicion. Usa "Agregar Fuente" para indexar PDFs o videos de YouTube relacionados.
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {cargandoFuentes && (
          <p style={{ textAlign: 'center', color: '#475569', fontSize: '0.82rem', marginTop: '16px' }}>Cargando fuentes del Vector Store RAG...</p>
        )}
      </div>
    </div>
  );
}
