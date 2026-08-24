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
  videoYouTubeAlternativo?: string;
  mensajeAdaptativo: string;
  ultimaTecnica?: string;
  posicionesMaestria?: { nombre: string; porcentaje: number }[];
  tecnicasEvaluadas?: TecnicaEvaluadaItem[];
  esFalloRecurrente?: boolean;
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
    const mapaPosiciones: Map<string, number[]> = new Map();

    historial.forEach(h => {
      const nombre = (h.tecnicaId || h.reporte?.tecnicaId || "Sparring").replace(/-/g, " ");
      const desviacion = h.desviacionGrados ?? h.reporte?.desviacionGrados ?? h.desviacion ?? 20;
      const score = Math.max(10, Math.min(100, 100 - Math.round(Number(desviacion) * 1.5)));

      const key = nombre.toLowerCase();
      if (!mapaPosiciones.has(key)) {
        mapaPosiciones.set(key, [score]);
      } else {
        mapaPosiciones.get(key)!.push(score);
      }
    });

    const resultados: { nombre: string; porcentaje: number }[] = [];
    mapaPosiciones.forEach((scores, nombre) => {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      resultados.push({
        nombre: nombre.toUpperCase(),
        porcentaje: avg
      });
    });

    return resultados;
  }

  private async obtenerVideoYouTubeRelacionado(
    usuarioId: string,
    terminoBusqueda: string,
    esDefensa: boolean = false,
    tecnicaNombre?: string,
    articulacionError?: string,
    hayFalloRecurrente: boolean = false,
    videosVistos: string[] = []
  ): Promise<string> {
    const terminoLimpio = (terminoBusqueda || "bjj tutorial").replace(/_/g, " ").replace(/-/g, " ").toLowerCase();
    const tecnicaFormato = tecnicaNombre || (terminoBusqueda ? terminoBusqueda.replace(/_/g, " ").replace(/-/g, " ") : "BJJ");
    const articulacionFormato = articulacionError || "postura";

    // Fallback determinista estructurado de YouTube Search adaptativo
    let fallbackSearchQuery = "";
    if (hayFalloRecurrente) {
      fallbackSearchQuery = esDefensa
        ? `Tutorial BJJ errores comunes defensa y escape de ${tecnicaFormato} ${articulacionFormato} drills`
        : `Tutorial BJJ correccion de errores comunes y drills ${tecnicaFormato} ${articulacionFormato}`;
    } else {
      fallbackSearchQuery = esDefensa
        ? `Tutorial BJJ defensa y escape de ${tecnicaFormato} ${articulacionFormato}`
        : `Tutorial BJJ ${tecnicaFormato} ${articulacionFormato} correccion drill`;
    }
    const fallbackUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(fallbackSearchQuery.trim())}`;

    try {
      let fuentes: any[] = [];
      if (this.ragController && typeof this.ragController.obtenerFuentes === "function") {
        fuentes = await this.ragController.obtenerFuentes(usuarioId);
      } else if (this.persistence && typeof (this.persistence as any).obtenerFuentesConocimiento === "function") {
        fuentes = await (this.persistence as any).obtenerFuentesConocimiento(usuarioId);
      }

      const fuentesYouTube = fuentes.filter((f: any) =>
        (String(f.tipo).toUpperCase() === "YOUTUBE" || String(f.tipo).toLowerCase() === "youtube") &&
        f.url && (f.url.includes("watch?v=") || f.url.includes("youtu.be/"))
      );

      if (fuentesYouTube.length > 0) {
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
          { tag: "escape", terms: ["escape", "salida", "defensa", "escapar", "defend", "defensas", "survival", "sobrevivir", "counter"] }
        ];

        const familiasPresentesEnQuery = FAMILIAS_BJJ.filter(fam =>
          fam.terms.some(t => terminoLimpio.includes(t))
        );

        let mejorMatch: any = null;
        let maxScore = -999;

        for (const fuente of fuentesYouTube) {
          const tit = (fuente.titulo || "").toLowerCase();
          let score = 0;

          const tieneTerminosDefensa = ["defensa", "escape", "salida", "escapar", "defend", "defensas", "survival", "sobrevivir", "counter"].some(t => tit.includes(t));

          if (esDefensa) {
            if (!tieneTerminosDefensa) {
              // Si el usuario es DEFENSOR y el video solo enseña ataque, descartar inmediatamente
              continue;
            }
            score += 150;
          } else {
            // Si el usuario está atacando, priorizar videos de ejecución sobre videos de escape
            if (!tieneTerminosDefensa) score += 50;
            else score -= 150;
          }

          // Si el usuario ya vio este video varias veces y hay fallo recurrente, rotar a una alternativa
          if (videosVistos.includes(fuente.url) && hayFalloRecurrente) {
            score -= 30; // Permite que otros videos del dojo con diferente enfoque tomen prioridad
          }

          // Coincidencia exacta de frases compuestas clave
          const FRASES_CLAVE = [
            "defensa de llave de brazo",
            "defensa de armbar",
            "escape de llave de brazo",
            "salida de llave de brazo",
            "escape de montada",
            "salida de montada",
            "defensa de triangulo",
            "escape de control lateral",
            "salida de 100 kilos"
          ];
          for (const frase of FRASES_CLAVE) {
            if (terminoLimpio.includes(frase) && tit.includes(frase)) {
              score += 80;
            }
          }

          let familiasCoincidentes = 0;
          for (const fam of familiasPresentesEnQuery) {
            const videoTieneFamilia = fam.terms.some(t => tit.includes(t));
            if (videoTieneFamilia) {
              score += 40;
              familiasCoincidentes++;
            }
          }

          if (familiasCoincidentes >= 2) {
            score += 100;
          }

          const palabras = terminoLimpio.split(/\s+/).filter(w => w.length > 2);
          for (const palabra of palabras) {
            if (tit.includes(palabra)) {
              score += 8;
            }
          }

          if (score > maxScore) {
            maxScore = score;
            mejorMatch = fuente;
          }
        }

        if (mejorMatch && maxScore > 0) {
          return mejorMatch.url;
        }
      }
    } catch (e: any) {
      console.warn("[Adaptación RAG] Error al consultar fuentes guardadas de YouTube:", e.message);
    }

    return fallbackUrl;
  }

  async evaluarAdaptabilidad(usuarioId: string, reporte: string | null, rolPracticante: string = "ATACANTE"): Promise<RutaAprendizaje> {
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
      const videoInicial = await this.obtenerVideoYouTubeRelacionado(usuarioId, "shrimp bjj drill", false, "Shrimping", "cadera");
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

    const esDefensa = rolPracticante === "DEFENSOR";
    const drillDefensa = `Drill de Escape: Practica repeticiones de defensa, postura y escape frente a ${evaluacion.tecnicaId || "la técnica"}.`;
    const drillAtaque = drillsPorArticulacion[errorArticular] || `Ejercicio: Repite 10 veces la entrada de ${evaluacion.tecnicaId || "la técnica"} enfocándote en cerrar los espacios y mantener una base sólida.`;
    const drillSugerido = esDefensa ? drillDefensa : drillAtaque;

    let tecnicaBusqueda = "";
    if (esDefensa) {
      tecnicaBusqueda = `defensa de llave de brazo escape salida ${evaluacion.tecnicaId || "bjj"}`;
      if (evaluacion.youtube_query && (evaluacion.youtube_query.toLowerCase().includes("defensa") || evaluacion.youtube_query.toLowerCase().includes("escape"))) {
        tecnicaBusqueda = evaluacion.youtube_query;
      }
    } else {
      tecnicaBusqueda = evaluacion.youtube_query || evaluacion.tecnicaId || errorArticular || "bjj";
    }

    tecnicaBusqueda = tecnicaBusqueda.replace(/-/g, " ").toLowerCase();
    const videosVistosIds = (perfil.historialVisualizaciones || []).map((v: any) => v.videoId || v.url || "");
    const videoRecomendado = await this.obtenerVideoYouTubeRelacionado(
      usuarioId,
      tecnicaBusqueda,
      esDefensa,
      evaluacion.tecnicaId,
      articulacionLimpia,
      hayFalloRecurrente,
      videosVistosIds
    );

    if (hayFalloRecurrente) {
      return {
        nivelCompetenciaActual: "Ajuste Técnico de Tatami",
        drillRecomendado: drillSugerido,
        videoYouTubeUrl: videoRecomendado,
        mensajeAdaptativo: esDefensa
          ? `Consejo del Sensei: En tus últimas defensas has dejado el ${articulacionLimpia} expuesto. Conecta tus agarres antes de que la sumisión se cierre.`
          : `Consejo del Sensei: En tus últimas prácticas has dejado el ${articulacionLimpia} algo expuesto. Tómate unos minutos para practicar este ajuste antes del combate.`,
        ultimaTecnica: evaluacion.tecnicaId,
        posicionesMaestria: posicionesActualizadas,
        tecnicasEvaluadas: tecnicasEvaluadasActualizadas,
        esFalloRecurrente: true
      };
    }

    return {
      nivelCompetenciaActual: "Principiante",
      drillRecomendado: drillSugerido,
      videoYouTubeUrl: videoRecomendado,
      mensajeAdaptativo: esDefensa
        ? `Consejo del Sensei: Mantén tu base pesada y protege tus brazos para no regalar sumisiones.`
        : `Consejo del Sensei: No descuides la posición de tu ${articulacionLimpia}, mantén la presión antes de que tu compañero aproveche el espacio.`,
      ultimaTecnica: evaluacion.tecnicaId,
      posicionesMaestria: posicionesActualizadas,
      tecnicasEvaluadas: tecnicasEvaluadasActualizadas,
      esFalloRecurrente: false
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
