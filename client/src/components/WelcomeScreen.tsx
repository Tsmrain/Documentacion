import { useState, useEffect } from "react";

interface Practicante {
  usuarioId: string;
  nombre: string;
  cinturon: string;
  maestria: string;
}

interface Props {
  onPracticanteSeleccionado: (practicante: Practicante) => void;
}

const CINTURONES = ["BLANCO", "AZUL", "MORADO", "MARRON", "NEGRO"];

const CINTURON_COLOR: Record<string, string> = {
  BLANCO: "#f1f5f9",
  AZUL: "#3b82f6",
  MORADO: "#8b5cf6",
  MARRON: "#92400e",
  NEGRO: "#0f172a"
};

const CINTURON_LABEL: Record<string, string> = {
  BLANCO: "Blanco",
  AZUL: "Azul",
  MORADO: "Morado",
  MARRON: "Marron",
  NEGRO: "Negro"
};

export function WelcomeScreen({ onPracticanteSeleccionado }: Props) {
  const [practicantes, setPracticantes] = useState<Practicante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nombre, setNombre] = useState("");
  const [cinturon, setCinturon] = useState("BLANCO");
  const [registrando, setRegistrando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    cargarPracticantes();
  }, []);

  const cargarPracticantes = async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/usuario/listar");
      if (res.ok) {
        const data = await res.json();
        setPracticantes(data);
      }
    } catch (e) {
      console.warn("[WelcomeScreen] Error al cargar practicantes:", e);
    } finally {
      setCargando(false);
    }
  };

  const handleRegistrar = async () => {
    if (!nombre.trim() || nombre.trim().length < 2) {
      setErrorMsg("Escribe tu nombre (al menos 2 letras).");
      return;
    }
    setRegistrando(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/usuario/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), cinturon })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "No se pudo registrar. Intenta de nuevo.");
        return;
      }
      onPracticanteSeleccionado(data);
    } catch (e: any) {
      setErrorMsg("Error de conexion. Verifica que el servidor este activo.");
    } finally {
      setRegistrando(false);
    }
  };

  const practicantesFiltrados = practicantes.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0a0f1e 0%, #111827 60%, #0d1b2a 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "32px 16px",
      fontFamily: "'Inter', 'Outfit', sans-serif",
      color: "#f1f5f9"
    }}>
      {/* Logo y titulo */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{
          width: "72px",
          height: "72px",
          borderRadius: "20px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          fontSize: "2rem",
          boxShadow: "0 0 40px rgba(99,102,241,0.35)"
        }}>
          B
        </div>
        <h1 style={{
          fontSize: "2rem",
          fontWeight: 800,
          margin: "0 0 6px 0",
          background: "linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          OpenBJJ
        </h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
          Dojo Cuerpo y Mente — Tutor Inteligente de Jiu-Jitsu
        </p>
        <p style={{ margin: "8px 0 0 0", color: "#94a3b8", fontSize: "1rem", fontWeight: 600 }}>
          quien esta entrenando hoy?
        </p>
      </div>

      {!mostrarFormulario ? (
        <div style={{ width: "100%", maxWidth: "480px" }}>
          {/* Buscador */}
          {practicantes.length > 4 && (
            <input
              type="text"
              placeholder="Buscar mi nombre..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "#f1f5f9",
                fontSize: "1rem",
                marginBottom: "16px",
                boxSizing: "border-box",
                outline: "none"
              }}
            />
          )}

          {/* Lista de practicantes */}
          {cargando ? (
            <div style={{ textAlign: "center", color: "#64748b", padding: "40px 0" }}>
              Cargando practicantes del dojo...
            </div>
          ) : practicantesFiltrados.length === 0 ? (
            <div style={{
              textAlign: "center",
              color: "#64748b",
              padding: "40px 20px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "16px",
              border: "1px dashed rgba(255,255,255,0.08)",
              marginBottom: "16px"
            }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "1.1rem" }}>
                {busqueda ? "No se encontro ese nombre." : "Aun no hay practicantes registrados."}
              </p>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569" }}>
                {busqueda ? "Revisa la escritura o registrate como nuevo." : "Registrate para comenzar."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              {practicantesFiltrados.map(p => (
                <button
                  key={p.usuarioId}
                  onClick={() => onPracticanteSeleccionado(p)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 18px",
                    background: "rgba(99,102,241,0.07)",
                    border: "1px solid rgba(99,102,241,0.18)",
                    borderRadius: "14px",
                    cursor: "pointer",
                    color: "#f1f5f9",
                    textAlign: "left",
                    transition: "all 0.2s",
                    width: "100%"
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.18)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(99,102,241,0.07)")}
                >
                  {/* Avatar con inicial */}
                  <div style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "1.2rem",
                    flexShrink: 0
                  }}>
                    {p.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>{p.nombre}</div>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>
                      {p.maestria}
                    </div>
                  </div>
                  {/* Franja de cinturon */}
                  <div style={{
                    width: "10px",
                    height: "36px",
                    borderRadius: "4px",
                    background: CINTURON_COLOR[p.cinturon] || "#fff",
                    border: p.cinturon === "BLANCO" ? "1px solid rgba(255,255,255,0.2)" : "none",
                    flexShrink: 0
                  }} />
                </button>
              ))}
            </div>
          )}

          {/* Boton nuevo practicante */}
          <button
            onClick={() => setMostrarFormulario(true)}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "14px",
              border: "2px dashed rgba(99,102,241,0.4)",
              background: "transparent",
              color: "#a5b4fc",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.8)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)")}
          >
            Soy nuevo, registrarme
          </button>
        </div>
      ) : (
        /* Formulario de registro */
        <div style={{
          width: "100%",
          maxWidth: "480px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          padding: "28px 24px"
        }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: "1.2rem", fontWeight: 700, color: "#a5b4fc" }}>
            Registrarme en el dojo
          </h2>

          <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", color: "#94a3b8" }}>
            Como te llamas?
          </label>
          <input
            type="text"
            placeholder="Tu nombre (ej. Carlos, Ana)"
            value={nombre}
            onChange={e => { setNombre(e.target.value); setErrorMsg(null); }}
            maxLength={50}
            autoFocus
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "#f1f5f9",
              fontSize: "1rem",
              marginBottom: "18px",
              boxSizing: "border-box",
              outline: "none"
            }}
          />

          <label style={{ display: "block", marginBottom: "10px", fontSize: "0.85rem", color: "#94a3b8" }}>
            Color de tu cinturon
          </label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
            {CINTURONES.map(c => (
              <button
                key={c}
                onClick={() => setCinturon(c)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: cinturon === c ? "2px solid #6366f1" : "2px solid rgba(255,255,255,0.08)",
                  background: cinturon === c ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                  color: "#f1f5f9",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.85rem",
                  fontWeight: cinturon === c ? 700 : 400,
                  transition: "all 0.2s"
                }}
              >
                <span style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "2px",
                  background: CINTURON_COLOR[c],
                  border: c === "BLANCO" ? "1px solid rgba(255,255,255,0.3)" : "none",
                  flexShrink: 0
                }} />
                {CINTURON_LABEL[c]}
              </button>
            ))}
          </div>

          {errorMsg && (
            <div style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5",
              fontSize: "0.85rem",
              marginBottom: "16px"
            }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => { setMostrarFormulario(false); setErrorMsg(null); setNombre(""); }}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "#94a3b8",
                fontSize: "0.9rem",
                cursor: "pointer"
              }}
            >
              Volver
            </button>
            <button
              onClick={handleRegistrar}
              disabled={registrando}
              style={{
                flex: 2,
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                background: registrando ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#ffffff",
                fontSize: "0.95rem",
                fontWeight: 700,
                cursor: registrando ? "not-allowed" : "pointer",
                transition: "all 0.2s"
              }}
            >
              {registrando ? "Registrando..." : "Entrar al sistema"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
