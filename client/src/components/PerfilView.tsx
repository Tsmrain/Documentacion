import { useState, useEffect } from "react";

interface PerfilViewProps {
  usuarioId: string;
  userProfile: {
    nombre: string;
    cinturon: string;
    maestria: string;
    altura?: number;
    peso?: number;
  };
  onProfileUpdated: (profile: any) => void;
}

export function PerfilView({ usuarioId, userProfile, onProfileUpdated }: PerfilViewProps) {
  const [nombre, setNombre] = useState(userProfile.nombre || "Practicante");
  const [cinturon, setCinturon] = useState(userProfile.cinturon || "BLANCO");
  const [altura, setAltura] = useState<number>(userProfile.altura || 175);
  const [peso, setPeso] = useState<number>(userProfile.peso || 75);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchPerfilActual();
  }, [usuarioId]);

  const fetchPerfilActual = async () => {
    try {
      const res = await fetch(`/api/usuario/perfil?usuarioId=${usuarioId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.nombre) setNombre(data.nombre);
        if (data.cinturon) setCinturon(data.cinturon);
        if (data.altura) setAltura(Number(data.altura));
        if (data.peso) setPeso(Number(data.peso));
      }
    } catch (e) {
      console.warn("No se pudo cargar el perfil actual desde el servidor:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);

    const profilePayload = {
      usuarioId,
      nombre,
      cinturon,
      altura: Number(altura),
      peso: Number(peso)
    };

    try {
      const res = await fetch("/api/usuario/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profilePayload)
      });

      const updated = await res.json();

      // Persistencia local en browser sin login restrictivo (RNF01 / RNF07)
      try {
        localStorage.setItem("openbjj_user_id", usuarioId);
        localStorage.setItem("openbjj_user_profile", JSON.stringify(updated));
      } catch (err) {
        console.warn("No se pudo guardar en localStorage:", err);
      }

      onProfileUpdated(updated);
      setStatusMessage({ type: "success", text: "Perfil del Practicante actualizado correctamente." });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Error al actualizar perfil." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-6 animate-fade-in mb-6" style={{ padding: '24px' }}>
      <h2 style={{ marginTop: 0, color: '#818cf8', fontSize: '1.4rem' }}>Mi Perfil de Practicante (CU04 / CO04)</h2>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
        Gestiona tus datos antropométricos y grado técnico. La información se persiste localmente para adaptar la evaluación cinemática sin requerir inicio de sesión obligatorio.
      </p>

      {statusMessage && (
        <div style={{ padding: '12px', background: statusMessage.type === "success" ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: statusMessage.type === "success" ? '#34d399' : '#f87171', border: `1px solid ${statusMessage.type === "success" ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
          {statusMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>
            Nombre del Practicante *
          </label>
          <input
            type="text"
            className="input-field"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#ffffff' }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>
            Grado / Cinturón *
          </label>
          <select
            value={cinturon}
            onChange={(e) => setCinturon(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.9)', color: '#ffffff', fontWeight: 600 }}
          >
            <option value="BLANCO">Cinturón Blanco (Principiante)</option>
            <option value="AZUL">Cinturón Azul (Intermedio)</option>
            <option value="MORADO">Cinturón Morado (Avanzado)</option>
            <option value="MARRON">Cinturón Marrón (Avanzado Senior)</option>
            <option value="NEGRO">Cinturón Negro (Maestro)</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>
              Altura (cm) *
            </label>
            <input
              type="number"
              min="100"
              max="230"
              value={altura}
              onChange={(e) => setAltura(Number(e.target.value))}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#ffffff' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>
              Peso (kg) *
            </label>
            <input
              type="number"
              min="30"
              max="200"
              value={peso}
              onChange={(e) => setPeso(Number(e.target.value))}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#ffffff' }}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" style={{ marginTop: '8px', padding: '12px', fontSize: '0.95rem' }} disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar Perfil (CO04)"}
        </button>
      </form>
    </div>
  );
}
