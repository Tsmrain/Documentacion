import { useState } from "react";

interface VideoAnalyzerProps {
  onAnalysisComplete: (result: any) => void;
  usuarioId: string;
}

export function VideoAnalyzer({ onAnalysisComplete, usuarioId }: VideoAnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const startAnalysis = async () => {
    if (!file) {
      setErrorMessage("Por favor selecciona un archivo de video primero.");
      return;
    }

    setAnalyzing(true);
    setErrorMessage(null);
    await sendVideoToAPI();
  };

  const sendVideoToAPI = async () => {
    try {
      const response = await fetch("/api/sesion/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoBlob: "dummy-video-data-uri",
          usuarioId
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ocurrio un error en la evaluacion.");
      }

      onAnalysisComplete(data);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="glass-panel p-6 animate-fade-in mb-6" style={{ padding: '24px' }}>
      <h2 style={{ marginTop: 0, color: '#818cf8' }}>Analizador cinematico de combate / Sparring</h2>
      <p style={{ color: '#94a3b8' }}>
        Sube un video de tu lucha o drill tecnico para obtener retroalimentacion cinematica instantanea basada en literatura RAG.
      </p>

      {errorMessage && (
        <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', marginBottom: '16px' }}>
          <strong>Error: </strong>{errorMessage}
        </div>
      )}

      {analyzing ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', width: '36px', height: '36px', borderRadius: '50%', borderLeftColor: '#6366f1', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontWeight: 500, color: '#e2e8f0' }}>Extraendo landmarks 3D y ejecutando inferencia cinemática...</p>
        </div>
      ) : (
        <div>
          <div style={{ border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '8px', padding: '32px', textAlign: 'center', cursor: 'pointer', marginBottom: '16px', background: 'rgba(255,255,255,0.02)' }} onClick={() => document.getElementById('video-upload')?.click()}>
            <input type="file" id="video-upload" accept="video/*" style={{ display: 'none' }} onChange={handleFileChange} />
            {file ? (
              <span style={{ fontWeight: 600, color: '#38bdf8' }}>{file.name}</span>
            ) : (
              <span style={{ color: '#64748b' }}>Haz click o arrastra tu video de sparring aqui</span>
            )}
          </div>
          <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem' }} onClick={startAnalysis}>
            Iniciar Analisis
          </button>
        </div>
      )}
    </div>
  );
}
