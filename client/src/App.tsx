import { useState, useEffect, useCallback, useRef } from "react";
import { DojoDashboard } from "./components/DojoDashboard";
import { VideoAnalyzer } from "./components/VideoAnalyzer";
import { AnalysisReportView } from "./components/AnalysisReportView";
import { RagIngestionPanel } from "./components/RagIngestionPanel";
import { ProgresoView } from "./components/ProgresoView";
import { HistoryView } from "./components/HistoryView";
import { PerfilView } from "./components/PerfilView";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { AdminDojoView } from "./components/AdminDojoView";

// Union de tabs validos. "reporte" es un tab dedicado para el resultado del analisis biomecanico.
type TabId = "analizador" | "reporte" | "progreso" | "historial" | "perfil" | "administracion" | "rag";

// Extrae 9 keyframes de alta fidelidad del video en formato JPEG Base64.
// Escala a 480px a calidad 65% para máxima nitidez de extremidades y kimonos.
const extractFramesFromVideo = async (videoBlob: Blob, numFrames: number = 9): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("No 2D context disponible");
      const duration = video.duration || 1;
      const frames: string[] = [];
      let processed = 0;
      const scale = Math.min(480 / (video.videoWidth || 640), 1);
      canvas.width = (video.videoWidth || 640) * scale;
      canvas.height = (video.videoHeight || 480) * scale;

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
        const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
        frames.push(base64);
        processed++;
        if (processed === numFrames) {
          URL.revokeObjectURL(video.src);
          resolve(frames);
        } else {
          seekNext();
        }
      };
      const seekNext = () => {
        const time = (duration / (numFrames + 1)) * (processed + 1);
        video.currentTime = time;
      };
      seekNext();
    };
    video.onerror = (e) => reject(e);
  });
};

