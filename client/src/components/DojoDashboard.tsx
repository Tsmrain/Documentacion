interface DojoDashboardProps {
  usuarioId?: string;
  userProfile?: {
    nombre: string;
    cinturon: string;
    maestria: string;
  };
}

export function DojoDashboard({ userProfile }: DojoDashboardProps) {
  const nombre = userProfile?.nombre || "Santiago";
  const cinturon = userProfile?.cinturon || "AZUL";
  const maestria = userProfile?.maestria || "Intermedio";

  return (
    <div className="glass-panel p-6 animate-fade-in mb-6" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></div>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>Motor Cinemático Edge AI Activo</span>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
          Perfil de Practicante Activo
        </span>
        <strong style={{ color: '#f1f5f9', fontSize: '0.95rem', display: 'block' }}>{nombre}</strong>
        <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600 }}>Cinturón {cinturon}</span>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '8px' }}>({maestria})</span>
      </div>

      <p style={{ margin: '12px 0 0 0', color: '#64748b', fontSize: '0.75rem' }}>
        Extracción local en GPU (WebGL) y Grounding semántico RAG.
      </p>
    </div>
  );
}
