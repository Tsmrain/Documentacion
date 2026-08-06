import { ChunkText } from "./CentralVectorDBAdapter";

export interface MetricaCinematica {
  articulacion: string;
  anguloMedido: number;
  velocidadArticular: number;
  desviacionGrados: number;
}

export class DynamicPromptBuilder {
  compilarPromptRAG(metricas: MetricaCinematica[], chunks: ChunkText[]): string {
    const metricasStr = JSON.stringify(metricas, null, 2);
    const chunksStr = chunks.map((c) => c.text).join("\n---\n");
    return JSON.stringify({
      context: "Evaluación biomecánica adaptativa basada en manuales de Jiu-Jitsu.",
      metricas_usuario: metricasStr,
      literatura_grounding: chunksStr,
      instrucciones: "Analiza si la cinemática del usuario se desvía del patrón ideal descrito en la literatura técnica. Responde estrictamente en formato JSON."
    });
  }

  compilarPromptBaseline(metricas: MetricaCinematica[]): string {
    const metricasStr = JSON.stringify(metricas, null, 2);
    return JSON.stringify({
      context: "Evaluación biomecánica basada en el conocimiento nativo de Jiu-Jitsu (Modo Fallback Baseline).",
      metricas_usuario: metricasStr,
      instrucciones: "Analiza la cinemática del usuario basándote en los principios estándar de biomecánica y palanca de Jiu-Jitsu. Responde estrictamente en formato JSON."
    });
  }
}
