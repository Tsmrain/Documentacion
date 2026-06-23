import {
  MetricaCinematica,
  ErrorBiomecanico,
  PerfilBiomecanico,
  GeminiEvaluationResponse,
  CheckpointTecnico
} from '../models/types';

export class PromptBuilder {
  /**
   * Construye el prompt estructurado completo para Gemini.
   * Combina: métricas cinemáticas + checkpoints ideales + contexto RAG + reglas de BJJ.
   */
  buildPrompt(params: {
    metrics: MetricaCinematica[];
    ragContext: string[];
    perfil: PerfilBiomecanico;
    tecnicaNombre: string;
    checkpoints?: CheckpointTecnico[];
    esErrorRecurrente?: boolean;
    erroresPrevios?: ErrorBiomecanico[];
  }): string {
    const {
      metrics,
      ragContext,
      perfil,
      tecnicaNombre,
      checkpoints,
      esErrorRecurrente,
      erroresPrevios
    } = params;

    // Resumen cinemático compacto (~3KB JSON según restricción R-03)
    const metricsResumen = metrics.map(m => ({
      frame: m.frameIndex,
      art: m.articulacion,
      ang: Math.round(m.anguloMedido * 10) / 10,
      vel: Math.round(m.velocidadMedida * 10) / 10,
      acc: Math.round(m.aceleracionMedida * 10) / 10
    }));

    // Formatear checkpoints ideales si existen
    const checkpointsSection = checkpoints && checkpoints.length > 0
      ? `## CHECKPOINTS BIOMECÁNICOS IDEALES (Verdad del Tatami):
${checkpoints.map(cp => `- Fase: ${cp.fase}, Articulación: ${cp.articulacion}, Ángulo ideal: ${cp.anguloArticularIdeal}°, Tolerancia estándar: ±${cp.toleranciaGrados}°`).join('\n')}`
      : '## CHECKPOINTS BIOMECÁNICOS IDEALES: \nNo hay checkpoints numéricos preestablecidos para esta técnica. Evalúa usando principios cinemáticos universales y la literatura RAG.';

    // Contexto RAG
    const ragSection = ragContext.length > 0
      ? ragContext.join('\n---\n')
      : 'No hay fuentes RAG específicas disponibles. Evalúa según principios universales de BJJ: base, alineación, palanca, presión, y distribución de peso.';

    // Sección de error recurrente (adaptabilidad pedagógica)
    const recurrentSection = esErrorRecurrente
      ? `
## ⚠️ ALERTA: ERROR RECURRENTE DETECTADO
El practicante ha fallado en esta técnica en ${erroresPrevios?.length || 0} análisis previos.
Errores recurrentes identificados:
${erroresPrevios?.map(e => `- ${e.articulacion}: ${e.descripcionFallo} (severidad: ${e.severidad})`).join('\n') || 'N/A'}

INSTRUCCIÓN CRÍTICA: La estrategia pedagógica DEBE cambiar. En lugar de repetir la misma explicación técnica:
- Si es un error biomecánico puro → sugiere un DRILL de movilidad o fortalecimiento muscular específico.
- Si es un error conceptual → sugiere una explicación anatómica detallada o video explicativo lento.
- NO repitas recomendaciones que ya fueron dadas anteriormente.
`
      : '';

    // Calcular ajuste de umbral según perfil biomecánico (regla RD-02)
    const ajusteBiotipo = this.calcularAjusteBiotipo(perfil);

    const prompt = `Eres un instructor experto de Brazilian Jiu-Jitsu con 20 años de experiencia en análisis biomecánico y táctico.
Evalúa la ejecución de la técnica: "${tecnicaNombre}" basándote en las fuentes técnicas y directrices de nuestro sistema.

## DATOS DEL PRACTICANTE (PERFIL BIOMECÁNICO)
- Altura: ${perfil.altura}m
- Peso: ${perfil.peso}kg
- Longitud de brazos (envergadura): ${perfil.longitudBrazos}cm
- Longitud de piernas: ${perfil.longitudPiernas}cm
- Rangos de movilidad articular: ${JSON.stringify(perfil.rangoMovilidadArticular)}
- Ajuste de tolerancia por biotipo: ${ajusteBiotipo}% (Regla RD-02)

## MÉTRICAS CINEMÁTICAS MEDIDAS (Resumen compacto de landmarks)
${JSON.stringify(metricsResumen, null, 2)}

${checkpointsSection}

## CONTEXTO DE CONOCIMIENTO (RAG - FUENTES DINÁMICAS CARGADAS POR LOS USUARIOS)
Los siguientes fragmentos y directrices técnicas provienen de manuales, libros y transcripciones de videos que los usuarios han subido al RAG:
${ragSection}

## REGLAS DE EVALUACIÓN
1. Identifica desviaciones angulares comparando los checkpoints o la literatura provista en el contexto RAG.
2. Identifica a ambos luchadores en la secuencia (Top Fighter y Bottom Fighter).
3. Evalúa a cada luchador por separado en el array "fighters":
   - "role": Identificador visual/táctico del luchador (ej. "Top Fighter (White Gi)", "Bottom Fighter (Blue Gi)").
   - "status": "approved" si ejecuta la postura correcta según su rol, "correction_needed" si comete errores graves.
   - "summary": Resumen de 1-2 frases describiendo su acción táctica y control.
   - "techniques": Lista de técnicas BJJ observadas para este luchador (máximo 3).
   - "mistakes": Errores biomecánicos o conceptuales cometidos por este luchador (máximo 3, vacío si es aprobado).
   - "tips": Consejos prácticos extraídos de las fuentes RAG para mejorar la técnica (máximo 3).
   - "reference": Citación precisa basada en las fuentes RAG de donde se extrajo la recomendación. Debe incluir "book": "Nombre del manual/libro de la fuente RAG (por ejemplo, el título de la fuente)", "technique": "Sección o técnica de la fuente", "belt": "Nivel estimado (Blanco/Azul/Morado/Marrón/Negro)", y "quote": "Frase clave o concepto de la fuente".
   - "youtube_query": Término de búsqueda optimizado para encontrar este tutorial en YouTube (ej. "BJJ mount survival technique tutorial").
4. Mantén los textos en "fighters" claros, concisos y profesionales en español.
5. Inyecta el diagnóstico general y los errores biomecánicos individuales de las articulaciones en el formato JSON principal.
6. CONCISIÓN EXTREMA EN LOS DETALLES BIOMECÁNICOS GENERALES:
   - En "errores.descripcion": frase corta (máximo 15 palabras).
   - En "errores.recomendacion": recomendación correctiva concisa (máximo 20 palabras).
   - En "recomendacionAdaptativa.contenido": texto pedagógico corto (máximo 2 párrafos cortos, no más de 80 palabras). Si hay un video RAG o youtube inyectado, colócalo en su propia línea al final como "Video de soporte: https://www.youtube.com/watch?v=...".
   - En "puntosFuertes": máximo 3 puntos, de no más de 10 palabras cada uno.
${recurrentSection}

RESPONDE ÚNICAMENTE con el siguiente objeto JSON (sin texto adicional, sin markdown, sin bloques de código). 
IMPORTANTE: Asegúrate de que el JSON sea estrictamente válido. Cualquier salto de línea dentro de los valores de texto (como en las explicaciones o recomendaciones) DEBE ser representado con el carácter de escape '\\n':
{
  "puntuacionGeneral": <número de 0 a 100>,
  "errores": [
    {
      "articulacion": "<nombre de la articulación>",
      "anguloMedido": <número>,
      "anguloIdeal": <número>,
      "desviacion": <número>,
      "severidad": "<leve|moderado|critico>",
      "descripcion": "<descripción clara en español del error>",
      "recomendacion": "<recomendación correctiva>"
    }
  ],
  "puntosFuertes": ["<lista de aspectos positivos>"],
  "recomendacionAdaptativa": {
    "tipoEstrategia": "<tecnica|drill|explicacion_anatomica>",
    "contenido": "<resumen pedagógico adaptativo con el enlace de YouTube si aplica>"
  },
  "proximaTecnicaSugerida": "<siguiente técnica a practicar>",
  "fighters": [
    {
      "role": "<Top Fighter (...) o Bottom Fighter (...)>",
      "status": "<approved|correction_needed>",
      "summary": "<resumen de su ejecución en español>",
      "techniques": ["<técnica 1>", "<técnica 2>"],
      "mistakes": ["<error 1>", "<error 2>"],
      "tips": ["<consejo 1>", "<consejo 2>"],
      "reference": {
        "book": "Jiu-Jitsu University",
        "technique": "<ID Sección + Nombre de la TOC>",
        "belt": "<White|Blue|Purple|Brown|Black>",
        "quote": "<frase célebre o concepto clave del manual>"
      },
      "youtube_query": "<búsqueda optimizada de YouTube>"
    }
  ]
}`;

    return prompt;
  }

