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

export interface TecnicaEvaluadaItem {
  nombre: string;
  porcentaje: number;
  intentos: number;
  ultimaDesviacion: number;
  severidad: string;
  fecha: string;
}

export interface RutaAprendizaje {
  nivelCompetenciaActual: string;
  drillRecomendado: string;
  videoYouTubeUrl: string;
  mensajeAdaptativo: string;
  ultimaTecnica?: string;
  posicionesMaestria?: { nombre: string; porcentaje: number }[];
  tecnicasEvaluadas?: TecnicaEvaluadaItem[];
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

  private calcularTecnicasEvaluadas(historial: any[]): TecnicaEvaluadaItem[] {
    const mapaTecnicas: Map<string, {
      nombre: string;
      scores: number[];
      ultimaDesviacion: number;
      severidad: string;
      fecha: string;
    }> = new Map();

    historial.forEach(h => {
      const nombre = (h.tecnicaId || h.reporte?.tecnicaId || "Sparring General").replace(/-/g, " ").trim();
      const desviacion = h.desviacionGrados ?? h.reporte?.desviacionGrados ?? h.desviacion ?? 20;
      const score = Math.max(10, Math.min(100, 100 - Math.round(Number(desviacion) * 1.5)));
      const severidad = h.reporte?.severidad || (score > 70 ? "Leve" : "Moderado");
      const fecha = h.fecha ? new Date(h.fecha).toLocaleDateString("es-ES") : "Reciente";

      const key = nombre.toLowerCase();
      if (!mapaTecnicas.has(key)) {
        mapaTecnicas.set(key, {
          nombre: nombre.toUpperCase(),
          scores: [score],
          ultimaDesviacion: Number(desviacion),
          severidad,
          fecha
        });
      } else {
        const item = mapaTecnicas.get(key)!;
        item.scores.push(score);
      }
    });

    return Array.from(mapaTecnicas.values()).map(item => {
      const avg = Math.round(item.scores.reduce((a, b) => a + b, 0) / item.scores.length);
      return {
        nombre: item.nombre,
        porcentaje: avg,
        intentos: item.scores.length,
        ultimaDesviacion: item.ultimaDesviacion,
        severidad: item.severidad,
        fecha: item.fecha
      };
    });
  }

  private calcularMaestriaPorPosicion(historial: any[]): { nombre: string; porcentaje: number }[] {
    const scores: Record<string, number[]> = {
      "Derribos y Proyecciones": [],
      "Guardia Cerrada": [],
      "Pasaje de Guardia": [],
      "Control Lateral": [],
      "Montada y Espalda": [],
      "Media Guardia": [],
      "Guardia Abierta y Sumisiones": []
    };

    historial.forEach(h => {
      const tecnica = (h.tecnicaId || "").toLowerCase();
      const desviacion = h.desviacionGrados ?? h.desviacion ?? 20;
      const score = Math.max(10, Math.min(100, 100 - Math.round(Number(desviacion) * 1.5)));

      if (tecnica.includes("derribo") || tecnica.includes("suplex") || tecnica.includes("proyeccion") || tecnica.includes("takedown") || tecnica.includes("single leg") || tecnica.includes("voladora") || tecnica.includes("judo") || tecnica.includes("wrestling")) {
        scores["Derribos y Proyecciones"].push(score);
      } else if (tecnica.includes("lateral") || tecnica.includes("side") || tecnica.includes("100 kilos") || tecnica.includes("cien kilos")) {
        scores["Control Lateral"].push(score);
      } else if (tecnica.includes("pasaje") || tecnica.includes("pass") || tecnica.includes("knee cut") || tecnica.includes("torreando")) {
        scores["Pasaje de Guardia"].push(score);
      } else if (tecnica.includes("montada") || tecnica.includes("mount") || tecnica.includes("espalda") || tecnica.includes("back") || tecnica.includes("mataleon")) {
        scores["Montada y Espalda"].push(score);
      } else if (tecnica.includes("media") || tecnica.includes("half")) {
        scores["Media Guardia"].push(score);
      } else if (tecnica.includes("cerrada") || tecnica.includes("closed") || tecnica.includes("fechada")) {
        scores["Guardia Cerrada"].push(score);
      } else {
        scores["Guardia Abierta y Sumisiones"].push(score);
      }
    });

    const calcAvg = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sum = arr.reduce((a, b) => a + b, 0);
      return Math.round(sum / arr.length);
    };

