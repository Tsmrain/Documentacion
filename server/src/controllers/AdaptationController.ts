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
}

export class AdaptationController {
  private persistence: IPersistenceService;

  constructor(persistence: IPersistenceService) {
    this.persistence = persistence;
  }

  private calcularMaestriaPorPosicion(historial: any[]): { nombre: string; porcentaje: number }[] {
    const scoresGuardia: number[] = [];
    const scoresPasaje: number[] = [];
    const scoresMontada: number[] = [];

    if (Array.isArray(historial)) {
      historial.forEach(h => {
        const tecnica = (h.tecnicaId || "").toLowerCase();
        const desviacion = h.desviacionGrados || 0;
        const score = Math.max(0, Math.min(100, 100 - Math.round(desviacion * 1.8)));

        if (tecnica.includes("montada") || tecnica.includes("mount") || tecnica.includes("lateral") || tecnica.includes("side") || tecnica.includes("espalda") || tecnica.includes("back")) {
          scoresMontada.push(score);
        } else if (tecnica.includes("pasaje") || tecnica.includes("pass") || tecnica.includes("derribo") || tecnica.includes("takedown")) {
          scoresPasaje.push(score);
        } else {
          scoresGuardia.push(score);
        }
      });
    }

    const calcAvg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    return [
      { nombre: "Guardia Cerrada", porcentaje: calcAvg(scoresGuardia) },
      { nombre: "Pasaje de Guardia", porcentaje: calcAvg(scoresPasaje) },
      { nombre: "Control Lateral y Montada", porcentaje: calcAvg(scoresMontada) }
    ];
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
      return {
        nivelCompetenciaActual: "Principiante",
        drillRecomendado: "Movimiento de cadera (Shrimping) básico",
        videoYouTubeUrl: "https://youtube.com/watch?v=shrimp101",
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
    const scoreActual = Math.max(0, Math.min(100, 100 - Math.round(desviacionGrados * 1.8)));
    const historialConActual = [...historial, { tecnicaId: tecnicaActual, desviacionGrados }];
    const posicionesActualizadas = this.calcularMaestriaPorPosicion(historialConActual);

    if (hayFalloRecurrente) {
      console.log(`[Adaptación] Fallo recurrente (> 3) en ${errorArticular}. Conmutando estrategia didáctica.`);
      const resConmutada = this.conmutarEstrategiaDidactica(perfil, {
        desviacionArticular: errorArticular,
        desviacionGrados,
        severidad: evaluacion.severidad || "Moderado"
      });
      resConmutada.ultimaTecnica = evaluacion.tecnicaId;
      resConmutada.posicionesMaestria = posicionesActualizadas;
      return resConmutada;
    }

    return {
      nivelCompetenciaActual: "Principiante",
      drillRecomendado: "Drill de Guardia Cerrada Estándar",
      videoYouTubeUrl: "https://youtube.com/watch?v=guardia_cerrada_basic",
      mensajeAdaptativo: `Intento registrado. Cuida el ángulo de tu ${errorArticular.replace("_", " ")}.`,
      ultimaTecnica: evaluacion.tecnicaId,
      posicionesMaestria: posicionesActualizadas
    };
  }

  evaluarRecurrenciaErrores(perfil: PerfilCompetencia, errorKey: string): boolean {
    const fallosConsecutivos = perfil.erroresHistoricos[errorKey] || 0;
    return fallosConsecutivos > 3;
  }

  conmutarEstrategiaDidactica(perfil: PerfilCompetencia, error: ErrorBiomecanico): RutaAprendizaje {
    return {
      nivelCompetenciaActual: "Reforzamiento Anatomico",
      drillRecomendado: `Drill de fortalecimiento de manguito rotador y rotación de ${error.desviacionArticular.replace("_", " ")}`,
      videoYouTubeUrl: "https://youtube.com/watch?v=drill_aislamiento_anatomico",
      mensajeAdaptativo: `Alerta pedagogica: Has fallado mas de 3 veces consecutivas en tu ${error.desviacionArticular.replace("_", " ")}. Recomendamos conmutar a ejercicios de aislamiento anatomico para corregir el angulo.`
    };
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
