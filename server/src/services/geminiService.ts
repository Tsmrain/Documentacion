import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) {
      console.warn('⚠️ GeminiService: GEMINI_API_KEY is not defined in environment variables.');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private getModel(temperature: number = 0.3, responseMimeType?: string): GenerativeModel {
    return this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
        ...(responseMimeType ? { responseMimeType } : {})
      }
    });
  }

  /**
   * Clasifica la técnica de BJJ ejecutada en el video basándose en fotogramas base64.
   * Retorna el nombre de la técnica y la categoría.
   */
  async classifyTechnique(keyframes: string[]): Promise<string> {
    try {
      const model = this.getModel(0.2);
      const contents = keyframes.map((frame) => ({
        inlineData: { data: frame, mimeType: 'image/jpeg' },
      }));

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Identifica la técnica de Brazilian Jiu-Jitsu que se ejecuta en estas imágenes. Responde estrictamente con un formato JSON estructurado: { "nombre": "Nombre de la técnica", "categoria": "Guardia|Pasaje|Sumisión|Derribo|Transición|Posición Dominante|Escape" }. Si no es una técnica reconocible de BJJ, responde con { "nombre": "Desconocida", "categoria": "Desconocida" }.' },
              ...contents.map((part) => ({ inlineData: part.inlineData })),
            ],
          },
        ],
      });

      return result.response.text();
    } catch (error) {
      console.error('Error en classifyTechnique:', error);
      throw new Error('Fallo al clasificar técnica usando Gemini Vision.');
    }
  }

  /**
   * Evalúa cinemáticamente la técnica y genera una retroalimentación pedagógica
   * utilizando los checkpoints de manuales oficiales.
   */
  async evaluateMovement(prompt: string): Promise<string> {
    try {
      // Forzar formato JSON en la salida para consistencia
      const model = this.getModel(0.3, 'application/json');
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error en evaluateMovement:', error);
      throw new Error('Fallo al evaluar movimiento usando Gemini.');
    }
  }

  /**
   * Valida la relevancia de un documento/texto RAG para Jiu-Jitsu.
   */
  async validateBJJRelevance(text: string): Promise<boolean> {
    try {
      const model = this.getModel(0.1);
      const prompt = `Evalúa si el siguiente texto está relacionado estrictamente con la enseñanza, táctica, historia, reglas o técnica de Brazilian Jiu-Jitsu (BJJ) o defensa personal de lucha en el suelo. Responde únicamente "SI" o "NO". Cualquier otro deporte ajeno responder "NO".\n\nTexto:\n${text}`;
      const result = await model.generateContent(prompt);
      const answer = result.response.text().trim().toUpperCase();
      return answer.includes('SI');
    } catch (error) {
      console.error('Error en validateBJJRelevance:', error);
      return false;
    }
  }

  /**
   * Describe detalladamente una técnica no reconocida a partir de los fotogramas
   * para generar una ficha técnica automática en el RAG (Zero-Shot Learning).
   */
  async describeUnknownTechnique(keyframes: string[]): Promise<string> {
    try {
      const model = this.getModel(0.3);
      const contents = keyframes.map((frame) => ({
        inlineData: { data: frame, mimeType: 'image/jpeg' },
      }));

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Analiza detalladamente este movimiento deportivo y genera una ficha técnica del Brazilian Jiu-Jitsu. Explica el objetivo del movimiento, los pasos biomecánicos principales y describe qué ángulos articulares críticos (como codo, rodilla o cadera) se aprecian en el movimiento para que sirvan de checkpoints biomecánicos para futuros análisis.' },
              ...contents.map((part) => ({ inlineData: part.inlineData })),
            ],
          },
        ],
      });

      return result.response.text();
    } catch (error) {
      console.error('Error describiendo técnica desconocida:', error);
      throw new Error('Fallo al describir técnica desconocida usando Gemini Vision.');
    }
  }
}
