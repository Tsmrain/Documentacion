import { useEffect, useState } from "react";

interface VideoAnalyzerProps {
  usuarioId: string;
  isAnalyzing: boolean;
  analysisProgress: string;
  analysisError: string | null;
  selectedFile: File | null;
  onFileSelected: (file: File | null) => void;
  onStartAnalysis: (file: File) => void;
}

export function VideoAnalyzer({
  isAnalyzing,
  analysisProgress,
  analysisError,
  selectedFile,
  onFileSelected,
  onStartAnalysis
}: VideoAnalyzerProps) {
  // URL de objeto local para previsualizacion de video en el navegador.
  // Se genera en cuanto el usuario selecciona un archivo y se revoca al desmontarse.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      // Libera la URL de objeto cuando el archivo cambia o el componente se desmonta
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  const handleStartClick = () => {
    if (!selectedFile) return;
    onStartAnalysis(selectedFile);
  };

  return (
    <div className="glass-panel p-6 animate-fade-in mb-6" style={{ padding: "24px" }}>
      <h2 style={{ marginTop: 0, color: "#818cf8" }}>Analizador Cinematico de Combate / Sparring</h2>
      <p style={{ color: "#94a3b8", marginBottom: "20px" }}>
        Sube un video de tu sparring o drill tecnico para obtener retroalimentacion cinematica basada en literatura RAG (Two-Phase Inference).
      </p>

      {analysisError && (
        <div style={{ padding: "12px", background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", marginBottom: "16px" }}>
          <strong>Error: </strong>{analysisError}
        </div>
      )}

      {isAnalyzing ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div
            style={{
              border: "4px solid rgba(255,255,255,0.1)",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              borderLeftColor: "#6366f1",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px"
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontWeight: 500, color: "#e2e8f0", marginBottom: "8px" }}>
            Ejecutando pipeline Two-Phase RAG...
          </p>
          {analysisProgress && (
            <p style={{ fontSize: "0.8rem", color: "#64748b" }}>{analysisProgress}</p>
          )}
          <p style={{ fontSize: "0.78rem", color: "#475569", marginTop: "12px" }}>
            Puedes navegar a otras pestanas mientras el analisis continua en segundo plano.
          </p>
        </div>
      ) : (
        <div>
          {/* Zona de carga de archivo */}
          <div
            style={{
              border: "2px dashed rgba(255,255,255,0.15)",
              borderRadius: "8px",
              padding: "28px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: "16px",
              background: "rgba(255,255,255,0.02)",
              transition: "border-color 0.2s"
            }}
            onClick={() => document.getElementById("video-upload")?.click()}
          >
            <input
              type="file"
              id="video-upload"
              accept="video/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            {selectedFile ? (
              <span style={{ fontWeight: 600, color: "#38bdf8" }}>{selectedFile.name}</span>
            ) : (
              <span style={{ color: "#64748b" }}>Haz click o arrastra tu video de sparring aqui</span>
            )}
          </div>

          {/* Previsualizacion de video local con reproductor HTML5 nativo */}
          {previewUrl && (
            <div style={{ marginBottom: "16px", borderRadius: "8px", overflow: "hidden", background: "#000", border: "1px solid rgba(255,255,255,0.06)" }}>
              <video
                src={previewUrl}
                controls
                muted
                playsInline
                style={{ width: "100%", maxHeight: "260px", display: "block", objectFit: "contain" }}
              />
              <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Vista previa del sparring cargado
                </span>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", width: "100%" }}>
            <button
              className="btn-secondary"
              style={{ flex: 1, padding: "14px", fontSize: "1rem", opacity: selectedFile ? 1 : 0.5, border: "1px solid rgba(255,255,255,0.1)" }}
              onClick={() => onFileSelected(null)}
              disabled={!selectedFile}
            >
              Cambiar Video
            </button>
            <button
              className="btn-primary"
              style={{ flex: 2, padding: "14px", fontSize: "1rem", opacity: selectedFile ? 1 : 0.5 }}
              onClick={handleStartClick}
              disabled={!selectedFile}
            >
              Iniciar Analisis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

