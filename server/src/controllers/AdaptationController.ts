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

  async evaluarAdaptabilidad(usuarioId: string, reporte: string | null): Promise<RutaAprendizaje> {
    const perfil = await this.persistence.cargarPerfil(usuarioId);
    
    if (!reporte) {
      return {
        nivelCompetenciaActual: "Intermedio",
        drillRecomendado: "Movimiento de cadera (Shrimping) básico",
        videoYouTubeUrl: "https://youtube.com/watch?v=shrimp101",
        mensajeAdaptativo: "Continúa practicando los drills básicos para consolidar la guardia."
      };
    }

    const evaluacion = JSON.parse(reporte);
    const errorArticular = evaluacion.desviacionArticular;
    const desviacionGrados = evaluacion.desviacionGrados;

    let hayFalloRecurrente = false;

    if (errorArticular && desviacionGrados > 15) {
      perfil.erroresHistoricos[errorArticular] = (perfil.erroresHistoricos[errorArticular] || 0) + 1;
      hayFalloRecurrente = this.evaluarRecurrenciaErrores(perfil, errorArticular);
    } else if (errorArticular) {
      perfil.erroresHistoricos[errorArticular] = 0;
    }

    if (hayFalloRecurrente) {
      console.log(`[Adaptación] Fallo recurrente (> 3) en ${errorArticular}. Conmutando estrategia didáctica.`);
      return this.conmutarEstrategiaDidactica(perfil, {
        desviacionArticular: errorArticular,
        desviacionGrados,
        severidad: evaluacion.severidad
      });
    }

    return {
      nivelCompetenciaActual: "Principiante",
      drillRecomendado: "Drill de Guardia Cerrada Estándar",
      videoYouTubeUrl: "https://youtube.com/watch?v=guardia_cerrada_basic",
      mensajeAdaptativo: `Intento registrado. Cuida el ángulo de tu ${errorArticular.replace("_", " ")}.`
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
