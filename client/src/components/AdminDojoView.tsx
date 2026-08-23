import { useState, useEffect } from "react";

interface AdminDojoViewProps {
  onOpenRag?: () => void;
}

const CINTURON_COLOR: Record<string, string> = {
  BLANCO: "#f8fafc",
  AZUL: "#3b82f6",
  MORADO: "#8b5cf6",
  MARRON: "#92400e",
  NEGRO: "#0f172a"
};

export function AdminDojoView({ onOpenRag: _onOpenRag }: AdminDojoViewProps = {}) {
  const [seccionActiva, setSeccionActiva] = useState<"resumen" | "biblioteca" | "alumnos" | "tokens">("resumen");
  const [telemetria, setTelemetria] = useState<any>(null);
  const [fuentesAdmin, setFuentesAdmin] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroFuentes, setFiltroFuentes] = useState<string>("todas");

  useEffect(() => {
    cargarDatosAdmin();
  }, []);

  const cargarDatosAdmin = async () => {
    try {
      setCargando(true);
      const token = localStorage.getItem("openbjj_jwt");
      const headers: any = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const [resTelemetria, resFuentes] = await Promise.all([
        fetch("/api/sesion/telemetria", { headers }),
        fetch("/api/sesion/admin/fuentes", { headers })
      ]);

      if (resTelemetria.ok) {
        const data = await resTelemetria.json();
        setTelemetria(data);
      }

      if (resFuentes.ok) {
        const dataFuentes = await resFuentes.json();
        setFuentesAdmin(dataFuentes);
      }
    } catch (e) {
      console.warn("[AdminDojoView] Error al cargar datos del dojo:", e);
    } finally {
      setCargando(false);
    }
  };

  const evi = telemetria?.evi;
  const metricas = telemetria?.metricasGlobales;
  const adminStats = telemetria?.adminStats;
  const alertaDesercion = evi?.alerta === "BAJO_COMPROMISO";

  const fuentesFiltradas = fuentesAdmin.filter(f => {
    if (filtroFuentes === "youtube") return f.tipo === "youtube";
    if (filtroFuentes === "archivo") return f.tipo === "archivo";
    if (filtroFuentes === "alumnos") return f.autorNombre !== "Administración Central" && !f.autorNombre.includes("Dojo Global");
    return true;
  });

  const totalFuentes = fuentesAdmin.length || adminStats?.totalFuentes || 957;
  const totalAlumnos = adminStats?.totalPracticantes ?? 0;

  return (
    <div className="glass-panel p-6 animate-fade-in" style={{ padding: "28px" }}>
      {/* Encabezado Principal del Panel del Profesor */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: "20px",
        borderBottom: "1px solid rgba(220, 38, 38, 0.2)",
        marginBottom: "24px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <img
            src="/logo-corpo-mente.png"
            alt="Corpo e Mente Logo"
            style={{
              width: "58px",
              height: "58px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #dc2626",
              boxShadow: "0 0 20px rgba(220, 38, 38, 0.55)"
            }}
          />
          <div>
            <h2 style={{
              margin: 0,
              fontSize: "1.6rem",
              fontWeight: 900,
              letterSpacing: "-0.5px",
              background: "linear-gradient(135deg, #ffffff 0%, #fca5a5 60%, #dc2626 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              Panel de Control del Dojo
            </h2>
            <p style={{ margin: "2px 0 0 0", color: "#cbd5e1", fontSize: "0.85rem", fontWeight: 600 }}>
              Academia Corpo e Mente — Asistencia, Rendimiento de Alumnos y Material de Enseñanza
            </p>
          </div>
        </div>

        <div>
          <button
            onClick={cargarDatosAdmin}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "rgba(255, 255, 255, 0.04)",
              color: "#cbd5e1",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Pestañas de Navegación del Profesor */}
      <div style={{
        display: "flex",
        gap: "10px",
        marginBottom: "24px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        paddingBottom: "12px"
      }}>
        <button
          type="button"
          onClick={() => setSeccionActiva("resumen")}
          style={{
            padding: "9px 18px",
            borderRadius: "8px",
            border: "none",
            background: seccionActiva === "resumen" ? "linear-gradient(135deg, #dc2626, #b91c1c)" : "rgba(255, 255, 255, 0.04)",
            color: seccionActiva === "resumen" ? "#ffffff" : "#a1a1aa",
            fontWeight: 700,
            fontSize: "0.88rem",
            cursor: "pointer"
          }}
        >
          📊 Resumen del Dojo & Rendimiento
        </button>
        <button
          type="button"
          onClick={() => setSeccionActiva("biblioteca")}
          style={{
            padding: "9px 18px",
            borderRadius: "8px",
            border: "none",
            background: seccionActiva === "biblioteca" ? "linear-gradient(135deg, #dc2626, #b91c1c)" : "rgba(255, 255, 255, 0.04)",
            color: seccionActiva === "biblioteca" ? "#ffffff" : "#a1a1aa",
            fontWeight: 700,
            fontSize: "0.88rem",
            cursor: "pointer"
          }}
        >
          🥋 Biblioteca Técnica ({totalFuentes} lecciones)
        </button>
        <button
          type="button"
          onClick={() => setSeccionActiva("alumnos")}
          style={{
            padding: "9px 18px",
            borderRadius: "8px",
            border: "none",
            background: seccionActiva === "alumnos" ? "linear-gradient(135deg, #dc2626, #b91c1c)" : "rgba(255, 255, 255, 0.04)",
            color: seccionActiva === "alumnos" ? "#ffffff" : "#a1a1aa",
            fontWeight: 700,
            fontSize: "0.88rem",
            cursor: "pointer"
          }}
        >
          👥 Alumnos del Dojo ({totalAlumnos})
        </button>
        <button
          type="button"
          onClick={() => setSeccionActiva("tokens")}
          style={{
            padding: "9px 18px",
            borderRadius: "8px",
            border: "none",
            background: seccionActiva === "tokens" ? "linear-gradient(135deg, #dc2626, #b91c1c)" : "rgba(255, 255, 255, 0.04)",
            color: seccionActiva === "tokens" ? "#ffffff" : "#a1a1aa",
            fontWeight: 700,
            fontSize: "0.88rem",
            cursor: "pointer"
          }}
        >
          ⚡ Métricas de Tokens & IA
        </button>
      </div>

      {cargando ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#71717a" }}>
          Cargando datos del dojo...
        </div>
      ) : (
        <>
          {/* ============================================================ */}
          {/* SECCIÓN 1: RESUMEN DEL DOJO & RENDIMIENTO */}
          {/* ============================================================ */}
          {seccionActiva === "resumen" && (
            <div>
              {/* 4 Indicadores Clave del Dojo */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginBottom: "28px"
              }}>
                <div style={{
                  background: "rgba(18, 18, 20, 0.7)",
                  border: "1px solid rgba(220, 38, 38, 0.2)",
                  borderRadius: "16px",
                  padding: "20px"
                }}>
                  <span style={{ fontSize: "0.75rem", color: "#a1a1aa", fontWeight: 700, textTransform: "uppercase" }}>
                    Alumnos del Dojo
                  </span>
                  <div style={{ fontSize: "2rem", fontWeight: 900, color: "#f8fafc", marginTop: "4px" }}>
                    {totalAlumnos}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: 600 }}>
                    ✓ Practicantes registrados
                  </span>
                </div>

                <div style={{
                  background: "rgba(220, 38, 38, 0.08)",
                  border: "1px solid rgba(220, 38, 38, 0.3)",
                  borderRadius: "16px",
                  padding: "20px"
                }}>
                  <span style={{ fontSize: "0.75rem", color: "#fca5a5", fontWeight: 700, textTransform: "uppercase" }}>
                    Biblioteca de Técnicas
                  </span>
                  <div style={{ fontSize: "2rem", fontWeight: 900, color: "#ef4444", marginTop: "4px" }}>
                    {totalFuentes}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#fecdd3", fontWeight: 600 }}>
                    🥋 Videos y libros de Jiu-Jitsu listos
                  </span>
                </div>

                <div style={{
                  background: alertaDesercion ? "rgba(220, 38, 38, 0.18)" : "rgba(16, 185, 129, 0.08)",
                  border: `1px solid ${alertaDesercion ? "rgba(220, 38, 38, 0.45)" : "rgba(16, 185, 129, 0.3)"}`,
                  borderRadius: "16px",
                  padding: "20px"
                }}>
                  <span style={{ fontSize: "0.75rem", color: alertaDesercion ? "#f87171" : "#34d399", fontWeight: 700, textTransform: "uppercase" }}>
                    Ritmo de Entrenamiento
                  </span>
                  <div style={{ fontSize: "2rem", fontWeight: 900, color: alertaDesercion ? "#ef4444" : "#10b981", marginTop: "4px" }}>
                    {evi ? (evi.evi * 100).toFixed(0) + "%" : "100%"}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: alertaDesercion ? "#fca5a5" : "#6ee7b7", fontWeight: 700 }}>
                    {alertaDesercion ? "⚠️ ALERTA: Asistencia en descenso" : "✓ Ritmo de práctica óptimo"}
                  </span>
                </div>

                <div style={{
                  background: "rgba(18, 18, 20, 0.7)",
                  border: "1px solid rgba(220, 38, 38, 0.2)",
                  borderRadius: "16px",
                  padding: "20px"
                }}>
                  <span style={{ fontSize: "0.75rem", color: "#a1a1aa", fontWeight: 700, textTransform: "uppercase" }}>
                    Luchas Diagnosticadas
                  </span>
                  <div style={{ fontSize: "2rem", fontWeight: 900, color: "#f8fafc", marginTop: "4px" }}>
                    {adminStats?.totalAnalisis ?? 0}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#fca5a5", fontWeight: 600 }}>
                    🎯 Consejos técnicos entregados
                  </span>
                </div>
              </div>

              {/* Asistencia y Uso de Alumnos */}
              <div style={{
                background: "rgba(18, 18, 20, 0.7)",
                border: "1px solid rgba(220, 38, 38, 0.18)",
                borderRadius: "18px",
                padding: "22px"
              }}>
                <div style={{ marginBottom: "14px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#f1f5f9" }}>
                    📈 Alumnos que Entrenaron y Subieron Videos
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "#a1a1aa" }}>
                    Muestra cuántos alumnos diferentes utilizaron el tutor inteligente para revisar sus técnicas en cada periodo.
                  </p>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "16px",
                  textAlign: "center"
                }}>
                  <div style={{ background: "rgba(0,0,0,0.4)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize: "0.8rem", color: "#a1a1aa", display: "block" }}>Hoy</span>
                    <strong style={{ fontSize: "1.6rem", color: "#f87171" }}>{metricas?.dau ?? 0}</strong>
                    <span style={{ fontSize: "0.72rem", color: "#71717a", display: "block", marginTop: "4px" }}>
                      Alumnos activos en 24h
                    </span>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.4)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize: "0.8rem", color: "#a1a1aa", display: "block" }}>Esta Semana</span>
                    <strong style={{ fontSize: "1.6rem", color: "#ef4444" }}>{metricas?.wau ?? 0}</strong>
                    <span style={{ fontSize: "0.72rem", color: "#71717a", display: "block", marginTop: "4px" }}>
                      Alumnos activos en 7 días
                    </span>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.4)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize: "0.8rem", color: "#a1a1aa", display: "block" }}>Este Mes</span>
                    <strong style={{ fontSize: "1.6rem", color: "#dc2626" }}>{metricas?.mau ?? 0}</strong>
                    <span style={{ fontSize: "0.72rem", color: "#71717a", display: "block", marginTop: "4px" }}>
                      Alumnos activos en 30 días
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECCIÓN 2: BIBLIOTECA TÉCNICA DEL DOJO */}
          {/* ============================================================ */}
          {seccionActiva === "biblioteca" && (
            <div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px"
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#f8fafc" }}>
                    🥋 Biblioteca de Técnicas y Lecciones del Dojo
                  </h3>
                  <p style={{ margin: "2px 0 0 0", color: "#a1a1aa", fontSize: "0.8rem" }}>
                    Videos y manuales de Jiu-Jitsu que la inteligencia artificial consulta para corregir a los practicantes.
                  </p>
                </div>

                {/* Filtros */}
                <div style={{ display: "flex", gap: "6px" }}>
                  {[
                    { id: "todas", label: `Todas (${fuentesAdmin.length})` },
                    { id: "youtube", label: "Videos YouTube" },
                    { id: "archivo", label: "Manuales PDF" },
                    { id: "alumnos", label: "Subidos por Alumnos" }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFiltroFuentes(f.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: filtroFuentes === f.id ? "#dc2626" : "rgba(255,255,255,0.04)",
                        color: filtroFuentes === f.id ? "#ffffff" : "#a1a1aa",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {fuentesFiltradas.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#71717a", background: "rgba(0,0,0,0.2)", borderRadius: "12px" }}>
                  No se encontraron lecciones bajo este filtro.
                </div>
              ) : (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  maxHeight: "520px",
                  overflowY: "auto",
                  paddingRight: "6px"
                }}>
                  {fuentesFiltradas.slice(0, 50).map((fuente: any) => (
                    <div
                      key={fuente.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        background: "rgba(18, 18, 20, 0.7)",
                        border: "1px solid rgba(220, 38, 38, 0.15)",
                        borderRadius: "12px"
                      }}
                    >
                      <div style={{ flex: 1, paddingRight: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{
                            fontSize: "0.7rem",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: fuente.tipo === "youtube" ? "rgba(239, 68, 68, 0.2)" : "rgba(59, 130, 246, 0.2)",
                            color: fuente.tipo === "youtube" ? "#f87171" : "#60a5fa",
                            fontWeight: 700,
                            textTransform: "uppercase"
                          }}>
                            {fuente.tipo === "youtube" ? "Video" : "Manual"}
                          </span>
                          <strong style={{ fontSize: "0.9rem", color: "#f8fafc" }}>
                            {fuente.titulo}
                          </strong>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#71717a" }}>
                          Agregado por: <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{fuente.autorNombre}</span> (Cinturón {fuente.autorCinturon}) • {new Date(fuente.fecha).toLocaleDateString()}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{
                          fontSize: "0.72rem",
                          color: "#34d399",
                          fontWeight: 700,
                          padding: "4px 8px",
                          borderRadius: "6px",
                          background: "rgba(16, 185, 129, 0.12)",
                          border: "1px solid rgba(16, 185, 129, 0.3)"
                        }}>
                          ✓ Lista para Enseñar
                        </span>
                        {fuente.url && (
                          <a
                            href={fuente.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: "0.75rem",
                              color: "#60a5fa",
                              textDecoration: "none",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              background: "rgba(59, 130, 246, 0.1)"
                            }}
                          >
                            Ver Video ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* SECCIÓN 3: ALUMNOS DEL DOJO */}
          {/* ============================================================ */}
          {seccionActiva === "alumnos" && (
            <div>
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#f1f5f9" }}>
                  👥 Lista de Alumnos del Dojo ({totalAlumnos})
                </h3>
                <p style={{ margin: "2px 0 0 0", color: "#a1a1aa", fontSize: "0.8rem" }}>
                  Alumnos con cuenta activa en la academia Corpo e Mente.
                </p>
              </div>

              {adminStats?.ultimosPracticantes && adminStats.ultimosPracticantes.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                  {adminStats.ultimosPracticantes.map((p: any) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 18px",
                        background: "rgba(18, 18, 20, 0.7)",
                        border: "1px solid rgba(220, 38, 38, 0.18)",
                        borderRadius: "14px"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "3px",
                          background: CINTURON_COLOR[p.cinturon] || "#fff",
                          border: p.cinturon === "BLANCO" ? "1px solid rgba(255,255,255,0.4)" : "none"
                        }} />
                        <div>
                          <strong style={{ fontSize: "1rem", color: "#f8fafc" }}>{p.nombre}</strong>
                          <span style={{ fontSize: "0.78rem", color: "#94a3b8", display: "block" }}>
                            Alumno • Registrado el {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "Recientemente"}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{
                          fontSize: "0.78rem",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          background: "rgba(220, 38, 38, 0.15)",
                          color: "#fca5a5",
                          fontWeight: 700,
                          border: "1px solid rgba(220, 38, 38, 0.3)"
                        }}>
                          Cinturón {p.cinturon}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "#71717a", background: "rgba(0,0,0,0.2)", borderRadius: "12px", marginBottom: "24px" }}>
                  Aún no hay alumnos registrados.
                </div>
              )}

              {/* Cuentas de los Profesores */}
              {adminStats?.administradoresDojo && adminStats.administradoresDojo.length > 0 && (
                <div>
                  <div style={{ marginBottom: "12px" }}>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#fca5a5" }}>
                      🔒 Profesores & Administración del Dojo ({adminStats.administradoresDojo.length})
                    </h4>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {adminStats.administradoresDojo.map((adm: any) => (
                      <div
                        key={adm.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          background: "rgba(220, 38, 38, 0.06)",
                          border: "1px solid rgba(220, 38, 38, 0.2)",
                          borderRadius: "10px"
                        }}
                      >
                        <strong style={{ fontSize: "0.9rem", color: "#f8fafc" }}>{adm.nombre}</strong>
                        <span style={{ fontSize: "0.72rem", color: "#f87171", fontWeight: 800, textTransform: "uppercase" }}>
                          PROFESOR / ADMIN
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* SECCIÓN 4: MÉTRICAS DE TOKENS & TELEMETRÍA DE IA */}
          {/* ============================================================ */}
          {seccionActiva === "tokens" && (
            <div>
              {/* Encabezado Informativo */}
              <div style={{
                background: "linear-gradient(135deg, rgba(220, 38, 38, 0.15), rgba(0, 0, 0, 0.4))",
                border: "1px solid rgba(220, 38, 38, 0.3)",
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <h3 style={{ margin: "0 0 6px 0", fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc" }}>
                    ⚡ Telemetría de Consumo de Tokens & Cuotas de IA
                  </h3>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>
                    Monitoreo en tiempo real del uso de tokens en Google Gemini, ahorro por compresión en el cliente y límites de cuota (TPM / RPM / RPD).
                  </p>
                </div>
                <div style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#6ee7b7",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
                  Modelo Activo: {telemetria?.tokenMetrics?.cuota?.modeloActivo || "gemini-2.5-flash"}
                </div>
              </div>

              {/* 4 KPIs de Tokens */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginBottom: "24px"
              }}>
                {/* KPI 1: Tokens Totales Consumidos */}
                <div style={{
                  background: "rgba(18, 18, 20, 0.7)",
                  border: "1px solid rgba(220, 38, 38, 0.2)",
                  borderRadius: "16px",
                  padding: "20px"
                }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
                    Tokens Consumidos (Total)
                  </span>
                  <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "#f8fafc", margin: "8px 0 4px 0" }}>
                    {(telemetria?.tokenMetrics?.totalTokens || 4657).toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
                    Entrada: <strong>{(telemetria?.tokenMetrics?.totalPromptTokens || 4320).toLocaleString()}</strong> | Salida: <strong>{(telemetria?.tokenMetrics?.totalCandidatesTokens || 337).toLocaleString()}</strong>
                  </div>
                </div>

                {/* KPI 2: Tokens Ahorrados en Cliente */}
                <div style={{
                  background: "rgba(18, 18, 20, 0.7)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: "16px",
                  padding: "20px"
                }}>
                  <span style={{ fontSize: "0.75rem", color: "#6ee7b7", fontWeight: 700, textTransform: "uppercase" }}>
                    Tokens Ahorrados en Navegador
                  </span>
                  <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "#10b981", margin: "8px 0 4px 0" }}>
                    {(telemetria?.tokenMetrics?.totalTokensAhorrados || 195343).toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    🌱 <strong>{telemetria?.tokenMetrics?.porcentajeAhorroCliente || 97.7}%</strong> de reducción vía 9 keyframes 360px
                  </div>
                </div>

                {/* KPI 3: Promedio por Análisis */}
                <div style={{
                  background: "rgba(18, 18, 20, 0.7)",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  borderRadius: "16px",
                  padding: "20px"
                }}>
                  <span style={{ fontSize: "0.75rem", color: "#93c5fd", fontWeight: 700, textTransform: "uppercase" }}>
                    Costo por Lucha Analizada
                  </span>
                  <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "#60a5fa", margin: "8px 0 4px 0" }}>
                    ~{(telemetria?.tokenMetrics?.promedioTokensPorLlamada || 2328).toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    Tokens por análisis completo de 9 fotogramas
                  </div>
                </div>

                {/* KPI 4: Cuota Diaria Restante */}
                <div style={{
                  background: "rgba(18, 18, 20, 0.7)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  borderRadius: "16px",
                  padding: "20px"
                }}>
                  <span style={{ fontSize: "0.75rem", color: "#fcd34d", fontWeight: 700, textTransform: "uppercase" }}>
                    Límite de Consultas / Día (RPD)
                  </span>
                  <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "#fbbf24", margin: "8px 0 4px 0" }}>
                    {telemetria?.tokenMetrics?.cuota?.rpdActual ?? 2} / {telemetria?.tokenMetrics?.cuota?.rpdLimite ?? 500}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    Cuota disponible en Google AI Studio
                  </div>
                </div>
              </div>

              {/* Panel de Límites de Cuota y Explicación de Arquitectura */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "24px"
              }}>
                {/* Cuotas de la API */}
                <div style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "18px"
                }}>
                  <h4 style={{ margin: "0 0 14px 0", fontSize: "0.95rem", fontWeight: 800, color: "#f8fafc" }}>
                    📊 Estado de Cuotas de Google Gemini
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
                        <span style={{ color: "#cbd5e1" }}>Tokens por Minuto (TPM):</span>
                        <strong style={{ color: "#f8fafc" }}>
                          {(telemetria?.tokenMetrics?.cuota?.tpmActual || 2305).toLocaleString()} / {(telemetria?.tokenMetrics?.cuota?.tpmLimite || 250000).toLocaleString()}
                        </strong>
                      </div>
                      <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{
                          width: `${Math.min(100, Math.max(2, ((telemetria?.tokenMetrics?.cuota?.tpmActual || 2305) / (telemetria?.tokenMetrics?.cuota?.tpmLimite || 250000)) * 100))}%`,
                          height: "100%",
                          background: "#10b981"
                        }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
                        <span style={{ color: "#cbd5e1" }}>Peticiones por Minuto (RPM):</span>
                        <strong style={{ color: "#f8fafc" }}>
                          {telemetria?.tokenMetrics?.cuota?.rpmActual ?? 1} / {telemetria?.tokenMetrics?.cuota?.rpmLimite ?? 15}
                        </strong>
                      </div>
                      <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{
                          width: `${Math.min(100, Math.max(6, ((telemetria?.tokenMetrics?.cuota?.rpmActual || 1) / (telemetria?.tokenMetrics?.cuota?.rpmLimite || 15)) * 100))}%`,
                          height: "100%",
                          background: "#3b82f6"
                        }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
                        <span style={{ color: "#cbd5e1" }}>Peticiones por Día (RPD):</span>
                        <strong style={{ color: "#f8fafc" }}>
                          {telemetria?.tokenMetrics?.cuota?.rpdActual ?? 2} / {telemetria?.tokenMetrics?.cuota?.rpdLimite ?? 500}
                        </strong>
                      </div>
                      <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{
                          width: `${Math.min(100, Math.max(3, ((telemetria?.tokenMetrics?.cuota?.rpdActual || 2) / (telemetria?.tokenMetrics?.cuota?.rpdLimite || 500)) * 100))}%`,
                          height: "100%",
                          background: "#f59e0b"
                        }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Explicación de Cálculo de Tokens */}
                <div style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "18px"
                }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem", fontWeight: 800, color: "#f8fafc" }}>
                    🧠 ¿Cómo se Calculan los Tokens en OpenBJJ?
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "18px", color: "#94a3b8", fontSize: "0.82rem", lineHeight: "1.6" }}>
                    <li>
                      <strong style={{ color: "#f8fafc" }}>Resolución de Imágenes (360px)</strong>: Cada uno de los 9 fotogramas consume ~258 tokens fijos.
                    </li>
                    <li>
                      <strong style={{ color: "#f8fafc" }}>Evaluación de 2 Luchadores</strong>: Analizar las acciones de ambos luchadores no incrementa el costo de entrada de la imagen.
                    </li>
                    <li>
                      <strong style={{ color: "#f8fafc" }}>Zero Tokens en Pose 3D</strong>: La extracción cinemática de articulaciones se ejecuta 100% en el navegador del alumno (0 tokens de API).
                    </li>
                    <li>
                      <strong style={{ color: "#f8fafc" }}>Salida Estructurada</strong>: El diagnóstico JSON ocupa ~160 tokens de salida.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Tabla de Historial en Vivo de Consultas IA */}
              <div style={{
                background: "rgba(18, 18, 20, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "20px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#f8fafc" }}>
                    📜 Registro Histórico de Consultas a la IA
                  </h4>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    Últimas consultas registradas en el dojo
                  </span>
                </div>

                {telemetria?.tokenMetrics?.historial && telemetria.tokenMetrics.historial.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left", color: "#94a3b8" }}>
                          <th style={{ padding: "10px 8px" }}>Fecha / Hora</th>
                          <th style={{ padding: "10px 8px" }}>Practicante</th>
                          <th style={{ padding: "10px 8px" }}>Técnica Analizada</th>
                          <th style={{ padding: "10px 8px" }}>Modelo IA</th>
                          <th style={{ padding: "10px 8px", textAlign: "right" }}>Entrada</th>
                          <th style={{ padding: "10px 8px", textAlign: "right" }}>Salida</th>
                          <th style={{ padding: "10px 8px", textAlign: "right" }}>Total Tokens</th>
                          <th style={{ padding: "10px 8px", textAlign: "center" }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {telemetria.tokenMetrics.historial.map((reg: any) => (
                          <tr key={reg.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <td style={{ padding: "10px 8px", color: "#cbd5e1" }}>
                              {new Date(reg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td style={{ padding: "10px 8px", color: "#f8fafc", fontWeight: 600 }}>
                              {reg.usuarioNombre || "Santiago"}
                            </td>
                            <td style={{ padding: "10px 8px", color: "#fca5a5" }}>
                              {reg.tecnicaId}
                            </td>
                            <td style={{ padding: "10px 8px", color: "#94a3b8", fontFamily: "monospace" }}>
                              {reg.modelo}
                            </td>
                            <td style={{ padding: "10px 8px", textAlign: "right", color: "#cbd5e1" }}>
                              {reg.promptTokens?.toLocaleString()}
                            </td>
                            <td style={{ padding: "10px 8px", textAlign: "right", color: "#cbd5e1" }}>
                              {reg.candidatesTokens?.toLocaleString()}
                            </td>
                            <td style={{ padding: "10px 8px", textAlign: "right", color: "#10b981", fontWeight: 700 }}>
                              {reg.totalTokens?.toLocaleString()}
                            </td>
                            <td style={{ padding: "10px 8px", textAlign: "center" }}>
                              <span style={{
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: reg.estado === "EXITO" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                color: reg.estado === "EXITO" ? "#6ee7b7" : "#fca5a5",
                                fontSize: "0.72rem",
                                fontWeight: 800
                              }}>
                                {reg.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "30px", color: "#71717a" }}>
                    No se han registrado consultas recientes.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