  private calcularAjusteBiotipo(perfil: PerfilBiomecanico): number {
    if (!perfil.rangoMovilidadArticular) return 0;

    const rangos = Object.values(perfil.rangoMovilidadArticular);
    if (rangos.length === 0) return 0;

    const rangoPromedioMax = rangos.reduce((sum, r) => sum + r.max, 0) / rangos.length;
    const RANGO_ESTANDAR_PROMEDIO = 140;

    if (rangoPromedioMax < RANGO_ESTANDAR_PROMEDIO * 0.8) {
      return 20;
    } else if (rangoPromedioMax < RANGO_ESTANDAR_PROMEDIO * 0.9) {
      return 10;
    }

    return 0;
  }

  validateResponse(jsonString: string): GeminiEvaluationResponse | null {
    try {
      let cleaned = jsonString.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      }
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }
      cleaned = cleaned.trim();

      const parsed = JSON.parse(cleaned);

      if (
        typeof parsed.puntuacionGeneral !== 'number' ||
        parsed.puntuacionGeneral < 0 ||
        parsed.puntuacionGeneral > 100
      ) {
        return null;
      }

      if (!Array.isArray(parsed.errores)) {
        return null;
      }

      if (!parsed.recomendacionAdaptativa || !parsed.recomendacionAdaptativa.tipoEstrategia) {
        return null;
      }

      if (!Array.isArray(parsed.puntosFuertes)) {
        parsed.puntosFuertes = [];
      }

      if (!parsed.proximaTecnicaSugerida) {
        parsed.proximaTecnicaSugerida = '';
      }

      for (const error of parsed.errores) {
        if (!error.articulacion || typeof error.severidad !== 'string') {
          return null;
        }
        error.severidad = error.severidad.toLowerCase();
        if (!['leve', 'moderado', 'critico'].includes(error.severidad)) {
          error.severidad = 'moderado';
        }
      }

      if (!parsed.fighters || !Array.isArray(parsed.fighters)) {
        parsed.fighters = [];
      }

      return parsed as GeminiEvaluationResponse;
    } catch (e) {
      console.error('Error parseando respuesta JSON de Gemini:', e);
      console.error('Respuesta original de Gemini que falló:', jsonString);
      return null;
    }
  }
}
