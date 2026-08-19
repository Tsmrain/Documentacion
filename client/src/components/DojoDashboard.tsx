import { useEffect, useState } from "react";

interface DojoDashboardProps {
  usuarioId?: string;
  userProfile?: {
    nombre: string;
    cinturon: string;
    maestria: string;
  };
}

export function DojoDashboard({ usuarioId = "00000000-0000-0000-0000-000000000001", userProfile }: DojoDashboardProps) {
  const nombre = userProfile?.nombre || "Practicante";
  const cinturon = userProfile?.cinturon || "BLANCO";
  const maestria = userProfile?.maestria || "Principiante";

  const [telemetria, setTelemetria] = useState<any>(null);

  useEffect(() => {
    const fetchTelemetria = async () => {
      try {
        const token = localStorage.getItem("openbjj_jwt");
        const headers: any = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`/api/sesion/telemetria?usuarioId=${usuarioId}`, { headers });
        if (res.ok) {
          const json = await res.json();
          setTelemetria(json);
        }
      } catch (e) {
        console.warn("[DojoDashboard] Error al consultar telemetría:", e);
      }
    };
    fetchTelemetria();
  }, [usuarioId]);

  const evi = telemetria?.evi;
  const metricas = telemetria?.metricasGlobales;
  const alerta = evi?.alerta === "BAJO_COMPROMISO";

  return (
    <div className="glass-panel p-6 animate-fade-in mb-6" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></div>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>Analizador de Movimiento Activo</span>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
          Perfil del Practicante
        </span>
        <strong style={{ color: '#f1f5f9', fontSize: '0.95rem', display: 'block' }}>{nombre}</strong>
        <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600 }}>Cinturón {cinturon}</span>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '8px' }}>({maestria})</span>
      </div>

      {/* --- Panel de Actividad del Dojo en lenguaje sencillo --- */}
      <div style={{ background: 'rgba(99, 102, 241, 0.04)', padding: '12px', borderRadius: '6px', border: `1px solid ${alerta ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.15)'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
            Uso en el Dojo
          </span>
          <span style={{
            fontSize: '0.7rem',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 700,
            background: alerta ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            color: alerta ? '#f87171' : '#34d399',
            border: `1px solid ${alerta ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
          }}>
            {alerta ? "POCO ENTRENAMIENTO" : "ENTRENAMIENTO AL DÍA"}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Hoy</span>
            <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>{metricas?.dau ?? 1}</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Esta Semana</span>
            <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>{metricas?.wau ?? 1}</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Este Mes</span>
            <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>{metricas?.mau ?? 1}</strong>
          </div>
        </div>

        <div style={{ fontSize: '0.72rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
          <span>Ritmo de Práctica:</span>
          <strong style={{ color: '#38bdf8' }}>{evi ? (evi.evi * 100).toFixed(0) + "%" : "100%"}</strong>
        </div>
      </div>

      <p style={{ margin: '12px 0 0 0', color: '#64748b', fontSize: '0.75rem' }}>
        Análisis directo en tu dispositivo con inteligencia artificial.
      </p>
    </div>
  );
}
