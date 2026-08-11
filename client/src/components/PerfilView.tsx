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
  const [nombre, setNombre] = useState(userProfile.nombre || "Practicante Kiosco");
  const [cinturon, setCinturon] = useState(userProfile.cinturon || "BLANCO");
  
  // Manejo de inputs como string para evitar glitches de 0 al borrar
  const initAltura = userProfile.altura ? (userProfile.altura <= 3 ? String(userProfile.altura * 100) : String(userProfile.altura)) : "";
  const initPeso = userProfile.peso ? String(userProfile.peso) : "";
  
  const [alturaInput, setAlturaInput] = useState<string>(initAltura);
  const [pesoInput, setPesoInput] = useState<string>(initPeso);
  
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("openbjj_jwt");
    if (token) {
      fetchPerfilActual(token);
    }
  }, [usuarioId]);

  const fetchPerfilActual = async (token: string) => {
    try {
      const res = await fetch(`/api/usuario/perfil?usuarioId=${usuarioId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.nombre) setNombre(data.nombre);
        if (data.cinturon) setCinturon(data.cinturon);
        if (data.altura) {
          const val = Number(data.altura);
          setAlturaInput(val <= 3 ? String(val * 100) : String(val));
        }
        if (data.peso) setPesoInput(String(data.peso));
      }
    } catch (e) {
      console.warn("No se pudo cargar el perfil actual desde el servidor:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);

    // Parser inteligente
    let parsedAltura = 1.75;
    if (alturaInput) {
      const p = parseFloat(alturaInput.replace(/,/g, '.').replace(/[^0-9.]/g, ''));
      if (!isNaN(p)) {
        parsedAltura = p > 3 ? p / 100 : p;
      }
    }

    let parsedPeso = 75;
    if (pesoInput) {
      const p = parseFloat(pesoInput.replace(/,/g, '.').replace(/[^0-9.]/g, ''));
      if (!isNaN(p)) {
        parsedPeso = p;
      }
    }

    const profilePayload = {
      usuarioId,
      nombre,
      cinturon,
      altura: parsedAltura,
      peso: parsedPeso
    };

    const token = localStorage.getItem("openbjj_jwt");

    try {
      const res = await fetch("/api/usuario/perfil", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(profilePayload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error de red.");
      }

      const updated = await res.json();

      try {
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

  const commonStyle = {
    input: { width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#ffffff' },
    label: { display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }
  };

  return (
    <div className="glass-panel p-6 animate-fade-in mb-6" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#818cf8', fontSize: '1.4rem' }}>Calibracion del Practicante (Kiosco)</h2>
      </div>
      
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
        Ajusta tus proporciones antropometricas para afinar la estimacion cinematica de MediaPipe. Los cambios se aplicaran en caliente.
      </p>

      {statusMessage && (
        <div style={{ padding: '12px', background: statusMessage.type === "success" ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: statusMessage.type === "success" ? '#34d399' : '#f87171', border: `1px solid ${statusMessage.type === "success" ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
          {statusMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={commonStyle.label}>
            Nombre o Identificador *
          </label>
          <input
            type="text"
            className="input-field"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={commonStyle.input}
            required
          />
        </div>

        <div>
          <label style={commonStyle.label}>
            Grado / Cinturon *
          </label>
          <select
            value={cinturon}
            onChange={(e) => setCinturon(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.9)', color: '#ffffff', fontWeight: 600 }}
          >
            <option value="BLANCO">Cinturon Blanco (Principiante)</option>
            <option value="AZUL">Cinturon Azul (Intermedio)</option>
            <option value="MORADO">Cinturon Morado (Avanzado)</option>
            <option value="MARRON">Cinturon Marron (Avanzado Senior)</option>
            <option value="NEGRO">Cinturon Negro (Maestro)</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={commonStyle.label}>
              Altura (cm o m) *
            </label>
            <input
              type="text"
              value={alturaInput}
              onChange={(e) => setAlturaInput(e.target.value)}
              style={commonStyle.input}
              placeholder="Ej: 175 o 1.75"
              required
            />
          </div>

          <div>
            <label style={commonStyle.label}>
              Peso (kg) *
            </label>
            <input
              type="text"
              value={pesoInput}
              onChange={(e) => setPesoInput(e.target.value)}
              style={commonStyle.input}
              placeholder="Ej: 75"
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" style={{ marginTop: '8px', padding: '12px', fontSize: '0.95rem' }} disabled={submitting}>
          {submitting ? "Calibrando..." : "Calibrar Perfil Físico"}
        </button>
      </form>
    </div>
  );
}
