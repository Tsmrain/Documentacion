import { ILLMProvider } from "./GeminiServiceAdapter";

export class LLMRedirectionProxy implements ILLMProvider {
  private primary: ILLMProvider;
  private secondary: ILLMProvider;

  constructor(primary: ILLMProvider, secondary: ILLMProvider) {
    this.primary = primary;
    this.secondary = secondary;
  }

  async evaluarMovimiento(
    promptJSON: string,
    frames: string[] = [],
    modelName?: string,
    catalogoTecnicas?: string[],
    tecnicaObjetivo?: string,
    rolPracticante?: string
  ): Promise<string> {
    try {
      console.log("[LLM Proxy] Intentando evaluación con proveedor primario (Gemini)...");
      const result = await this.primary.evaluarMovimiento(promptJSON, frames, modelName, catalogoTecnicas, tecnicaObjetivo, rolPracticante);
      return result;
    } catch (primaryError: any) {
      console.warn(`[LLM Proxy Fallback] Proveedor primario falló: ${primaryError.message}. Conmutando en caliente al secundario (ChatGPT)...`);
      try {
        const result = await this.secondary.evaluarMovimiento(promptJSON, frames, modelName, catalogoTecnicas, tecnicaObjetivo, rolPracticante);
        return result;
      } catch (secondaryError: any) {
        console.error(`[LLM Proxy Error] Ambos proveedores fallaron. Generando respuesta determinista de emergencia local.`);
        
        // Extraer info basica del promptJSON si es posible
        let tecnicaId = "guardia-cerrada";
        let desviacionGrados = 20;
        let articulacion = "codo_derecho";
        try {
          const parsedPrompt = JSON.parse(promptJSON);
          if (parsedPrompt.tecnicaId) tecnicaId = parsedPrompt.tecnicaId;
          if (parsedPrompt.metricas && parsedPrompt.metricas.length > 0) {
            articulacion = parsedPrompt.metricas[0].articulacion || articulacion;
            desviacionGrados = parsedPrompt.metricas[0].desviacionGrados || desviacionGrados;
          }
        } catch (e) {
          // noop
        }

        let severidad = "Leve";
        if (desviacionGrados > 30) severidad = "Critico";
        else if (desviacionGrados >= 16) severidad = "Moderado";

        const dynamicResponse = {
          secuenciaTemporalAnalizada: [
            "Frame 1 a N: Análisis biomecánico de emergencia generado localmente por fallo temporal de red."
          ],
          tecnicaId,
          posicionBase: "Tatami / Suelo",
          fasesSecuencia: ["Inicio del Movimiento", "Transición Técnica", "Control de Posición"],
          cinturon: "BLANCO",
          evaluacion: `Análisis para ${tecnicaId}. Tienes un ángulo incorrecto de ${desviacionGrados} grados en ${articulacion.replace("_", " ")}.`,
          desviacionArticular: articulacion,
          desviacionGrados,
          severidad,
          sugerenciaPedagogica: `1. Corrige el ángulo de tu ${articulacion.replace("_", " ")}. 2. Cierra los espacios libres. 3. Mantén una base sólida.`,
          youtube_query: `Tutorial BJJ ${tecnicaId} detalles tecnicos`
        };

        return JSON.stringify(dynamicResponse);
      }
    }
  }
}
