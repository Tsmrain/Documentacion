interface DojoDashboardProps {
  usuarioId?: string;
  userProfile?: {
    nombre: string;
    cinturon: string;
    maestria: string;
    altura?: number;
    peso?: number;
  };
}

const CINTURON_COLOR: Record<string, string> = {
  BLANCO: "#f8fafc",
  AZUL: "#3b82f6",
  MORADO: "#8b5cf6",
  MARRON: "#92400e",
  NEGRO: "#0f172a"
};

export function DojoDashboard({ userProfile }: DojoDashboardProps) {
  const nombre = userProfile?.nombre || "Practicante";
  const cinturon = userProfile?.cinturon || "BLANCO";
  const maestria = userProfile?.maestria || "Principiante";
  const altura = userProfile?.altura || 175;
  const peso = userProfile?.peso || 75;

  return (
    <div className="glass-panel p-6 animate-fade-in mb-6" style={{ padding: '22px' }}>
      {/* Estado del Sistema */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#10b981',
          boxShadow: '0 0 10px #10b981'
        }} />
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>
          Analizador Cinemático 3D Activo
        </span>
      </div>

      {/* Perfil del Alumno */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '16px',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
            Practicante Activo
          </span>
          <div style={{
            width: '10px',
            height: '24px',
            borderRadius: '3px',
            background: CINTURON_COLOR[cinturon] || "#fff",
            border: cinturon === "BLANCO" ? "1px solid rgba(255,255,255,0.4)" : "none"
          }} />
        </div>

        <strong style={{ color: '#f8fafc', fontSize: '1.1rem', display: 'block', marginBottom: '2px' }}>
          {nombre}
        </strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: '#818cf8', fontWeight: 700 }}>
            Cinturón {cinturon}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            • {maestria}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          paddingTop: '10px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '0.78rem',
          color: '#cbd5e1'
        }}>
          <div>
            <span style={{ color: '#64748b', display: 'block' }}>Altura</span>
            <strong>{altura <= 3 ? Math.round(altura * 100) : Math.round(altura)} cm</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block' }}>Peso</span>
            <strong>{peso} kg</strong>
          </div>
        </div>
      </div>

      {/* Tarjeta de Principios del Tatami */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.05)',
        padding: '14px',
        borderRadius: '12px',
        border: '1px solid rgba(99, 102, 241, 0.18)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.9rem' }}>🥋</span>
          <span style={{ fontSize: '0.78rem', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase' }}>
            Enfoque en el Tatami
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.4' }}>
          "La biomecánica correcta nace del control del centro de gravedad y la postura erguida."
        </p>
      </div>

      <p style={{ margin: '14px 0 0 0', color: '#475569', fontSize: '0.72rem', textAlign: 'center' }}>
        Tutoría adaptativa y extracción de pose monocular client-side.
      </p>
    </div>
  );
}
