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

const CINTURON_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  BLANCO: { bg: "rgba(255,255,255,0.1)", text: "#f8fafc", border: "#e2e8f0" },
  AZUL: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", border: "#3b82f6" },
  MORADO: { bg: "rgba(139,92,246,0.15)", text: "#a78bfa", border: "#8b5cf6" },
  MARRON: { bg: "rgba(146,64,14,0.2)", text: "#fbbf24", border: "#b45309" },
  NEGRO: { bg: "rgba(220,38,38,0.2)", text: "#f87171", border: "#dc2626" }
};

export function PerfilView({ usuarioId, userProfile, onProfileUpdated }: PerfilViewProps) {
  const [nombre, setNombre] = useState(userProfile.nombre || "Practicante");
  const [cinturon, setCinturon] = useState(userProfile.cinturon || "BLANCO");
  
  // Manejo de inputs como string para evitar glitches de 0 al borrar
  const initAltura = userProfile.altura ? (userProfile.altura <= 3 ? String(userProfile.altura * 100) : String(userProfile.altura)) : "";
  const initPeso = userProfile.peso ? String(userProfile.peso) : "";
  
  const [alturaInput, setAlturaInput] = useState<string>(initAltura);
  const [pesoInput, setPesoInput] = useState<string>(initPeso);

  // Campos de cambio de contraseña
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  
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

    if (nuevaPassword.trim()) {
      if (nuevaPassword.trim().length < 4) {
        setStatusMessage({ type: "error", text: "La nueva contraseña debe tener al menos 4 caracteres." });
        setSubmitting(false);
        return;
      }
      if (nuevaPassword !== confirmarPassword) {
        setStatusMessage({ type: "error", text: "Las contraseñas no coinciden. Por favor verifícalas." });
        setSubmitting(false);
        return;
      }
    }

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

    const profilePayload: any = {
      usuarioId,
      nombre,
      cinturon,
      altura: parsedAltura,
      peso: parsedPeso
    };

    if (nuevaPassword.trim()) {
      profilePayload.password = nuevaPassword.trim();
    }

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
      setNuevaPassword("");
      setConfirmarPassword("");
      setStatusMessage({ 
        type: "success", 
        text: nuevaPassword.trim() 
          ? "¡Perfil y contraseña actualizados con éxito!" 
          : "Perfil biométrico actualizado correctamente." 
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Error al actualizar perfil." });
    } finally {
      setSubmitting(false);
    }
  };

  const currentBeltStyle = CINTURON_COLOR[cinturon] || CINTURON_COLOR.BLANCO;

  const commonStyle = {
    input: {
      width: '100%',
      padding: '12px 14px',
      borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.12)',
      background: 'rgba(10, 10, 14, 0.7)',
      color: '#ffffff',
      fontSize: '0.95rem',
      outline: 'none',
      boxSizing: 'border-box' as const
    },
    label: {
      display: 'block',
      marginBottom: '6px',
      fontSize: '0.82rem',
      color: '#cbd5e1',
      fontWeight: 700
    }
  };

  return (
    <div className="glass-panel p-6 animate-fade-in mb-6" style={{ padding: '28px', maxWidth: '780px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(220, 38, 38, 0.2)',
        paddingBottom: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '1.4rem', fontWeight: 800 }}>
            Perfil del Practicante & Calibración 3D
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
            Academia Corpo e Mente — Ajustes biomecánicos y seguridad de la cuenta.
          </p>
        </div>

        <div style={{
          padding: '6px 14px',
          borderRadius: '20px',
          background: currentBeltStyle.bg,
          border: `1px solid ${currentBeltStyle.border}`,
          color: currentBeltStyle.text,
          fontSize: '0.8rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          🥋 Cinturón {cinturon}
        </div>
      </div>

      {statusMessage && (
        <div style={{
          padding: '12px 16px',
          background: statusMessage.type === "success" ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          color: statusMessage.type === "success" ? '#34d399' : '#f87171',
          border: `1px solid ${statusMessage.type === "success" ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
          borderRadius: '10px',
          marginBottom: '20px',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          {statusMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Sección: Información Básica */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '18px'
        }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', color: '#e2e8f0', fontWeight: 700 }}>
            🥋 Datos del Practicante
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={commonStyle.label}>
                Nombre o Identificador *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={commonStyle.input}
                required
              />
            </div>

            <div>
              <label style={commonStyle.label}>
                Grado / Cinturón *
              </label>
              <select
                value={cinturon}
                onChange={(e) => setCinturon(e.target.value)}
                style={{
                  ...commonStyle.input,
                  background: 'rgba(15, 23, 42, 0.95)',
                  fontWeight: 700
                }}
              >
                <option value="BLANCO">Cinturón Blanco (Principiante)</option>
                <option value="AZUL">Cinturón Azul (Intermedio)</option>
                <option value="MORADO">Cinturón Morado (Avanzado)</option>
                <option value="MARRON">Cinturón Marrón (Avanzado Senior)</option>
                <option value="NEGRO">Cinturón Negro (Maestro)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sección: Calibración Antropométrica */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '18px'
        }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', color: '#e2e8f0', fontWeight: 700 }}>
            📏 Calibración Antropométrica 3D
          </h3>
          <p style={{ margin: '0 0 14px 0', color: '#71717a', fontSize: '0.8rem' }}>
            Ajusta tu altura y peso para que los ángulos y vectores de MediaPipe se calibren a tu contextura.
          </p>

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
        </div>

        {/* Sección: Cambio de Contraseña */}
        <div style={{
          background: 'rgba(220,38,38,0.03)',
          border: '1px solid rgba(220,38,38,0.15)',
          borderRadius: '12px',
          padding: '18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f87171', fontWeight: 700 }}>
              🔐 Seguridad & Contraseña Personal
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Opcional
            </span>
          </div>
          <p style={{ margin: '0 0 14px 0', color: '#71717a', fontSize: '0.8rem' }}>
            Tu contraseña inicial es <strong>1234</strong>. Puedes cambiarla por tu propia clave privada aquí:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={commonStyle.label}>
                Nueva Contraseña
              </label>
              <input
                type="password"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                style={commonStyle.input}
                placeholder="Dejar en blanco para mantener 1234"
              />
            </div>

            <div>
              <label style={commonStyle.label}>
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                style={commonStyle.input}
                placeholder="Repite la nueva contraseña"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          style={{
            padding: '14px',
            borderRadius: '12px',
            fontSize: '0.95rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            boxShadow: '0 4px 18px rgba(220, 38, 38, 0.45)',
            cursor: submitting ? 'wait' : 'pointer'
          }}
          disabled={submitting}
        >
          {submitting ? "Guardando Cambios..." : "Guardar Cambios del Perfil"}
        </button>
      </form>
    </div>
  );
}

