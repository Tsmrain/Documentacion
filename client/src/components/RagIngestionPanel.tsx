import { useEffect, useState } from "react";

interface RagIngestionPanelProps {
  onClose: () => void;
  usuarioId?: string;
}

export function RagIngestionPanel({ onClose, usuarioId = "user-default" }: RagIngestionPanelProps) {
  const [tab, setTab] = useState<"file" | "youtube">("file");
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "warning" | "error" | "rejection", text: string } | null>(null);
  const [fuentes, setFuentes] = useState<any[]>([]);

  useEffect(() => {
    fetchFuentes();
  }, [usuarioId]);

  const fetchFuentes = async () => {
    try {
      const token = localStorage.getItem("openbjj_jwt");
      const res = await fetch(`/api/rag/fuentes?usuarioId=${usuarioId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setFuentes(json);
      }
    } catch (e) {
      console.warn("Error al obtener fuentes:", e);
    }
  };

  const handleFileChange = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDeleteFuente = async (id: string) => {
    try {
      const token = localStorage.getItem("openbjj_jwt");
      const res = await fetch(`/api/rag/fuentes/${id}?usuarioId=${usuarioId}`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setStatusMessage({ type: "success", text: "Fuente eliminada del sistema." });
        fetchFuentes();
      }
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e.message });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);

    try {
      let response;
      const token = localStorage.getItem("openbjj_jwt");
      
      if (tab === "file") {
        if (!selectedFile) {
          throw new Error("Por favor selecciona un archivo PDF o TXT.");
        }
        
        response = await fetch(`/api/rag/ingestar?usuarioId=${usuarioId}`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` 
          },
          body: JSON.stringify({
            archivoBlob: "dummy",
            usuarioId,
            metadata: { titulo: selectedFile.name, usuarioId }
          })
        });
      } else {
        if (!url) {
          throw new Error("Por favor ingresa una URL de YouTube.");
        }
        response = await fetch(`/api/rag/ingestar?usuarioId=${usuarioId}`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            archivoBlob: "dummy",
            url,
            usuarioId,
            metadata: { titulo: url, url, usuarioId }
          })
        });
      }

      const data = await response.json();

      if (response.status === 400 || response.status === 422) {
        const razonModeracion = data.razon || data.error || "El contenido no contiene referencias validas a Jiu-Jitsu o artes de agarre.";
        setStatusMessage({
          type: "rejection",
          text: `Rechazado por Moderacion Autonoma (RD-03): ${razonModeracion}`
        });
        return;
      }

      if (response.status === 207 || data.degraded) {
        setStatusMessage({
          type: "warning",
          text: "Advertencia de Infraestructura: La fuente fue aceptada y guardada en la base de datos relacional (PostgreSQL), pero no pudo ser vectorizada (ChromaDB fuera de linea). El sistema operara con el conocimiento nativo de la IA hasta que el Vector Store se restaure."
        });
        setUrl("");
        setSelectedFile(null);
        await fetchFuentes();
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Error al agregar la fuente.");
      }

      setStatusMessage({ type: "success", text: "Fuente agregada y vectorizada con exito. Disponible en el Vector Store RAG." });
      setUrl("");
      setSelectedFile(null);
      await fetchFuentes();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-6 animate-fade-in mb-6" style={{ padding: '24px', position: 'relative' }}>
      <button style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold' }} onClick={onClose}>
        X
      </button>
      <h2 style={{ marginTop: 0, color: '#38bdf8' }}>Agregar Fuente de Conocimiento RAG</h2>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
        Añade manuales de Jiu-Jitsu o enlaces para personalizar el diagnóstico de la IA. Si no agregas contenido, el sistema operará bajo el modo fallback nativo.
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
        <button type="button" className={`btn-secondary ${tab === "file" ? "active" : ""}`} style={{ flex: 1, padding: '8px 12px', background: tab === "file" ? 'rgba(99, 102, 241, 0.2)' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }} onClick={() => setTab("file")}>
          Archivo Local (PDF/TXT)
        </button>
        <button type="button" className={`btn-secondary ${tab === "youtube" ? "active" : ""}`} style={{ flex: 1, padding: '8px 12px', background: tab === "youtube" ? 'rgba(99, 102, 241, 0.2)' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }} onClick={() => setTab("youtube")}>
          Enlace de YouTube
        </button>
      </div>

      {statusMessage && (
        <div style={{
          padding: statusMessage.type === "rejection" ? '14px 16px' : '12px',
          background:
            statusMessage.type === "success" ? 'rgba(16,185,129,0.1)' :
            statusMessage.type === "warning" ? 'rgba(245,158,11,0.08)' :
            statusMessage.type === "rejection" ? 'rgba(239,68,68,0.12)' :
            'rgba(239,68,68,0.1)',
          color:
            statusMessage.type === "success" ? '#34d399' :
            statusMessage.type === "warning" ? '#fbbf24' :
            '#f87171',
          border: `1px solid ${
            statusMessage.type === "success" ? 'rgba(16,185,129,0.2)' :
            statusMessage.type === "warning" ? 'rgba(245,158,11,0.3)' :
            'rgba(239,68,68,0.35)'
          }`,
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '0.85rem',
          borderLeft: statusMessage.type === "rejection" ? '4px solid #ef4444' : undefined
        }}>
          {statusMessage.type === "rejection" && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '4px', color: '#fca5a5' }}>
              Moderacion Autonoma RD-03
            </span>
          )}
          {statusMessage.type === "warning" && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '4px', color: '#fde68a' }}>
              ChromaDB Offline - Modo Degradado
            </span>
          )}
          {statusMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {tab === "file" ? (
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#cbd5e1' }}>Seleccionar Archivo (PDF, TXT) *</label>
            <div style={{ border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }} onClick={() => document.getElementById('file-input-rag')?.click()}>
              <input type="file" id="file-input-rag" accept=".pdf,.txt" style={{ display: 'none' }} onChange={handleFileChange} />
              {selectedFile ? (
                <span style={{ fontWeight: 600, color: '#38bdf8' }}>{selectedFile.name}</span>
              ) : (
                <span style={{ color: '#64748b' }}>Haz click para seleccionar un archivo .pdf o .txt</span>
              )}
            </div>
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#cbd5e1' }}>URL del Video de YouTube *</label>
            <input type="url" className="input-field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Ej. https://youtube.com/watch?v=..." required />
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? "Procesando..." : "Agregar Fuente"}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>

      {/* Lista de Fuentes Activas con Borrado en 1 Clic */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
        <h3 style={{ fontSize: '1rem', color: '#f1f5f9', marginTop: 0, marginBottom: '12px' }}>Fuentes Agregadas</h3>
        {fuentes.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>No has agregado fuentes personalizadas aún.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {fuentes.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px' }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                  {item.tipo === "youtube" && item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8', textDecoration: 'none', display: 'block' }}>
                      {item.titulo}
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', display: 'block' }}>{item.titulo}</span>
                  )}
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.tipo === "youtube" ? "Enlace de YouTube" : "Documento Local"}</span>
                </div>
                <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => handleDeleteFuente(item.id)}>
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