    return [
      { nombre: "Derribos y Proyecciones", porcentaje: calcAvg(scores["Derribos y Proyecciones"]) },
      { nombre: "Guardia Cerrada", porcentaje: calcAvg(scores["Guardia Cerrada"]) },
      { nombre: "Pasaje de Guardia", porcentaje: calcAvg(scores["Pasaje de Guardia"]) },
      { nombre: "Control Lateral", porcentaje: calcAvg(scores["Control Lateral"]) },
      { nombre: "Montada y Espalda", porcentaje: calcAvg(scores["Montada y Espalda"]) },
      { nombre: "Media Guardia", porcentaje: calcAvg(scores["Media Guardia"]) },
      { nombre: "Guardia Abierta y Sumisiones", porcentaje: calcAvg(scores["Guardia Abierta y Sumisiones"]) }
    ];
  }

  private async obtenerVideoYouTubeRelacionado(usuarioId: string, terminoBusqueda: string): Promise<string> {
    const terminoLimpio = (terminoBusqueda || "bjj tutorial").replace(/_/g, " ").replace(/-/g, " ").toLowerCase();

    try {
      let fuentes: any[] = [];
      if (this.ragController && typeof this.ragController.obtenerFuentes === "function") {
        fuentes = await this.ragController.obtenerFuentes(usuarioId);
      } else if (this.persistence && typeof (this.persistence as any).obtenerFuentesConocimiento === "function") {
        fuentes = await (this.persistence as any).obtenerFuentesConocimiento(usuarioId);
      }

      // Filtrar todas las fuentes de YouTube (case-insensitive) con URL de video específica
      const fuentesYouTube = fuentes.filter((f: any) =>
        (String(f.tipo).toUpperCase() === "YOUTUBE" || String(f.tipo).toLowerCase() === "youtube") &&
        f.url && (f.url.includes("watch?v=") || f.url.includes("youtu.be/"))
      );

      if (fuentesYouTube.length > 0) {
        // Familias y conceptos clave de BJJ para matching semántico de alta precisión
        const FAMILIAS_BJJ = [
          { tag: "montada", terms: ["montada", "mount", "mounted"] },
          { tag: "guardia_cerrada", terms: ["guardia cerrada", "closed guard", "guarda fechada"] },
          { tag: "media_guardia", terms: ["media guardia", "half guard", "meia guarda", "deep half"] },
          { tag: "guardia_abierta", terms: ["guardia abierta", "open guard", "de la riva", "spider", "lasso", "mariposa", "butterfly"] },
          { tag: "control_lateral", terms: ["control lateral", "side control", "100 kilos", "cien kilos", "cross side"] },
          { tag: "espalda", terms: ["espalda", "back control", "back take", "back mount"] },
          { tag: "tortuga", terms: ["tortuga", "turtle"] },
          { tag: "derribo", terms: ["derribo", "takedown", "single leg", "double leg", "suplex", "proyeccion", "judo", "wrestling"] },
          { tag: "voladora", terms: ["voladora", "flying"] },
          { tag: "llave_brazo", terms: ["llave de brazo", "armbar", "arm bar", "juji", "llave de codo", "brazo"] },
          { tag: "triangulo", terms: ["triangulo", "triangle", "sankaku"] },
          { tag: "kimura", terms: ["kimura", "ude garami", "figura 4"] },
          { tag: "americana", terms: ["americana", "keylock"] },
          { tag: "guillotina", terms: ["guillotina", "guillotine"] },
          { tag: "mataleon", terms: ["mataleon", "mata leon", "rear naked", "rnc"] },
          { tag: "pasaje", terms: ["pasaje", "pass", "passing", "knee cut", "torreando", "smash pass"] },
          { tag: "escape", terms: ["escape", "salida", "defensa", "escapar"] }
        ];

        // Identificar qué familias están presentes en la búsqueda
        const familiasPresentesEnQuery = FAMILIAS_BJJ.filter(fam =>
          fam.terms.some(t => terminoLimpio.includes(t))
        );

        let mejorMatch: any = null;
        let maxScore = -1;

        for (const fuente of fuentesYouTube) {
          const tit = (fuente.titulo || "").toLowerCase();
          let score = 0;

          let familiasCoincidentes = 0;
          for (const fam of familiasPresentesEnQuery) {
            const videoTieneFamilia = fam.terms.some(t => tit.includes(t));
            if (videoTieneFamilia) {
              score += 40;
              familiasCoincidentes++;
            }
          }

          // Si coinciden múltiples conceptos (ej: Armbar + Mount), bonificación masiva
          if (familiasCoincidentes >= 2) {
            score += 100;
          }

          // Coincidencias de palabras individuales
          const palabras = terminoLimpio.split(/\s+/).filter(w => w.length > 2);
          for (const palabra of palabras) {
            if (tit.includes(palabra)) {
              score += 5;
            }
          }

          if (score > maxScore) {
            maxScore = score;
            mejorMatch = fuente;
          }
        }

        if (mejorMatch && maxScore > 0) {
          console.log(`[Adaptación RAG] Video exacto seleccionado ('${mejorMatch.titulo}') [Score: ${maxScore}]: ${mejorMatch.url}`);
          return mejorMatch.url;
        }

        // Si no hay match directo, entregar el primer video del acervo técnico del dojo
        console.log(`[Adaptación RAG] Entregando video técnico guardado en dojo: ${fuentesYouTube[0].url}`);
        return fuentesYouTube[0].url;
      }
    } catch (e: any) {
      console.warn("[Adaptación RAG] Error al consultar fuentes guardadas de YouTube:", e.message);
    }

    // Video técnico educativo por defecto en español (nunca URL de búsqueda)
    return "https://www.youtube.com/watch?v=BPEXBXJpLEw";
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
    const tecnicasEvaluadas = this.calcularTecnicasEvaluadas(historial);

    if (!reporte) {
      const videoInicial = await this.obtenerVideoYouTubeRelacionado(usuarioId, "shrimp bjj drill");
      return {
        nivelCompetenciaActual: "Principiante",
        drillRecomendado: "Movimiento de cadera (Shrimping) básico",
        videoYouTubeUrl: videoInicial,
        mensajeAdaptativo: "Continúa practicando los drills básicos para consolidar tus posiciones.",
        ultimaTecnica: historial.length > 0 ? (historial[0].tecnicaId || "") : undefined,
        posicionesMaestria,
        tecnicasEvaluadas
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

    // Recalcular posicionesMaestria y tecnicasEvaluadas agregando el reporte actual
    const tecnicaActual = (evaluacion.tecnicaId || "").toLowerCase();
    const historialConActual = [{
      tecnicaId: evaluacion.tecnicaId || tecnicaActual,
      desviacionGrados,
      reporte: evaluacion,
      fecha: new Date().toISOString()
    }, ...historial];
    const posicionesActualizadas = this.calcularMaestriaPorPosicion(historialConActual);
    const tecnicasEvaluadasActualizadas = this.calcularTecnicasEvaluadas(historialConActual);

    const nombresArticulaciones: { [k: string]: string } = {
      codo_derecho: "codo derecho",
      codo_izquierdo: "codo izquierdo",
      rodilla_derecha: "rodilla derecha",
      rodilla_izquierda: "rodilla izquierda",
      cadera: "cadera y postura",
      hombro_derecho: "hombro derecho",
      hombro_izquierdo: "hombro izquierdo"
    };
    const articulacionLimpia = nombresArticulaciones[errorArticular] || errorArticular.replace(/_/g, " ");

    const drillsPorArticulacion: { [k: string]: string } = {
      codo_derecho: "Ejercicio: Practica 10 repeticiones manteniendo los codos bien pegados a tus costillas para proteger tus brazos.",
      codo_izquierdo: "Ejercicio: Practica entradas asegurando que tu codo izquierdo quede cerrado y protegido contra tu cuerpo.",
      rodilla_derecha: "Ejercicio: Haz repeticiones cerrando y pellizcando fuerte con las rodillas para asegurar el control de la posición.",
      rodilla_izquierda: "Ejercicio: Mantén la rodilla izquierda firme y activa para controlar la base de tu compañero.",
      cadera: "Ejercicio: Realiza drills de escape de cadera (shrimping) y elevación de pelvis para mejorar tu palanca.",
    };
    const drillSugerido = drillsPorArticulacion[errorArticular] || `Ejercicio: Repite 10 veces la entrada de ${evaluacion.tecnicaId || "la técnica"} enfocándote en cerrar los espacios y mantener una base sólida.`;

    if (hayFalloRecurrente) {
      console.log(`[Adaptación] Fallo recurrente (> 3) en ${errorArticular}. Conmutando estrategia didáctica a fuentes RAG.`);
      const videoRecurrente = await this.obtenerVideoYouTubeRelacionado(usuarioId, errorArticular);
      return {
        nivelCompetenciaActual: "Ajuste Técnico de Tatami",
        drillRecomendado: drillSugerido,
        videoYouTubeUrl: videoRecurrente,
        mensajeAdaptativo: `Consejo del Sensei: En tus últimas prácticas has dejado el ${articulacionLimpia} algo expuesto. Tómate unos minutos para practicar este ajuste antes del combate.`,
        ultimaTecnica: evaluacion.tecnicaId,
        posicionesMaestria: posicionesActualizadas,
        tecnicasEvaluadas: tecnicasEvaluadasActualizadas
      };
    }

    // Buscar en fuentes RAG agregadas por el usuario o generar búsqueda de YouTube optimizada
    const tecnicaBusqueda = (evaluacion.youtube_query || evaluacion.tecnicaId || errorArticular || "bjj").replace(/-/g, " ").toLowerCase();
    const videoRecomendado = await this.obtenerVideoYouTubeRelacionado(usuarioId, tecnicaBusqueda);

    return {
      nivelCompetenciaActual: "Principiante",
      drillRecomendado: drillSugerido,
      videoYouTubeUrl: videoRecomendado,
      mensajeAdaptativo: `Consejo del Sensei: No descuides la posición de tu ${articulacionLimpia}, mantén la presión antes de que tu compañero aproveche el espacio.`,
      ultimaTecnica: evaluacion.tecnicaId,
      posicionesMaestria: posicionesActualizadas,
      tecnicasEvaluadas: tecnicasEvaluadasActualizadas
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
