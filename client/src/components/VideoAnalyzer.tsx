import { useEffect, useState } from "react";

interface VideoAnalyzerProps {
  usuarioId: string;
  isAnalyzing: boolean;
  analysisProgress: string;
  analysisError: string | null;
  selectedFile: File | null;
  onFileSelected: (file: File | null) => void;
  onStartAnalysis: (file: File, tecnicaObjetivo?: string, rolPracticante?: "ATACANTE" | "DEFENSOR") => void;
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tecnicaObjetivo, setTecnicaObjetivo] = useState<string>("");
  const [rolPracticante, setRolPracticante] = useState<"ATACANTE" | "DEFENSOR">("ATACANTE");

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
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
    onStartAnalysis(selectedFile, tecnicaObjetivo.trim() || undefined, rolPracticante);
  };

  return (
    <div className="glass-panel p-6 animate-fade-in mb-6" style={{ padding: "24px" }}>
      <h2 style={{ marginTop: 0, color: "#818cf8" }}>Analizar Mi Video de Lucha o Técnica</h2>
      <p style={{ color: "#94a3b8", marginBottom: "20px" }}>
        Sube o graba un video corto de tu lucha o práctica técnica. La inteligencia artificial analizará tu postura y te dará consejos biomecánicos precisos.
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
            Analizando tus movimientos de Jiu-Jitsu...
          </p>
          {analysisProgress && (
            <p style={{ fontSize: "0.8rem", color: "#64748b" }}>{analysisProgress}</p>
          )}
          <p style={{ fontSize: "0.78rem", color: "#475569", marginTop: "12px" }}>
            Puedes navegar a otras pestañas mientras el análisis termina en segundo plano.
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
              <span style={{ color: "#64748b" }}>Toca aquí para seleccionar o subir tu video</span>
            )}
          </div>

          {/* Campo Opcional de Técnica Objetivo */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
              Técnica o Posición que estás practicando (Opcional):
            </label>
            <input
              type="text"
              list="sugerencias-tecnicas"
              value={tecnicaObjetivo}
              onChange={(e) => setTecnicaObjetivo(e.target.value)}
              placeholder="Ej: Llave de Brazo Voladora, Kimura, Pasaje Knee Cut... (En blanco para auto-detección)"
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(18, 18, 20, 0.8)",
                border: "1px solid rgba(220, 38, 38, 0.25)",
                borderRadius: "8px",
                color: "#f8fafc",
                fontSize: "0.85rem",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
            <datalist id="sugerencias-tecnicas">
              <option value="Llave de Brazo Voladora" />
              <option value="Armbar / Llave de Brazo" />
              <option value="Triángulo Volador" />
              <option value="Triángulo" />
              <option value="Kimura" />
              <option value="Guillotina" />
              <option value="Guardia Cerrada" />
              <option value="Media Guardia" />
              <option value="Pasaje de Guardia Knee Cut" />
              <option value="Control Lateral" />
              <option value="Montada" />
              <option value="Control de Espalda" />
              <option value="Raspado de Gancho" />
              <option value="Derribo Double Leg" />
              <option value="Omoplata" />
            </datalist>
            <span style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: "4px", display: "block" }}>
              Si especificas la técnica, la IA auditará los ángulos y detalles biomecánicos de esa lección exacta.
            </span>

            {/* Selector de Rol en el Combate */}
            <div style={{ marginTop: "14px", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1", display: "block", marginBottom: "8px" }}>
                ¿Cuál era tu rol en este video?
              </span>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "#e2e8f0", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="rolPracticante"
                    checked={rolPracticante === "ATACANTE"}
                    onChange={() => setRolPracticante("ATACANTE")}
                  />
                  🥋 Estaba Atacando (Tori)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "#e2e8f0", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="rolPracticante"
                    checked={rolPracticante === "DEFENSOR"}
                    onChange={() => setRolPracticante("DEFENSOR")}
                  />
                  🛡️ Estaba Defendiendo (Uke)
                </label>
              </div>
            </div>
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
                  Vista previa de tu video
                </span>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", width: "100%" }}>
            <button
              className="btn-secondary"
              style={{ flex: 1, padding: "14px", fontSize: "1rem", opacity: selectedFile ? 1 : 0.5, border: "1px solid rgba(255,255,255,0.1)" }}
              onClick={() => {
                onFileSelected(null);
                setTecnicaObjetivo("");
              }}
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

