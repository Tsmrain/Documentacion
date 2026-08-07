import { useState, useEffect, useCallback, useRef } from "react";
import { DojoDashboard } from "./components/DojoDashboard";
import { VideoAnalyzer } from "./components/VideoAnalyzer";
import { AnalysisReportView } from "./components/AnalysisReportView";
import { RagIngestionPanel } from "./components/RagIngestionPanel";
import { ProgresoView } from "./components/ProgresoView";
import { HistoryView } from "./components/HistoryView";
import { PerfilView } from "./components/PerfilView";

// Union de tabs validos. "reporte" es un tab dedicado para el resultado del analisis biomecanico.
type TabId = "analizador" | "reporte" | "progreso" | "historial" | "perfil" | "rag";

// Extrae 9 keyframes del video en formato JPEG Base64.
// Escala a 360px maximo para optimizar consumo de tokens de Gemini.
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
      const scale = Math.min(360 / (video.videoWidth || 640), 1);
      canvas.width = (video.videoWidth || 640) * scale;
      canvas.height = (video.videoHeight || 480) * scale;

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.4);
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
  const [usuarioId, setUsuarioId] = useState<string>(() => {
    return localStorage.getItem("openbjj_user_id") || "user-default";
  });
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

  useEffect(() => {
    fetchUserProfile();
  }, [usuarioId]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`/api/sesion/perfil?usuarioId=${usuarioId}`);
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
  const startAnalysis = useCallback(async (file: File) => {
    if (analyzingRef.current) return;
    analyzingRef.current = true;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisProgress("Extrayendo 9 keyframes del combate (360px, JPEG 40%)...");

    try {
      let frames: string[] = [];
      try {
        frames = await extractFramesFromVideo(file, 9);
      } catch (frameErr) {
        console.warn("[App] No se pudieron extraer frames del video HTML5:", frameErr);
      }

      setAnalysisProgress("Fase 1: Clasificacion visual de posicion (gemini-2.5-flash)...");

      const response = await fetch("/api/sesion/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoBlob: file.name,
          fileName: file.name,
          frames,
          usuarioId
        })
      });

      setAnalysisProgress("Fase 2: Evaluacion biomecanica focalizada (grounding RAG)...");

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

  const tabBtnStyle = (tab: TabId): React.CSSProperties => ({
    padding: "10px 20px",
    background: activeTab === tab ? "#6366f1" : "rgba(255,255,255,0.02)",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s"
  });

  return (
    <div className="container" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 0",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          marginBottom: "24px"
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.8rem",
              fontWeight: 800,
              background: "linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            OpenBJJ
          </h1>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.85rem" }}>
            Tutor Biomecanico Adaptativo y Grounding RAG para Jiu-Jitsu
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="btn-secondary"
            style={{
              padding: "8px 14px",
              fontSize: "0.85rem",
              background: activeTab === "rag" ? "#6366f1" : undefined
            }}
            onClick={() => setActiveTab(activeTab === "rag" ? "analizador" : "rag")}
          >
            {activeTab === "rag" ? "Volver al Analizador" : "Agregar Fuente"}
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
      </div>

      <main
        style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(240px, 280px) 1fr", gap: "32px" }}
      >
        <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <DojoDashboard usuarioId={usuarioId} userProfile={userProfile} />
        </section>

        <section>
          {activeTab === "rag" ? (
            <RagIngestionPanel onClose={() => setActiveTab("analizador")} usuarioId={usuarioId} />
          ) : activeTab === "progreso" ? (
            <ProgresoView usuarioId={usuarioId} />
          ) : activeTab === "historial" ? (
            <HistoryView
              usuarioId={usuarioId}
              onSelectReport={handleSelectReportFromHistory}
              refreshVersion={historialVersion}
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

