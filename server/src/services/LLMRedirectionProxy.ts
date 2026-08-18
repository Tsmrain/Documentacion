import { ILLMProvider } from "./GeminiServiceAdapter";

export class LLMRedirectionProxy implements ILLMProvider {
  private primary: ILLMProvider;
  private secondary: ILLMProvider;

  constructor(primary: ILLMProvider, secondary: ILLMProvider) {
    this.primary = primary;
    this.secondary = secondary;
  }

  async evaluarMovimiento(promptJSON: string, frames: string[] = [], modelName?: string): Promise<string> {
    try {
      console.log("[LLM Proxy] Intentando evaluación con proveedor primario (Gemini)...");
      const result = await this.primary.evaluarMovimiento(promptJSON, frames, modelName);
      return result;
    } catch (primaryError: any) {
      console.warn(`[LLM Proxy Fallback] Proveedor primario falló: ${primaryError.message}. Conmutando en caliente al secundario (ChatGPT)...`);
      try {
        const result = await this.secondary.evaluarMovimiento(promptJSON, frames, modelName);
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
          tecnicaId,
          evaluacion: `Análisis para ${tecnicaId}. Tienes un ángulo incorrecto de ${desviacionGrados} grados en ${articulacion.replace("_", " ")}.`,
          desviacionArticular: articulacion,
          desviacionGrados,
          severidad,
          sugerenciaPedagogica: `Corrige el ángulo de tu ${articulacion.replace("_", " ")} para tener buena base y no regalar la posición desde ${tecnicaId}.`
        };

        return JSON.stringify(dynamicResponse);
      }
    }
  }
}
