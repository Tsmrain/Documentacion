import { useState } from "react";

interface VideoAnalyzerProps {
  onAnalysisComplete: (result: any) => void;
  usuarioId: string;
}

const extractFramesFromVideo = async (videoBlob: Blob, numFrames: number = 9): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("No 2D context");
      const duration = video.duration || 1;
      const frames: string[] = [];
      let processed = 0;
      video.onseeked = () => {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
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
      let frames: string[] = [];
      if (file) {
        try {
          frames = await extractFramesFromVideo(file, 9);
        } catch (frameErr) {
          console.warn("[VideoAnalyzer] No se pudieron extraer frames del video HTML5:", frameErr);
        }
      }

      const response = await fetch("/api/sesion/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoBlob: file ? file.name : "video-sparring.mp4",
          fileName: file ? file.name : "video-sparring.mp4",
          frames,
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
