export interface ErrorBiomecanico {
  desviacionArticular: string;
  desviacionGrados: number;
  severidad: string;
}

export interface HistorialVisualizacion {
  videoId: string;
  visto: boolean;
  timestamp: Date;
}

export interface PerfilCompetencia {
  usuarioId: string;
  cinturon: string;
  erroresHistoricos: { [errorKey: string]: number }; // vecesDetectadoConsecutivas
  historialVisualizaciones: HistorialVisualizacion[];
}

export interface RutaAprendizaje {
  nivelCompetenciaActual: string;
  drillRecomendado: string;
  videoYouTubeUrl: string;
  mensajeAdaptativo: string;
  ultimaTecnica?: string;
  posicionesMaestria?: { nombre: string; porcentaje: number }[];
}

export interface IPersistenceService {
  cargarPerfil(usuarioId: string): Promise<PerfilCompetencia>;
  guardarAnalisis(usuarioId: string, analisis: any): Promise<boolean>;
  registrarVisualizacion(usuarioId: string, videoId: string): Promise<boolean>;
  obtenerHistorialAnalisis(usuarioId: string): Promise<any[]>;
  eliminarAnalisis(usuarioId: string, analisisId: string): Promise<boolean>;
}

export class AdaptationController {
  private persistence: IPersistenceService;
  private ragController?: any;

  constructor(persistence: IPersistenceService, ragController?: any) {
    this.persistence = persistence;
    this.ragController = ragController;
  }

  private calcularMaestriaPorPosicion(historial: any[]): { nombre: string; porcentaje: number }[] {
    const scores: Record<string, number[]> = {
      "Guardia Cerrada": [],
      "Pasaje de Guardia": [],
      "Control Lateral": [],
      "Montada": [],
      "Espalda": [],
      "Media Guardia": [],
      "Guardia Abierta": []
    };

    historial.forEach(h => {
      const tecnica = (h.tecnicaId || "").toLowerCase();
      const desviacion = h.desviacionGrados || 0;
      const score = Math.max(0, Math.min(100, 100 - Math.round(desviacion * 1.8)));

      if (tecnica.includes("guardia-cerrada") || tecnica.includes("cerrada") || tecnica.includes("closed")) {
        scores["Guardia Cerrada"].push(score);
      } else if (tecnica.includes("pasaje") || tecnica.includes("pass")) {
        scores["Pasaje de Guardia"].push(score);
      } else if (tecnica.includes("lateral") || tecnica.includes("side")) {
        scores["Control Lateral"].push(score);
      } else if (tecnica.includes("montada") || tecnica.includes("mount")) {
        scores["Montada"].push(score);
      } else if (tecnica.includes("espalda") || tecnica.includes("back")) {
        scores["Espalda"].push(score);
      } else if (tecnica.includes("media") || tecnica.includes("half")) {
        scores["Media Guardia"].push(score);
      } else if (tecnica.includes("abierta") || tecnica.includes("open")) {
        scores["Guardia Abierta"].push(score);
      } else {
        scores["Guardia Cerrada"].push(score);
      }
    });

    const calcAvg = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sum = arr.reduce((a, b) => a + b, 0);
      return Math.round(sum / arr.length);
    };

