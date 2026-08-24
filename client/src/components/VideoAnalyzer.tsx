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
              {/* 1. Supervivencia y Control Postural */}
              <option value="Supervivencia en la Espalda (The Back Survival)" />
              <option value="Supervivencia en Cuatro Puntos / Tortuga (All-Fours Survival)" />
              <option value="Supervivencia en Montada (The Mount Survival)" />
              <option value="Supervivencia en Control Lateral (Side Control Survival)" />
              <option value="Supervivencia en Kesa Gatame" />
              <option value="Supervivencia en Kesa Gatame Inverso" />
              <option value="Supervivencia en Rodilla al Pecho (Knee-on-Belly Survival)" />
              <option value="Postura de Supervivencia en Carrera (Running Survival Posture)" />

              {/* 2. Escapes y Recuperación */}
              <option value="Escape de Espalda (Back Escape)" />
              <option value="Escape de Candado de Cuerpo (Body Lock Escape)" />
              <option value="Escape de Montada por Codo-Rodilla / Upa (Mount Elbow Escape)" />
              <option value="Escape de Montada Sentada (Seated Mount Escape)" />
              <option value="Escape de Control Lateral a Guardia (Side Control Guard Recovery)" />
              <option value="Escape de Control Lateral a las Rodillas / Tortuga" />
              <option value="Escape en Carrera de Control Lateral (Side Control Running Escape)" />
              <option value="Escape de Kesa Gatame" />
              <option value="Escape de Kesa Gatame Inverso" />
              <option value="Escape de Rodilla al Pecho (Knee-on-Belly Running Escape)" />
              <option value="Escape de Armbar / Llave de Brazo (Armbar Escape)" />
              <option value="Escape de Triángulo a Pasaje (Triangle Escape to Pass)" />
              <option value="Escape de Guillotina Clásica (Classic Guillotine Escape)" />
              <option value="Escape de Guillotina con Brazo (Arm-In Guillotine Escape)" />
              <option value="Escape de Llave de Pie (Footlock Escape)" />
              <option value="Escape de Kimura desde Media Guardia" />

              {/* 3. Defensas de Pasajes */}
              <option value="Defensa contra Pasaje Single / Double Underhook" />
              <option value="Defensa contra Pasaje Over-Under Smash" />
              <option value="Defensa contra Pasaje Torreando (Collar Drag / Ankle Pick)" />
              <option value="Defensa contra Pasaje Knee Slide / Knee Cut" />

              {/* 4. Guardias y Raspados */}
              <option value="Guardia Cerrada (Closed Guard)" />
              <option value="Raspado de Empuje de Cadera (Hip Bump Sweep)" />
              <option value="Raspado Flower Sweep / Péndulo" />
              <option value="Raspado de Gancho (Underhook Sweep)" />
              <option value="Guardia Mariposa (Butterfly Guard)" />
              <option value="Raspado de Mariposa Clásico (Butterfly Sweep)" />
              <option value="Raspado Wing Sweep" />
              <option value="Guardia Araña (Spider Guard)" />
              <option value="Raspado de Guardia Araña (Spider Guard Sweep)" />
              <option value="Guardia de Agarre Cruzado (Cross-Grip Guard)" />
              <option value="Raspado Trípode Clásico (Tripod Sweep)" />
              <option value="Raspado Backroll de Agarre Cruzado" />
              <option value="Guardia De La Riva (De La Riva Guard)" />
              <option value="Raspado De La Riva Rollover Sweep" />
              <option value="Raspado De La Riva a Tomoe Nage" />
              <option value="Guardia Sentada (Sit-Up Guard)" />
              <option value="Raspado de Guardia Sentada (Sit-Up Guard Sweep)" />
              <option value="Guardia De La Riva Inversa (Reverse De La Riva)" />
              <option value="Raspado Knee Push desde De La Riva Inversa" />
              <option value="Media Guardia (Half Guard)" />
              <option value="Media Guardia Profunda (Deep Half Guard)" />
              <option value="Guardia Invertida (Inverted Guard)" />
              <option value="Guardia X (X-Guard)" />
              <option value="Guardia Abierta General" />

              {/* 5. Pasajes de Guardia */}
              <option value="Pasaje de Guardia Cerrada desde Rodillas (Classic Kneeling Pass)" />
              <option value="Pasaje Single Underhook Pass" />
              <option value="Pasaje Double Underhook Pass" />
              <option value="Pasaje de Guardia Cerrada de Pie (Standing Guard Opening & Pass)" />
              <option value="Pasaje de Guardia Knee Cut / Knee Cross" />
              <option value="Pasaje de Guardia Torreando (Bullfighter Pass)" />
              <option value="Pasaje Leg Rope / Two-on-One Leg Pass" />
              <option value="Pasaje de Guardia Mariposa Walk-Around" />
              <option value="Pasaje de Guardia Mariposa Floating Hip-Switch" />
              <option value="Pasaje Star Pass de Mariposa" />
              <option value="Pasaje X-Pass de Mariposa" />
              <option value="Pasaje de Guardia Araña (Spider Guard Break & Pass)" />
              <option value="Pasaje Leg Lasso de Guardia Araña" />
              <option value="Pasaje de Guardia De La Riva (Unlock & Pass)" />
              <option value="Pasaje de Deep De La Riva" />
              <option value="Pasaje de Guardia Sentada (Step-Around / Underhook to Mount)" />
              <option value="Pasaje de De La Riva Inversa (Hip Smash / Floating Pass)" />
              <option value="Pasaje de Media Guardia (Flattening / Shin Slide Pass)" />
              <option value="Pasaje de Media Guardia Esgrima Pass" />
              <option value="Pasaje de Media Guardia Half Mount Pass" />
              <option value="Pasaje de Media Guardia Profunda (Deep Half Leg Pullout)" />
              <option value="Pasaje de Guardia Invertida (Inverted Guard Hip Pass)" />
              <option value="Pasaje de Guardia X (X-Guard Break & Pass)" />

              {/* 6. Sumisiones y Finalizaciones */}
              <option value="Estrangulamiento Arco y Flecha (Bow & Arrow Choke)" />
              <option value="Armbar / Llave de Brazo" />
              <option value="Estrangulamiento de Solapa Cruzada (Cross Choke)" />
              <option value="Estrangulamiento Ezequiel (Ezequiel Choke)" />
              <option value="Americana (Keylock de Brazo)" />
              <option value="Armbar desde la Montada (Mounted Armbar)" />
              <option value="Armbar desde S-Mount" />
              <option value="Kata Gatame / Triángulo de Brazo (Arm Triangle)" />
              <option value="Triángulo (Triangle Choke)" />
              <option value="Kimura" />
              <option value="Omoplata" />
              <option value="Guillotina (Guillotine Choke)" />
              <option value="Armbar Giratorio (Spinning Armbar)" />
              <option value="Estrangulamiento Paper Cutter / Bread Cutter Choke" />
              <option value="Estrangulamiento de Bate de Béisbol (Baseball Choke)" />
              <option value="Estrangulamiento de Reloj (Clock Choke)" />
              <option value="Estrangulamiento Brabo / Darce Choke" />
              <option value="Palanca Recta de Brazo (Straight Armlock)" />
              <option value="Llave Recta de Tobillo (Straight Ankle Lock)" />
              <option value="Control Lateral" />
              <option value="Montada" />
              <option value="Control de Espalda" />

              {/* 7. Derribos y Entradas Voladoras */}
              <option value="Derribo Double Leg (Lucha Libre)" />
              <option value="Derribo Single Leg (Lucha Libre)" />
              <option value="Derribo de Sacrificio Tomoe Nage" />
              <option value="Llave de Brazo Voladora / Flying Armbar" />
              <option value="Triángulo Volador / Flying Triangle" />
              <option value="Entrada Voladora a Llave de Pierna / Flying Leg Lock" />
              <option value="Tijera Voladora / Kani Basami" />
              <option value="Flying Submissions (Sumisiones Voladoras Generales)" />
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

