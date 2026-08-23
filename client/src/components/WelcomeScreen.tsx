import { useState } from "react";

interface Practicante {
  usuarioId: string;
  nombre: string;
  cinturon: string;
  maestria: string;
  rol?: string;
  altura?: number;
  peso?: number;
}

interface Props {
  onPracticanteSeleccionado: (practicante: Practicante, token?: string) => void;
}

const CINTURONES = ["BLANCO", "AZUL", "MORADO", "MARRON", "NEGRO"];

const CINTURON_COLOR: Record<string, string> = {
  BLANCO: "#f8fafc",
  AZUL: "#3b82f6",
  MORADO: "#8b5cf6",
  MARRON: "#92400e",
  NEGRO: "#0f172a"
};

export function WelcomeScreen({ onPracticanteSeleccionado }: Props) {
  // Selector de Portal: Practicante vs Administración del Dojo
  const [portal, setPortal] = useState<"practicante" | "admin">("practicante");
  const [modo, setModo] = useState<"login" | "registro">("login");

  // Campos de Login Practicante
  const [loginUsuario, setLoginUsuario] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Campos de Login Administrador
  const [adminUsuario, setAdminUsuario] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Campos de Registro Practicante
  const [regNombre, setRegNombre] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCinturon, setRegCinturon] = useState("BLANCO");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const handleLoginPracticante = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginUsuario.trim()) {
      setErrorMsg("Ingresa tu nombre de usuario.");
      return;
    }
    if (!loginPassword.trim()) {
      setErrorMsg("Ingresa tu contraseña.");
      return;
    }

    setProcesando(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/usuario/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsuario.trim(),
          password: loginPassword.trim(),
          portal: "practicante"
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Credenciales inválidas. Verifica tu usuario y contraseña.");
        return;
      }

      if (data.token) {
        localStorage.setItem("openbjj_jwt", data.token);
        localStorage.setItem("openbjj_user_id", data.usuario.usuarioId);
      }

      onPracticanteSeleccionado(data.usuario, data.token);
    } catch (err: any) {
      setErrorMsg("Error de conexión al servidor. Intenta de nuevo.");
    } finally {
      setProcesando(false);
    }
  };

  const handleLoginAdmin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminUsuario.trim()) {
      setErrorMsg("Ingresa el usuario de administración.");
      return;
    }
    if (!adminPassword.trim()) {
      setErrorMsg("Ingresa la contraseña de administración.");
      return;
    }

    setProcesando(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/usuario/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsuario.trim(),
          password: adminPassword.trim(),
          portal: "admin"
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Acceso denegado. Credenciales de administración inválidas.");
        return;
      }

      // Asegurar que el objeto usuario tenga rol ADMIN
      const usuarioAdmin = {
        ...data.usuario,
        rol: "ADMIN"
      };

      if (data.token) {
        localStorage.setItem("openbjj_jwt", data.token);
        localStorage.setItem("openbjj_user_id", usuarioAdmin.usuarioId);
      }

      onPracticanteSeleccionado(usuarioAdmin, data.token);
    } catch (err: any) {
      setErrorMsg("Error al conectar con el servidor de administración.");
    } finally {
      setProcesando(false);
    }
  };

  const handleRegistroPracticante = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!regNombre.trim() || regNombre.trim().length < 2) {
      setErrorMsg("Escribe tu nombre de usuario (mínimo 2 letras).");
      return;
    }
    if (!regPassword.trim() || regPassword.trim().length < 4) {
      setErrorMsg("Ingresa una contraseña segura de al menos 4 caracteres.");
      return;
    }

    setProcesando(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/usuario/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: regNombre.trim(),
          cinturon: regCinturon,
          password: regPassword.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "No se pudo registrar la cuenta. Prueba con otro nombre de usuario.");
        return;
      }

      // Login automático tras registro exitoso
      const authRes = await fetch("/api/usuario/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId: data.usuarioId,
          password: regPassword.trim()
        })
      });

      const authData = await authRes.json();
      if (authRes.ok && authData.token) {
        localStorage.setItem("openbjj_jwt", authData.token);
        localStorage.setItem("openbjj_user_id", data.usuarioId);
        onPracticanteSeleccionado(data, authData.token);
      } else {
        onPracticanteSeleccionado(data);
      }
    } catch (err: any) {
      setErrorMsg("Error de conexión al servidor al registrar.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top, #2b080e 0%, #0f0a0a 45%, #050505 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
      color: "#f8fafc"
    }}>
      {/* Brand Header con Logo Oficial de Corpo e Mente */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <img
          src="/logo-corpo-mente.png"
          alt="Corpo e Mente Logo"
          style={{
            width: "88px",
            height: "88px",
            borderRadius: "50%",
            objectFit: "cover",
            margin: "0 auto 14px",
            display: "block",
            border: "3px solid #dc2626",
            boxShadow: "0 0 35px rgba(220, 38, 38, 0.55)"
          }}
        />
        <h1 style={{
          fontSize: "2.3rem",
          fontWeight: 900,
          letterSpacing: "-0.5px",
          margin: "0 0 4px 0",
          background: "linear-gradient(135deg, #ffffff 0%, #fca5a5 60%, #dc2626 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          CORPO E MENTE
        </h1>
        <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.95rem", fontWeight: 700, letterSpacing: "0.08em" }}>
          ACADEMIA DE JIU-JITSU & JUDÔ
        </p>
        <span style={{ fontSize: "0.78rem", color: "#f87171", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.1em" }}>
          Sistema de Biomecánica 3D & Inteligencia del Dojo
        </span>
      </div>

      {/* Selector Principal de Portal: Practicante vs Administración */}
      <div style={{
        display: "flex",
        background: "rgba(18, 18, 20, 0.9)",
        border: "1px solid rgba(220, 38, 38, 0.3)",
        borderRadius: "16px",
        padding: "4px",
        marginBottom: "20px",
        maxWidth: "440px",
        width: "100%",
        boxSizing: "border-box",
        gap: "6px"
      }}>
        <button
          type="button"
          onClick={() => { setPortal("practicante"); setErrorMsg(null); }}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "12px",
            border: "none",
            background: portal === "practicante" ? "linear-gradient(135deg, #dc2626, #b91c1c)" : "transparent",
            color: portal === "practicante" ? "#ffffff" : "#a1a1aa",
            fontWeight: 800,
            fontSize: "0.88rem",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: portal === "practicante" ? "0 2px 12px rgba(220, 38, 38, 0.45)" : "none"
          }}
        >
          🥋 Portal del Practicante
        </button>
        <button
          type="button"
          onClick={() => { setPortal("admin"); setErrorMsg(null); }}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "12px",
            border: "none",
            background: portal === "admin" ? "linear-gradient(135deg, #991b1b, #7f1d1d)" : "transparent",
            color: portal === "admin" ? "#ffffff" : "#a1a1aa",
            fontWeight: 800,
            fontSize: "0.88rem",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: portal === "admin" ? "0 2px 12px rgba(153, 27, 27, 0.45)" : "none"
          }}
        >
          🔒 Administración Dojo (BI)
        </button>
      </div>

      {/* Main Card */}
      <div style={{
        width: "100%",
        maxWidth: "440px",
        background: "rgba(18, 18, 20, 0.88)",
        backdropFilter: "blur(18px)",
        border: "1px solid rgba(220, 38, 38, 0.25)",
        borderRadius: "24px",
        padding: "28px 24px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(220, 38, 38, 0.1)"
      }}>
        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            padding: "12px 14px",
            borderRadius: "12px",
            background: "rgba(220, 38, 38, 0.2)",
            border: "1px solid rgba(220, 38, 38, 0.45)",
            color: "#fca5a5",
            fontSize: "0.85rem",
            marginBottom: "18px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* VISTA 1: PORTAL DE ADMINISTRACIÓN DEL DOJO (BUSINESS INTELLIGENCE) */}
        {/* ============================================================ */}
        {portal === "admin" ? (
          <div>
            <div style={{
              background: "rgba(220, 38, 38, 0.08)",
              border: "1px solid rgba(220, 38, 38, 0.25)",
              borderRadius: "14px",
              padding: "14px",
              marginBottom: "20px"
            }}>
              <span style={{ fontSize: "0.75rem", color: "#f87171", fontWeight: 800, textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                Gestión Estratégica & Analítica
              </span>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#e2e8f0", lineHeight: "1.4" }}>
                Acceso exclusivo para la dirección de la academia. Control de Inteligencia de Negocios (BI), Retorno de Inversión (ROI), telemetría de retención y moderación de fuentes RAG.
              </p>
            </div>

            <form onSubmit={handleLoginAdmin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "6px" }}>
                  Usuario de Administración
                </label>
                <input
                  type="text"
                  value={adminUsuario}
                  onChange={e => setAdminUsuario(e.target.value)}
                  placeholder="Ej. admin o sensei"
                  required
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    background: "rgba(10, 10, 12, 0.7)",
                    color: "#f8fafc",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "6px" }}>
                  Contraseña de Seguridad
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    background: "rgba(10, 10, 12, 0.7)",
                    color: "#f8fafc",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={procesando}
                style={{
                  marginTop: "8px",
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)",
                  color: "#ffffff",
                  fontWeight: 900,
                  fontSize: "1rem",
                  cursor: procesando ? "wait" : "pointer",
                  boxShadow: "0 4px 18px rgba(185, 28, 28, 0.5)",
                  transition: "transform 0.1s"
                }}
              >
                {procesando ? "Autenticando..." : "Ingresar al Panel de Gestión & BI"}
              </button>
            </form>
          </div>
        ) : (
          /* ============================================================ */
          /* VISTA 2: PORTAL DEL PRACTICANTE (ALUMNOS DEL TATAMI) */
          /* ============================================================ */
          <div>
            {/* Selector de Modo Practicante (Iniciar Sesión / Crear Cuenta) */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              background: "rgba(255, 255, 255, 0.04)",
              padding: "4px",
              borderRadius: "14px",
              marginBottom: "20px",
              gap: "4px",
              border: "1px solid rgba(255, 255, 255, 0.06)"
            }}>
              <button
                type="button"
                onClick={() => { setModo("login"); setErrorMsg(null); }}
                style={{
                  padding: "10px 0",
                  borderRadius: "10px",
                  border: "none",
                  background: modo === "login" ? "linear-gradient(135deg, #dc2626, #b91c1c)" : "transparent",
                  color: modo === "login" ? "#ffffff" : "#94a3b8",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: modo === "login" ? "0 2px 10px rgba(220, 38, 38, 0.4)" : "none"
                }}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => { setModo("registro"); setErrorMsg(null); }}
                style={{
                  padding: "10px 0",
                  borderRadius: "10px",
                  border: "none",
                  background: modo === "registro" ? "linear-gradient(135deg, #dc2626, #b91c1c)" : "transparent",
                  color: modo === "registro" ? "#ffffff" : "#94a3b8",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: modo === "registro" ? "0 2px 10px rgba(220, 38, 38, 0.4)" : "none"
                }}
              >
                Crear Cuenta
              </button>
            </div>

            {modo === "login" ? (
              <form onSubmit={handleLoginPracticante} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "6px" }}>
                    Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    value={loginUsuario}
                    onChange={e => setLoginUsuario(e.target.value)}
                    placeholder="Ej. santiago o Practicante"
                    required
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      background: "rgba(10, 10, 12, 0.7)",
                      color: "#f8fafc",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "6px" }}>
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      background: "rgba(10, 10, 12, 0.7)",
                      color: "#f8fafc",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                      outline: "none"
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={procesando}
                  style={{
                    marginTop: "6px",
                    width: "100%",
                    padding: "14px",
                    borderRadius: "12px",
                    border: "none",
                    background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 60%, #991b1b 100%)",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "1rem",
                    cursor: procesando ? "wait" : "pointer",
                    boxShadow: "0 4px 18px rgba(220, 38, 38, 0.5)",
                    transition: "transform 0.1s"
                  }}
                >
                  {procesando ? "Verificando..." : "Entrar al Tatami"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegistroPracticante} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "6px" }}>
                    Nombre del Practicante
                  </label>
                  <input
                    type="text"
                    value={regNombre}
                    onChange={e => setRegNombre(e.target.value)}
                    placeholder="Ej. Lucas Silva"
                    required
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      background: "rgba(10, 10, 12, 0.7)",
                      color: "#f8fafc",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "6px" }}>
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    required
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      background: "rgba(10, 10, 12, 0.7)",
                      color: "#f8fafc",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "6px" }}>
                    Cinturón Actual
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
                    {CINTURONES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setRegCinturon(c)}
                        style={{
                          padding: "8px 0",
                          borderRadius: "8px",
                          border: regCinturon === c ? "2px solid #dc2626" : "1px solid rgba(255,255,255,0.1)",
                          background: regCinturon === c ? "rgba(220,38,38,0.25)" : "rgba(255,255,255,0.03)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "4px",
                          cursor: "pointer"
                        }}
                      >
                        <div style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "4px",
                          background: CINTURON_COLOR[c],
                          border: c === "BLANCO" ? "1px solid rgba(255,255,255,0.4)" : "none"
                        }} />
                        <span style={{ fontSize: "0.65rem", color: "#cbd5e1", fontWeight: 700 }}>
                          {c.slice(0, 3)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={procesando}
                  style={{
                    marginTop: "6px",
                    width: "100%",
                    padding: "14px",
                    borderRadius: "12px",
                    border: "none",
                    background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "1rem",
                    cursor: procesando ? "wait" : "pointer",
                    boxShadow: "0 4px 18px rgba(220, 38, 38, 0.45)",
                    transition: "transform 0.1s"
                  }}
                >
                  {procesando ? "Registrando..." : "Crear Cuenta y Entrar"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div style={{ marginTop: "24px", textAlign: "center", color: "#71717a", fontSize: "0.8rem" }}>
        <span>Academia Corpo e Mente — Proceso Unificado, Craig Larman (GRASP) & Michael Mannino</span>
      </div>
    </div>
  );
}
