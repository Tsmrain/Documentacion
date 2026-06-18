// ============================================================================
// OpenBJJ - GeminiServiceAdapter (Adapter GoF)
// Implementa ILLMProvider para la API de Google Gemini
// Única comunicación externa a la nube (texto/JSON solamente)
// ============================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ILLMProvider } from '../models/types';

export class GeminiServiceAdapter implements ILLMProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;
  private maxRetries = 3;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    this.modelName = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';

    if (!apiKey) {
      console.warn(
        'GeminiServiceAdapter: API Key no configurada. Configure VITE_GEMINI_API_KEY en .env'
      );
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Envía el prompt estructurado a Gemini y retorna la respuesta.
   * Implementa reintentos automáticos (hasta 3x) ante fallos de red.
   * Solo viajan datos de texto (JSON ~3KB). Privacidad del video garantizada.
   */
  async evaluateInference(prompt: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: this.modelName,
          generationConfig: {
            temperature: 0.3, // Baja temperatura para respuestas consistentes
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json' // Forzar JSON output
          }
        });

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        if (!text || text.trim().length === 0) {
          throw new Error('Gemini retornó una respuesta vacía');
        }

        return text;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(
          `GeminiServiceAdapter: Intento ${attempt}/${this.maxRetries} fallido:`,
          lastError.message
        );

        if (attempt < this.maxRetries) {
          // Espera exponencial entre reintentos
          await this.sleep(1000 * attempt);
        }
      }
    }

    throw new Error(
      `Error de servicio de IA después de ${this.maxRetries} intentos. ${lastError?.message || 'Intente más tarde.'}`
    );
  }

  /**
   * Evalúa con fotogramas de video (multimodal).
   * Envía frames como base64 junto al prompt.
   */
  async evaluateWithFrames(
    prompt: string,
    frames: string[] // base64 encoded frames
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: this.modelName,
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'
          }
        });

        // Construir partes multimodales
        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
          { text: prompt }
        ];

        // Agregar fotogramas clave (máximo 5 para optimizar tokens)
        const selectedFrames = frames.slice(0, 5);
        for (const frame of selectedFrames) {
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: frame
            }
          });
        }

        const result = await model.generateContent(parts);
        const response = result.response;
        const text = response.text();

        if (!text || text.trim().length === 0) {
          throw new Error('Gemini retornó una respuesta vacía');
        }

        return text;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(
          `GeminiServiceAdapter multimodal: Intento ${attempt}/${this.maxRetries} fallido:`,
          lastError.message
        );

        if (attempt < this.maxRetries) {
          await this.sleep(1000 * attempt);
        }
      }
    }

    throw new Error(
      `Error de servicio de IA después de ${this.maxRetries} intentos. ${lastError?.message || 'Intente más tarde.'}`
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
