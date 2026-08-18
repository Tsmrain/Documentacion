import { ILLMProvider } from "./GeminiServiceAdapter";
import OpenAI from "openai";

export class ChatGPTServiceAdapter implements ILLMProvider {
  private openai: OpenAI;
  private model: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
    });
    // Usar gpt-4o-mini por defecto para ejecuciones reales, o el configurado en OPENAI_MODEL
    this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  async evaluarMovimiento(promptJSON: string, frames: string[] = [], modelName?: string): Promise<string> {
    console.log(`[ChatGPT Adapter] Evaluando movimiento con modelo ${this.model}...`);
    try {
      const messages: any[] = [
        {
          role: "system",
          content: "Eres un tutor biomecánico experto en BJJ. Evalúa el movimiento y responde ÚNICAMENTE con un JSON válido usando el esquema rígido: { tecnicaId: string, evaluacion: string, desviacionArticular: string, desviacionGrados: number, severidad: string, sugerenciaPedagogica: string }."
        },
        {
          role: "user",
          content: `Analiza este informe cinemático:\n${promptJSON}`
        }
      ];

      // Si hay soporte para frames en OpenAI y se envían, agregarlos
      if (frames && frames.length > 0) {
        const contentParts: any[] = [{ type: "text", text: `Analiza este informe cinemático:\n${promptJSON}` }];
        // Limitar a los primeros 5 frames para ahorrar tokens
        frames.slice(0, 5).forEach(frame => {
          contentParts.push({
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${frame}` }
          });
        });
        messages[1] = { role: "user", content: contentParts };
      }

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const jsonStr = response.choices[0]?.message?.content || "{}";
      console.log(`[ChatGPT Adapter] Inferencia exitosa completada por ${this.model}.`);
      return jsonStr;
    } catch (error: any) {
      console.error(`[ChatGPT Adapter Error] Falla en la comunicación con OpenAI: ${error.message}`);
      throw error;
    }
  }
}