// Parseo seguro de JSON. Devuelve null en lugar de lanzar excepcion.
// Protege contra respuestas malformadas de Gemini (markdown wrappers, texto parcial, etc.).
function safeJsonParse(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    // Intento de extraccion de bloque JSON incrustado en texto (por ejemplo dentro de markdown)
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function App() {
  const [report, setReport] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>("analizador");
  const [previousTab, setPreviousTab] = useState<TabId>("analizador");
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{
    nombre: string;
    cinturon: string;
    maestria: string;
    altura?: number;
    peso?: number;
  }>({
    nombre: "Practicante",
    cinturon: "BLANCO",
    maestria: "Principiante",
    altura: 175,
    peso: 75
  });

  // --- Estado global de analisis resiliente (CU01 / CU05) ---
  // El fetch vive en App.tsx, NO en VideoAnalyzer. Asi el analisis continua
  // aunque el usuario navegue a otra pestana y VideoAnalyzer se desmonte.
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>("");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // historialVersion fuerza un rerender de HistoryView al completar el analisis
  const [historialVersion, setHistorialVersion] = useState(0);
  // Ref para evitar iniciar un nuevo analisis si uno ya esta en curso
  const analyzingRef = useRef(false);

  // --- Restauración automática de sesión al recargar la página ---
  useEffect(() => {
    const savedToken = localStorage.getItem("openbjj_jwt");
    const savedUserId = localStorage.getItem("openbjj_user_id");
    const savedProfile = localStorage.getItem("openbjj_user_profile");

    if (savedToken && savedUserId) {
      setUsuarioId(savedUserId);
      if (savedProfile) {
        try {
          const prof = JSON.parse(savedProfile);
          setUserProfile(prof);
          const esAdm = prof.rol === "ADMIN" ||
            prof.nombre?.toLowerCase() === "admin" ||
            prof.nombre?.toLowerCase() === "administrador" ||
            prof.nombre?.toLowerCase() === "sensei";
          if (esAdm) {
            setActiveTab("administracion");
          }
        } catch {}
      }
    }
  }, []);

  const handleLogout = () => {
    setUsuarioId(null);
    setSelectedFile(null);
    setReport(null);
    setIsAnalyzing(false);
    setAnalysisProgress("");
    setAnalysisError(null);
    setActiveTab("analizador");
    setPreviousTab("analizador");
    localStorage.removeItem("openbjj_jwt");
    localStorage.removeItem("openbjj_user_id");
    localStorage.removeItem("openbjj_user_profile");
  };

  const openRag = () => {
    if (activeTab !== "rag") {
      setPreviousTab(activeTab);
    }
    setActiveTab("rag");
  };

  const closeRag = () => {
    setActiveTab(previousTab);
  };

  const handlePracticanteSeleccionado = (practicante: any) => {
    setUsuarioId(practicante.usuarioId);
    const esAdm = practicante.rol === "ADMIN" ||
      practicante.nombre?.toLowerCase() === "admin" ||
      practicante.nombre?.toLowerCase() === "administrador" ||
      practicante.nombre?.toLowerCase() === "sensei" ||
      practicante.nombre?.toLowerCase() === "dojo_admin";

    const perfilObj = {
      usuarioId: practicante.usuarioId,
      nombre: practicante.nombre,
      cinturon: practicante.cinturon,
      maestria: practicante.maestria,
      rol: esAdm ? "ADMIN" : "PRACTICANTE",
      altura: practicante.altura || 175,
      peso: practicante.peso || 75
    };

    setUserProfile(perfilObj as any);
    localStorage.setItem("openbjj_user_profile", JSON.stringify(perfilObj));
    localStorage.setItem("openbjj_user_id", practicante.usuarioId);

    // Limpieza estricta de estado por sesión (evita que un video previo permanezca)
    setSelectedFile(null);
    setReport(null);
    setIsAnalyzing(false);
    setAnalysisProgress("");
    setAnalysisError(null);

    const initialTab: TabId = esAdm ? "administracion" : "analizador";
    setActiveTab(initialTab);
    setPreviousTab(initialTab);
    setHistorialVersion(0);
    console.log(`[App] Usuario activo: ${practicante.nombre} (${practicante.usuarioId}) - Rol: ${esAdm ? "ADMIN" : "PRACTICANTE"}`);
  };

  useEffect(() => {
    if (!usuarioId) return;
    fetchUserProfile();
  }, [usuarioId]);

  const fetchUserProfile = async (token?: string) => {
    try {
      const headers: any = {};
      const t = token || localStorage.getItem("openbjj_jwt");
      if (t) headers["Authorization"] = `Bearer ${t}`;

      const res = await fetch(`/api/sesion/perfil?usuarioId=${usuarioId}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setUserProfile(json);
      }
    } catch (e) {
      console.warn("[App] Error al cargar perfil del usuario:", e);
    }
  };

  // Iniciado desde VideoAnalyzer pero ejecutado en App.tsx para que el fetch
  // sobreviva la desmontada de VideoAnalyzer al cambiar de pestana.
  const startAnalysis = useCallback(async (file: File, tecnicaObjetivo?: string) => {
    if (analyzingRef.current) return;
    analyzingRef.current = true;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisProgress("Extrayendo 9 keyframes de alta fidelidad del combate (480px, JPEG 65%)...");

    try {
      let frames: string[] = [];
      try {
        frames = await extractFramesFromVideo(file, 9);
      } catch (frameErr) {
        console.warn("[App] No se pudieron extraer frames del video HTML5:", frameErr);
      }

      setAnalysisProgress("Fase 1: Clasificación y alineación visual biomecánica...");

      const token = localStorage.getItem("openbjj_jwt");
      const response = await fetch("/api/sesion/analizar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          videoBlob: file.name,
          fileName: file.name,
          frames,
          usuarioId,
          tecnicaObjetivo
        })
      });

      setAnalysisProgress("Fase 2: Evaluación biomecánica adaptativa y grounding en RAG...");

      const rawText = await response.text();
      const data = safeJsonParse(rawText);

      if (!data) {
        throw new Error("La respuesta del servidor no es JSON valido. Intenta de nuevo.");
      }

      if (!response.ok && response.status !== 207) {
        throw new Error(data.error || "Ocurrio un error en la evaluacion.");
      }

      setAnalysisProgress("Analisis completado.");
      // Incrementa version para que HistoryView recargue datos (CU05)
      setHistorialVersion(v => v + 1);
      setReport(data);
      setActiveTab("reporte");

    } catch (err: any) {
      console.warn("[App] Error en pipeline de analisis:", err.message);
      setAnalysisError(err.message);
      setAnalysisProgress("");
    } finally {
      setIsAnalyzing(false);
      analyzingRef.current = false;
    }
  }, [usuarioId]);

  // Carga un reporte del historial y navega directamente al tab "reporte".
  const handleSelectReportFromHistory = (selectedReport: any) => {
    setReport(selectedReport);
    setActiveTab("reporte");
  };

  // Limpia el resultado actual y regresa al analizador.
  const handleClearReport = () => {
    setReport(null);
    setSelectedFile(null);
    setActiveTab("analizador");
  };

  const handleProfileUpdated = (updated: any) => {
    setUserProfile(updated);
    if (updated.usuarioId) {
      setUsuarioId(updated.usuarioId);
    }
  };

  const esAdmin = (userProfile as any)?.rol === "ADMIN" || 
    userProfile.nombre.toLowerCase() === "admin" || 
    userProfile.nombre.toLowerCase() === "administrador" ||
    userProfile.nombre.toLowerCase() === "sensei" || 
    userProfile.nombre.toLowerCase() === "dojo_admin";

  const tabBtnStyle = (tab: TabId): React.CSSProperties => ({
    padding: "10px 18px",
    background: activeTab === tab ? "linear-gradient(135deg, #dc2626, #b91c1c)" : "rgba(255,255,255,0.03)",
    color: activeTab === tab ? "#ffffff" : "#cbd5e1",
    border: activeTab === tab ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.06)",
    borderRadius: "10px",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: activeTab === tab ? "0 4px 15px rgba(220, 38, 38, 0.4)" : "none"
  });

  // Si aun no hay practicante activo, mostrar pantalla de seleccion
  if (!usuarioId) {
    return <WelcomeScreen onPracticanteSeleccionado={handlePracticanteSeleccionado} />;
  }


  return (
    <div className="container" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "18px 0",
          borderBottom: "1px solid rgba(220, 38, 38, 0.2)",
          marginBottom: "24px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <img
            src="/logo-corpo-mente.png"
            alt="Corpo e Mente Logo"
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #dc2626",
              boxShadow: "0 0 20px rgba(220, 38, 38, 0.5)"
            }}
          />
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.7rem",
                fontWeight: 900,
                letterSpacing: "-0.5px",
                background: "linear-gradient(135deg, #ffffff 0%, #fca5a5 60%, #dc2626 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              CORPO E MENTE BJJ
            </h1>
            <p style={{ margin: "2px 0 0 0", color: "#94a3b8", fontSize: "0.82rem", fontWeight: 600 }}>
              Academia de Jiu-Jitsu & Judô — Sistema de Biomecánica 3D
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "6px 12px",
            borderRadius: "10px",
            background: "rgba(220, 38, 38, 0.08)",
            border: "1px solid rgba(220, 38, 38, 0.25)"
          }}>
            <div style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #dc2626, #991b1b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "0.85rem",
              color: "#ffffff"
            }}>
              {userProfile.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <span style={{ color: "#f8fafc", fontSize: "0.85rem", fontWeight: 700, display: "block" }}>
                {userProfile.nombre}
              </span>
              {esAdmin && (
                <span style={{ fontSize: "0.68rem", color: "#f87171", fontWeight: 800, textTransform: "uppercase" }}>
                  ADMIN DOJO
                </span>
              )}
            </div>
          </div>
          <button
            className="btn-secondary"
            style={{ padding: "8px 14px", fontSize: "0.82rem" }}
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            Cerrar Sesión
          </button>
          <button
            className="btn-secondary"
            style={{
              padding: "8px 14px",
              fontSize: "0.82rem",
              background: activeTab === "rag" ? "linear-gradient(135deg, #dc2626, #b91c1c)" : undefined,
              borderColor: activeTab === "rag" ? "rgba(220, 38, 38, 0.5)" : undefined,
              color: activeTab === "rag" ? "#ffffff" : undefined
            }}
            onClick={() => {
              if (activeTab === "rag") {
                closeRag();
              } else {
                openRag();
              }
            }}
          >
            {activeTab === "rag" ? "Volver" : "Ingresar Fuente"}
          </button>
        </div>
      </header>

      {/* Banner de analisis en segundo plano: visible cuando el usuario navega fuera del analizador */}
      {isAnalyzing && activeTab !== "analizador" && (
        <div style={{
          padding: "10px 16px",
          background: "rgba(99, 102, 241, 0.12)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          borderRadius: "8px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "0.85rem",
          color: "#a5b4fc"
        }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6366f1", animation: "pulse 1.5s ease-in-out infinite" }} />
          <span>Analisis biomecanico en proceso en segundo plano... {analysisProgress && `(${analysisProgress})`}</span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          paddingBottom: "12px"
        }}
      >
        <button type="button" style={tabBtnStyle("analizador")} onClick={() => setActiveTab("analizador")}>
          Analizar Video
        </button>
        {/* La pestana Reporte aparece solo cuando existe un resultado de analisis */}
        {report && (
          <button type="button" style={tabBtnStyle("reporte")} onClick={() => setActiveTab("reporte")}>
            Reporte Biomecanico
          </button>
        )}
        <button type="button" style={tabBtnStyle("progreso")} onClick={() => setActiveTab("progreso")}>
          Mi Progreso
        </button>
        <button type="button" style={tabBtnStyle("historial")} onClick={() => setActiveTab("historial")}>
          Historial
        </button>
        <button type="button" style={tabBtnStyle("perfil")} onClick={() => setActiveTab("perfil")}>
          Mi Perfil
        </button>
        {esAdmin && (
          <button
            type="button"
            style={{
              ...tabBtnStyle("administracion"),
              background: activeTab === "administracion" ? "linear-gradient(135deg, #dc2626, #991b1b)" : "rgba(220, 38, 38, 0.1)",
              border: "1px solid rgba(220, 38, 38, 0.35)",
              color: activeTab === "administracion" ? "#ffffff" : "#fca5a5",
              marginLeft: "auto"
            }}
            onClick={() => setActiveTab("administracion")}
          >
            📊 Panel de Administración & Analítica
          </button>
        )}
      </div>

      <main
        style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(240px, 280px) 1fr", gap: "32px" }}
      >
        <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <DojoDashboard usuarioId={usuarioId} userProfile={userProfile} />
        </section>

        <section>
          {activeTab === "administracion" ? (
            <AdminDojoView onOpenRag={openRag} />
          ) : activeTab === "rag" ? (
            <RagIngestionPanel onClose={closeRag} usuarioId={usuarioId} />
          ) : activeTab === "progreso" ? (
            <ProgresoView usuarioId={usuarioId} key={historialVersion} />
          ) : activeTab === "historial" ? (
            <HistoryView
              usuarioId={usuarioId}
              onSelectReport={handleSelectReportFromHistory}
              refreshVersion={historialVersion}
              onHistorialDeleted={() => setHistorialVersion(v => v + 1)}
            />
          ) : activeTab === "perfil" ? (
            <PerfilView
              usuarioId={usuarioId}
              userProfile={userProfile}
              onProfileUpdated={handleProfileUpdated}
            />
          ) : activeTab === "reporte" && report ? (
            <AnalysisReportView report={report} onClear={handleClearReport} />
          ) : (
            <VideoAnalyzer
              usuarioId={usuarioId}
              isAnalyzing={isAnalyzing}
              analysisProgress={analysisProgress}
              analysisError={analysisError}
              selectedFile={selectedFile}
              onFileSelected={setSelectedFile}
              onStartAnalysis={startAnalysis}
            />
          )}
        </section>
      </main>

      <footer
        style={{
          textAlign: "center",
          padding: "32px 0",
          color: "#475569",
          fontSize: "0.8rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          marginTop: "48px"
        }}
      >
        OpenBJJ - Proyecto Academico. Operando bajo el Nivel Gratuito de Google AI Studio.
      </footer>
    </div>
  );
}

export default App;

