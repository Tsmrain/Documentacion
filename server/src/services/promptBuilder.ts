import {
  MetricaCinematica,
  ErrorBiomecanico,
  PerfilBiomecanico,
  GeminiEvaluationResponse
} from '../models/types';

export class PromptBuilder {
  /**
   * Construye el prompt estructurado completo para Gemini.
   * Combina: métricas cinemáticas + contexto RAG + reglas de evaluación BJJ.
   */
  buildPrompt(params: {
    metrics: MetricaCinematica[];
    ragContext: string[];
    perfil: PerfilBiomecanico;
    tecnicaNombre: string;
    esErrorRecurrente?: boolean;
    erroresPrevios?: ErrorBiomecanico[];
  }): string {
    const {
      metrics,
      ragContext,
      perfil,
      tecnicaNombre,
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

    const prompt = `Eres un instructor experto de Brazilian Jiu-Jitsu con 20 años de experiencia en análisis biomecánico.
Evalúa la ejecución técnica del practicante para la técnica: "${tecnicaNombre}".

## DATOS DEL PRACTICANTE (PERFIL BIOMECÁNICO)
- Altura: ${perfil.altura}m
- Peso: ${perfil.peso}kg
- Longitud de brazos (envergadura): ${perfil.longitudBrazos}cm
- Longitud de piernas: ${perfil.longitudPiernas}cm
- Rangos de movilidad articular: ${JSON.stringify(perfil.rangoMovilidadArticular)}
- Ajuste de tolerancia por biotipo: ${ajusteBiotipo}% (Regla RD-02: se flexibiliza hasta 20% si hay limitaciones)

## MÉTRICAS CINEMÁTICAS MEDIDAS (Resumen compacto)
Las siguientes métricas fueron extraídas localmente del video del practicante mediante landmarks 3D:
${JSON.stringify(metricsResumen, null, 2)}

## CONTEXTO TÉCNICO DE MANUALES OFICIALES (RAG - FUENTES VALIDADAS)
Los siguientes fragmentos provienen de manuales oficiales y videos validados por instructores certificados:
${ragSection}

## REGLAS DE EVALUACIÓN BIOMECÁNICA
1. Identifica desviaciones angulares respecto al patrón ideal definido en las fuentes RAG.
2. Clasifica los errores según severidad:
   - **Leve**: desviación ≤ 15° (considerando ajuste de biotipo)
   - **Moderado**: desviación entre 15° y 30°
   - **Crítico**: desviación > 30° o error recurrente en el historial del practicante
3. IMPORTANTE (Regla RD-02): Considera el biotipo del practicante. Si tiene limitaciones de movilidad registradas, flexibiliza el umbral angular hasta un ${ajusteBiotipo}%.
4. Basa tu evaluación ESTRICTAMENTE en las fuentes RAG proporcionadas arriba. No inventes técnicas ni referencias que no estén en el contexto.
5. Cita textualmente las recomendaciones de las fuentes RAG cuando sea posible.
${recurrentSection}

RESPONDE ÚNICAMENTE con el siguiente objeto JSON (sin texto adicional, sin markdown, sin bloques de código):
{
  "puntuacionGeneral": <número de 0 a 100>,
  "errores": [
    {
      "articulacion": "<nombre de la articulación>",
      "anguloMedido": <número>,
      "anguloIdeal": <número>,
      "desviacion": <número>,
      "severidad": "<leve|moderado|critico>",
      "descripcion": "<descripción clara del error en español>",
      "recomendacion": "<recomendación específica citando fuentes RAG>"
    }
  ],
  "puntosFuertes": ["<lista de aspectos positivos de la ejecución>"],
  "recomendacionAdaptativa": {
    "tipoEstrategia": "<tecnica|drill|explicacion_anatomica>",
    "contenido": "<descripción detallada y accionable de lo que debe hacer el practicante>"
  },
  "proximaTecnicaSugerida": "<nombre de la siguiente técnica a practicar según progresión>"
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

      return parsed as GeminiEvaluationResponse;
    } catch (e) {
      console.error('Error parseando respuesta JSON de Gemini:', e);
      return null;
    }
  }
}
