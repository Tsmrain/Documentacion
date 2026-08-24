import { ChunkText } from "./CentralVectorDBAdapter";

export interface MetricaCinematica {
  articulacion: string;
  anguloMedido: number;
  velocidadArticular: number;
  desviacionGrados: number;
}

export class DynamicPromptBuilder {
  compilarPromptRAG(metricas: MetricaCinematica[], chunks: ChunkText[], tecnicaObjetivo?: string): string {
    const metricasStr = JSON.stringify(metricas, null, 2);
    const chunksStr = chunks.map((c) => c.text).join("\n---\n");
    return JSON.stringify({
      context: "Evaluación biomecánica adaptativa basada en manuales de Jiu-Jitsu.",
      tecnica_objetivo_declarada: tecnicaObjetivo || "Detección autónoma",
      metricas_usuario: metricasStr,
      literatura_grounding: chunksStr,
      instrucciones: tecnicaObjetivo
        ? `El practicante está entrenando específicamente '${tecnicaObjetivo}'. Audita si su ejecución, postura, ángulos articulares y agarres corresponden a los estándares ideales de esta técnica según la literatura técnica proporcionada. Responde estrictamente en formato JSON.`
        : "Analiza la cinemática del usuario y clasifica la técnica ejecutada. Evalúa si se desvía del patrón ideal descrito en la literatura técnica. Responde estrictamente en formato JSON."
    });
  }

  compilarPromptBaseline(metricas: MetricaCinematica[], tecnicaObjetivo?: string): string {
    const metricasStr = JSON.stringify(metricas, null, 2);
    return JSON.stringify({
      context: "Evaluación biomecánica basada en el conocimiento nativo de Jiu-Jitsu (Modo Fallback Baseline).",
      tecnica_objetivo_declarada: tecnicaObjetivo || "Detección autónoma",
      metricas_usuario: metricasStr,
      instrucciones: tecnicaObjetivo
        ? `El practicante está entrenando específicamente '${tecnicaObjetivo}'. Audita la cinemática y ángulos articulares basándote en los principios estándar de biomecánica y palanca de Jiu-Jitsu para esta técnica. Responde estrictamente en formato JSON.`
        : "Analiza la cinemática del usuario basándote en los principios estándar de biomecánica y palanca de Jiu-Jitsu. Responde estrictamente en formato JSON."
    });
  }
}
