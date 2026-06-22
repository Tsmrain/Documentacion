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

  private async callWithRetry(fn: () => Promise<any>, retries = 3, delay = 1500): Promise<any> {
    try {
      return await fn();
    } catch (error: any) {
      const errorMsg = error.message || '';
      const status = error.status;
      const isTransient = status === 503 || status === 429 || errorMsg.includes('503') || errorMsg.includes('429') || errorMsg.toLowerCase().includes('high demand') || errorMsg.toLowerCase().includes('service unavailable');
      
      if (isTransient && retries > 0) {
        console.warn(`⚠️ Gemini API transient error (status ${status || 'unknown'}). Retrying in ${delay}ms... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callWithRetry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  /**
   * Clasifica la técnica de BJJ ejecutada en el video basándose en fotogramas base64.
   * Retorna el nombre de la técnica y la categoría.
   */
  async classifyTechnique(keyframes: string[]): Promise<string> {
    try {
      const model = this.getModel(0.2, 'application/json');
      const contents = keyframes.map((frame) => ({
        inlineData: { data: frame, mimeType: 'image/jpeg' },
      }));

      const result = await this.callWithRetry(() => model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Identifica la técnica de Brazilian Jiu-Jitsu que se ejecuta en estas imágenes. Responde estrictamente con un formato JSON estructurado: { "nombre": "Nombre de la técnica", "categoria": "Guardia|Pasaje|Sumisión|Derribo|Transición|Posición Dominante|Escape" }. Si no es una técnica reconocible de BJJ, responde con { "nombre": "Desconocida", "categoria": "Desconocida" }.' },
              ...contents.map((part) => ({ inlineData: part.inlineData })),
            ],
          },
        ],
      }));

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
      const result = await this.callWithRetry(() => model.generateContent(prompt));
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
      const result = await this.callWithRetry(() => model.generateContent(prompt));
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

      const result = await this.callWithRetry(() => model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Analiza detalladamente este movimiento deportivo y genera una ficha técnica del Brazilian Jiu-Jitsu. Explica el objetivo del movimiento, los pasos biomecánicos principales y describe qué ángulos articulares críticos (como codo, rodilla o cadera) se aprecian en el movimiento para que sirvan de checkpoints biomecánicos para futuros análisis.' },
              ...contents.map((part) => ({ inlineData: part.inlineData })),
            ],
          },
        ],
      }));

      return result.response.text();
    } catch (error) {
      console.error('Error describiendo técnica desconocida:', error);
      throw new Error('Fallo al describir técnica desconocida usando Gemini Vision.');
    }
  }

  /**
   * Analiza el contenido del texto para extraer un título conciso y
   * clasificar TODAS las técnicas o reglas de BJJ asociadas de forma autónoma.
   */
  async analyzeSourceContent(text: string, fallbackTitle: string): Promise<{ titulo: string; tecnicas: string[] }> {
    try {
      const model = this.getModel(0.2, 'application/json');
      const sample = text.slice(0, 4000); // Mayor muestra para detectar múltiples técnicas si existen
      const prompt = `Analiza el siguiente extracto de texto de Brazilian Jiu-Jitsu (BJJ).
Identifica un título conciso, profesional y representativo de la fuente de información (máximo 7 palabras).
Además, clasifica a qué técnicas o reglas conocidas de BJJ pertenece el contenido. Como un libro, manual o video puede contener múltiples técnicas o reglas, identifica todas las que correspondan.
Las técnicas conocidas de nuestro catálogo son:
- guardia-cerrada (Guardia Cerrada)
- montada (Montada)
- control-lateral (Control Lateral / Side Control)
- escape-montada (Escape de Montada / Upa)
- raspado-tijera (Raspado de Tijera / Scissor Sweep)
- armbar (Armbar / Llave de Brazo)
- triangle-choke (Triángulo / Triangle Choke)
- pasaje-guardia (Pasaje de Guardia)

Si el contenido describe otra técnica o regla de BJJ que no está en la lista, incluye un identificador en minúsculas y separado por guiones (ej. "omoplata", "regla-puntos").
Si es puramente general, reglamentario o cubre de forma introductoria el deporte sin enfocarse en técnicas específicas, responde con ["general"].

Responde estrictamente en formato JSON con la siguiente estructura:
{
  "titulo": "Título de la Fuente",
  "tecnicas": ["identificador-tecnica-1", "identificador-tecnica-2"]
}

Extracto de texto:
${sample}`;

      const result = await this.callWithRetry(() => model.generateContent(prompt));
      let responseText = result.response.text().trim();
      
      if (responseText.startsWith('```json')) responseText = responseText.slice(7);
      if (responseText.startsWith('```')) responseText = responseText.slice(3);
      if (responseText.endsWith('```')) responseText = responseText.slice(0, -3);
      responseText = responseText.trim();

      const parsed = JSON.parse(responseText);
      let tecnicas = parsed.tecnicas || [];
      if (!Array.isArray(tecnicas)) {
        tecnicas = [tecnicas];
      }
      if (tecnicas.length === 0) {
        tecnicas = ['general'];
      }

      return {
        titulo: parsed.titulo || fallbackTitle,
        tecnicas: tecnicas.map((t: string) => String(t).trim().toLowerCase())
      };
    } catch (err) {
      console.error('Error en analyzeSourceContent:', err);
      return {
        titulo: fallbackTitle,
        tecnicas: ['general']
      };
    }
  }

  /**
   * Clasifica de forma inteligente cada chunk de texto de Jiu-Jitsu en base a su contenido.
   * Retorna un arreglo de técnica IDs correspondiente a cada chunk.
   */
  async classifyChunks(chunks: string[]): Promise<string[]> {
    try {
      if (chunks.length === 0) return [];
      
      const model = this.getModel(0.2, 'application/json');
      
      // Mapeamos los chunks en un formato compacto para el prompt
      const chunksText = chunks.map((c, i) => `[Chunk ${i}]:\n${c.slice(0, 1000)}`).join('\n\n');
      
      const prompt = `Analiza los siguientes fragmentos de texto (chunks) numerados del 0 al ${chunks.length - 1} extraídos de una fuente de Brazilian Jiu-Jitsu (BJJ).
Para cada uno, clasifica qué técnica o regla de BJJ describe principalmente.
Técnicas conocidas:
- guardia-cerrada
- montada
- control-lateral
- escape-montada
- raspado-tijera
- armbar
- triangle-choke
- pasaje-guardia

Si el fragmento describe otra técnica o regla específica de BJJ que no está en la lista anterior, responde con un identificador en minúsculas y guiones (ej. "omoplata", "regla-puntos").
Si el fragmento es general, de introducción, reglas generales, o describe múltiples técnicas sin enfocarse en una, responde con "general".

Responde estrictamente en formato JSON con la siguiente estructura (sin markdown ni texto adicional):
{
  "clasificaciones": [
    { "index": 0, "tecnicaId": "identificador-de-tecnica" },
    ...
  ]
}

Fragmentos a clasificar:
${chunksText}`;

      const result = await this.callWithRetry(() => model.generateContent(prompt));
      let responseText = result.response.text().trim();
      
      if (responseText.startsWith('```json')) responseText = responseText.slice(7);
      if (responseText.startsWith('```')) responseText = responseText.slice(3);
      if (responseText.endsWith('```')) responseText = responseText.slice(0, -3);
      responseText = responseText.trim();

      const parsed = JSON.parse(responseText);
      const classifications = parsed.clasificaciones || [];
      
      // Crear un mapeo por index
      const mappedTecnicas = new Array(chunks.length).fill('general');
      for (const item of classifications) {
        if (item.index !== undefined && item.index >= 0 && item.index < chunks.length) {
          mappedTecnicas[item.index] = (item.tecnicaId || 'general').trim().toLowerCase();
        }
      }
      return mappedTecnicas;
    } catch (err) {
      console.error('Error en classifyChunks:', err);
      // Fallback a "general" para todos los chunks
      return new Array(chunks.length).fill('general');
    }
  }
}