    return [
      { nombre: "Guardia Cerrada", porcentaje: calcAvg(scores["Guardia Cerrada"]) },
      { nombre: "Pasaje de Guardia", porcentaje: calcAvg(scores["Pasaje de Guardia"]) },
      { nombre: "Control Lateral", porcentaje: calcAvg(scores["Control Lateral"]) },
      { nombre: "Montada", porcentaje: calcAvg(scores["Montada"]) },
      { nombre: "Espalda", porcentaje: calcAvg(scores["Espalda"]) },
      { nombre: "Media Guardia", porcentaje: calcAvg(scores["Media Guardia"]) },
      { nombre: "Guardia Abierta", porcentaje: calcAvg(scores["Guardia Abierta"]) }
    ];
  }

  private async obtenerVideoYouTubeRelacionado(usuarioId: string, terminoBusqueda: string): Promise<string> {
    const terminoLimpio = (terminoBusqueda || "bjj tutorial").replace(/_/g, " ").replace(/-/g, " ");
    const fallbackUrl = "https://www.youtube.com/results?search_query=" + encodeURIComponent(terminoLimpio + " bjj tutorial");

    try {
      let fuentes: any[] = [];
      if (this.ragController && typeof this.ragController.obtenerFuentes === "function") {
        fuentes = await this.ragController.obtenerFuentes(usuarioId);
      } else if (this.persistence && typeof (this.persistence as any).obtenerFuentesConocimiento === "function") {
        fuentes = await (this.persistence as any).obtenerFuentesConocimiento(usuarioId);
      }

      const fuentesYouTube = fuentes.filter((f: any) => f.tipo === "youtube" && f.url);
      if (fuentesYouTube.length > 0) {
        const busquedaClean = terminoLimpio.toLowerCase();
        const match = fuentesYouTube.find((f: any) =>
          (f.titulo || "").toLowerCase().includes(busquedaClean) ||
          busquedaClean.includes((f.titulo || "").toLowerCase())
        );

        if (match) {
          console.log(`[Adaptación RAG] Video de fuente agregada seleccionado para '${terminoLimpio}': ${match.url}`);
          return match.url;
        }

        console.log(`[Adaptación RAG] Seleccionando primera fuente de YouTube agregada por el practicante: ${fuentesYouTube[0].url}`);
        return fuentesYouTube[0].url;
      }
    } catch (e: any) {
      console.warn("[Adaptación RAG] Error al consultar fuentes agregadas de YouTube:", e.message);
    }

    return fallbackUrl;
  }

  async evaluarAdaptabilidad(usuarioId: string, reporte: string | null): Promise<RutaAprendizaje> {
    const perfil = await this.persistence.cargarPerfil(usuarioId);
    let historial: any[] = [];
    try {
      historial = await this.persistence.obtenerHistorialAnalisis(usuarioId);
    } catch (e) {
      historial = [];
    }

    const posicionesMaestria = this.calcularMaestriaPorPosicion(historial);

    if (!reporte) {
      const videoInicial = await this.obtenerVideoYouTubeRelacionado(usuarioId, "shrimp bjj drill");
      return {
        nivelCompetenciaActual: "Principiante",
        drillRecomendado: "Movimiento de cadera (Shrimping) básico",
        videoYouTubeUrl: videoInicial,
        mensajeAdaptativo: "Continúa practicando los drills básicos para consolidar tus posiciones.",
        ultimaTecnica: historial.length > 0 ? (historial[historial.length - 1].tecnicaId || "") : undefined,
        posicionesMaestria
      };
    }

    const evaluacion = JSON.parse(reporte);
    const errorArticular = evaluacion.desviacionArticular || "codo_derecho";
    const desviacionGrados = evaluacion.desviacionGrados || 0;

    let hayFalloRecurrente = false;

    if (errorArticular && desviacionGrados > 15) {
      perfil.erroresHistoricos[errorArticular] = (perfil.erroresHistoricos[errorArticular] || 0) + 1;
      hayFalloRecurrente = this.evaluarRecurrenciaErrores(perfil, errorArticular);
    } else if (errorArticular) {
      perfil.erroresHistoricos[errorArticular] = 0;
    }

    // Recalcular posicionesMaestria agregando el reporte actual
    const tecnicaActual = (evaluacion.tecnicaId || "").toLowerCase();
    const historialConActual = [...historial, { tecnicaId: tecnicaActual, desviacionGrados }];
    const posicionesActualizadas = this.calcularMaestriaPorPosicion(historialConActual);

    if (hayFalloRecurrente) {
      console.log(`[Adaptación] Fallo recurrente (> 3) en ${errorArticular}. Conmutando estrategia didáctica a fuentes RAG.`);
      const videoRecurrente = await this.obtenerVideoYouTubeRelacionado(usuarioId, errorArticular);
      return {
        nivelCompetenciaActual: "Reforzamiento Anatómico",
        drillRecomendado: `Drill de fortalecimiento de manguito rotador y rotación de ${errorArticular.replace("_", " ")}`,
        videoYouTubeUrl: videoRecurrente,
        mensajeAdaptativo: `Alerta pedagógica: Has fallado más de 3 veces consecutivas en tu ${errorArticular.replace("_", " ")}. Recomendamos conmutar a ejercicios de aislamiento anatómico para corregir el ángulo.`,
        ultimaTecnica: evaluacion.tecnicaId,
        posicionesMaestria: posicionesActualizadas
      };
    }

    // Buscar en fuentes RAG agregadas por el usuario
    const tecnicaBusqueda = (evaluacion.tecnicaId || errorArticular || "bjj").replace(/-/g, " ").toLowerCase();
    const videoRecomendado = await this.obtenerVideoYouTubeRelacionado(usuarioId, tecnicaBusqueda);

    return {
      nivelCompetenciaActual: "Principiante",
      drillRecomendado: `Practica repeticiones (drills) para mejorar tu ${evaluacion.tecnicaId || "Guardia Cerrada"}`,
      videoYouTubeUrl: videoRecomendado,
      mensajeAdaptativo: `No descuides tu ${errorArticular.replace("_", " ")}, ajusta la posición antes de que el oponente aproveche el espacio.`,
      ultimaTecnica: evaluacion.tecnicaId,
      posicionesMaestria: posicionesActualizadas
    };
  }

  evaluarRecurrenciaErrores(perfil: PerfilCompetencia, errorKey: string): boolean {
    const fallosConsecutivos = perfil.erroresHistoricos[errorKey] || 0;
    return fallosConsecutivos > 3;
  }

  async registrarVisualizacion(usuarioId: string, videoId: string): Promise<boolean> {
    return this.persistence.registrarVisualizacion(usuarioId, videoId);
  }

  async obtenerHistorialAnalisis(usuarioId: string): Promise<any[]> {
    try {
      return await this.persistence.obtenerHistorialAnalisis(usuarioId);
    } catch (error) {
      console.warn("[AdaptationController] Error al obtener historial:", error);
      return [];
    }
  }
}
