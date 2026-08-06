import { useState, useEffect } from "react";
import { DojoDashboard } from "./components/DojoDashboard";
import { VideoAnalyzer } from "./components/VideoAnalyzer";
import { AnalysisReportView } from "./components/AnalysisReportView";
import { RagIngestionPanel } from "./components/RagIngestionPanel";
import { ProgresoView } from "./components/ProgresoView";
import { HistoryView } from "./components/HistoryView";
import { PerfilView } from "./components/PerfilView";

function App() {
  const [report, setReport] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"analizador" | "progreso" | "historial" | "perfil" | "rag">("analizador");
  const [usuarioId, setUsuarioId] = useState<string>(() => {
    return localStorage.getItem("openbjj_user_id") || "user-default";
  });
  const [userProfile, setUserProfile] = useState<{ nombre: string; cinturon: string; maestria: string; altura?: number; peso?: number }>({
    nombre: "Santiago",
    cinturon: "AZUL",
    maestria: "Intermedio",
    altura: 178,
    peso: 76
  });

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
      console.warn("Error al cargar perfil del usuario:", e);
    }
  };

  const handleAnalysisComplete = (result: any) => {
    setReport(result);
    setActiveTab("analizador");
  };

  const handleSelectReportFromHistory = (selectedReport: any) => {
    setReport(selectedReport);
    setActiveTab("analizador");
  };

  const handleClearReport = () => {
    setReport(null);
  };

  const handleProfileUpdated = (updated: any) => {
    setUserProfile(updated);
    if (updated.usuarioId) {
      setUsuarioId(updated.usuarioId);
    }
  };

  return (
    <div className="container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            OpenBJJ
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Tutor Biomecánico Adaptativo y Grounding RAG Vivo para Jiu-Jitsu
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem', background: activeTab === "rag" ? '#6366f1' : undefined }} onClick={() => setActiveTab(activeTab === "rag" ? "analizador" : "rag")}>
            {activeTab === "rag" ? "Volver al Analizador" : "Agregar Fuente"}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
        <button type="button" style={{ padding: '10px 20px', background: activeTab === "analizador" ? '#6366f1' : 'rgba(255,255,255,0.02)', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setActiveTab("analizador")}>
          Analizar Video
        </button>
        <button type="button" style={{ padding: '10px 20px', background: activeTab === "progreso" ? '#6366f1' : 'rgba(255,255,255,0.02)', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setActiveTab("progreso")}>
          Ver Mi Progreso (CU03)
        </button>
        <button type="button" style={{ padding: '10px 20px', background: activeTab === "historial" ? '#6366f1' : 'rgba(255,255,255,0.02)', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setActiveTab("historial")}>
          Historial (CU05)
        </button>
        <button type="button" style={{ padding: '10px 20px', background: activeTab === "perfil" ? '#6366f1' : 'rgba(255,255,255,0.02)', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setActiveTab("perfil")}>
          Mi Perfil (CU04)
        </button>
      </div>

      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(240px, 280px) 1fr', gap: '32px' }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <DojoDashboard usuarioId={usuarioId} userProfile={userProfile} />
        </section>

        <section>
          {activeTab === "rag" ? (
            <RagIngestionPanel onClose={() => setActiveTab("analizador")} usuarioId={usuarioId} />
          ) : activeTab === "progreso" ? (
            <ProgresoView usuarioId={usuarioId} />
          ) : activeTab === "historial" ? (
            <HistoryView usuarioId={usuarioId} onSelectReport={handleSelectReportFromHistory} />
          ) : activeTab === "perfil" ? (
            <PerfilView usuarioId={usuarioId} userProfile={userProfile} onProfileUpdated={handleProfileUpdated} />
          ) : report ? (
            <AnalysisReportView report={report} onClear={handleClearReport} />
          ) : (
            <VideoAnalyzer onAnalysisComplete={handleAnalysisComplete} usuarioId={usuarioId} />
          )}
        </section>
      </main>

      <footer style={{ textAlign: 'center', padding: '32px 0', color: '#475569', fontSize: '0.8rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', marginTop: '48px' }}>
        OpenBJJ - Proyecto Final Académico. Operando bajo el Nivel Gratuito de Google AI Studio.
      </footer>
    </div>
  );
}

export default App;
