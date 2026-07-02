import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold, SchemaType } from '@google/generative-ai';
import { TECNICAS_BJJ } from '../models/types';


export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private classifierModelName: string;
  private evaluatorModelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.classifierModelName = process.env.GEMINI_CLASSIFIER_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.evaluatorModelName = process.env.GEMINI_EVALUATOR_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-pro';

    if (!apiKey) {
      console.warn('⚠️ GeminiService: GEMINI_API_KEY is not defined in environment variables.');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private getModel(
    modelName: string,
    temperature: number = 0.3,
    responseMimeType?: string,
    responseSchema?: any
  ): GenerativeModel {
    const isModel25 = modelName.includes('2.5');
    return this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        ...(responseMimeType ? { responseMimeType } : {}),
        ...(responseSchema ? { responseSchema } : {}),
        ...(isModel25 ? { thinkingConfig: { thinkingBudget: 0 } } : {})
      } as any,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE
        }
      ]
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
      const model = this.getModel(this.classifierModelName, 0.2, 'application/json');
      const contents = keyframes.map((frame) => ({
        inlineData: { data: frame, mimeType: 'image/jpeg' },
      }));

      const catalogList = TECNICAS_BJJ.map(
        (t) => `- "${t.nombre}" (ID: "${t.id}", Categoría: "${t.categoria}")`
      ).join('\n');

      const classificationPrompt = `Analiza la secuencia de fotogramas del video de Brazilian Jiu-Jitsu (BJJ).
Identifica cuál es la posición de control de BJJ predominante que se observa en las imágenes.
Debes seleccionar estrictamente una posición de nuestro catálogo de posiciones permitidas:

${catalogList}

Responde estrictamente con un objeto JSON válido con el siguiente formato:
{
  "nombre": "<Nombre exacto de la posición del catálogo, ej. 'Montada'>",
  "categoria": "<Categoría exacta de la posición del catálogo, ej. 'Posición Dominante'>"
}

Si la secuencia de imágenes no corresponde a ninguna posición conocida de nuestro catálogo con suficiente claridad, o si es una transición aérea o derribo no catalogado, responde estrictamente con:
{
  "nombre": "Desconocida",
  "categoria": "Desconocida"
}`;

      const result = await this.callWithRetry(() => model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: classificationPrompt },
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
  async evaluateMovement(
    prompt: string,
    responseMimeType?: string,
    responseSchema?: any
  ): Promise<string> {
    try {
      // Dejar que genere de forma libre o forzar JSON según se solicite
      const model = this.getModel(this.evaluatorModelName, 0.3, responseMimeType, responseSchema);
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
      const model = this.getModel(this.classifierModelName, 0.1);
      const sample = text.slice(0, 5000);
      const prompt = `Evalúa si el siguiente texto está relacionado estrictamente con la enseñanza, táctica, historia, reglas o técnica de Brazilian Jiu-Jitsu (BJJ) o defensa personal de lucha en el suelo. Responde únicamente "SI" o "NO". Cualquier otro deporte ajeno responder "NO".\n\nTexto:\n${sample}`;
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
      const model = this.getModel(this.evaluatorModelName, 0.3);
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
      const model = this.getModel(this.classifierModelName, 0.2, 'application/json');
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
      
      const model = this.getModel(this.classifierModelName, 0.2, 'application/json');
      
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

export const evaluationResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    puntuacionGeneral: {
      type: SchemaType.INTEGER,
      description: "Puntuación general del movimiento (0 a 100). Dinámica, restando 15 por cada error crítico, 8 por moderado y 4 por leve."
    },
    errores: {
      type: SchemaType.ARRAY,
      description: "Desviaciones biomecánicas detectadas en las articulaciones",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          articulacion: { type: SchemaType.STRING, description: "Articulación afectada (ej: espalda, codo, rodilla, cadera, hombro)" },
          anguloMedido: { type: SchemaType.NUMBER, description: "Ángulo articular medido del video" },
          anguloIdeal: { type: SchemaType.NUMBER, description: "Ángulo ideal establecido" },
          desviacion: { type: SchemaType.NUMBER, description: "Diferencia absoluta entre el medido y el ideal" },
          severidad: { type: SchemaType.STRING, description: "Severidad del desvío (leve, moderado o critico)" },
          descripcion: { type: SchemaType.STRING, description: "Explicación corta (máximo 15 palabras) del error en español" },
          recomendacion: { type: SchemaType.STRING, description: "Recomendación correctiva concisa (máximo 20 palabras) en español" }
        },
        required: ["articulacion", "anguloMedido", "anguloIdeal", "desviacion", "severidad", "descripcion", "recomendacion"]
      }
    },
    puntosFuertes: {
      type: SchemaType.ARRAY,
      description: "Hasta 3 aspectos positivos de la postura o control del practicante",
      items: { type: SchemaType.STRING }
    },
    recomendacionAdaptativa: {
      type: SchemaType.OBJECT,
      description: "Recomendación pedagógica según recurrencia",
      properties: {
        tipoEstrategia: { type: SchemaType.STRING, description: "Tipo de estrategia sugerida (tecnica, drill, explicacion_anatomica)" },
        contenido: { type: SchemaType.STRING, description: "Explicación corta adaptada (máximo 80 palabras) en español" }
      },
      required: ["tipoEstrategia", "contenido"]
    },
    proximaTecnicaSugerida: { type: SchemaType.STRING, description: "Siguiente posición/movimiento recomendado en la ruta de aprendizaje" },
    fighters: {
      type: SchemaType.ARRAY,
      description: "Análisis táctico y de control posicional para cada luchador",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          role: { type: SchemaType.STRING, description: "Rol e identificación visual del luchador (ej. Top Fighter (White Gi))" },
          status: { type: SchemaType.STRING, description: "Estado posicional (approved o correction_needed)" },
          summary: { type: SchemaType.STRING, description: "Breve descripción táctica del rol y base en español" },
          techniques: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Posiciones de BJJ observadas (máx 3)" },
          mistakes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Errores de base o presión (máx 3)" },
          tips: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Consejos de base o escape extraídos del RAG (máx 3)" },
          reference: {
            type: SchemaType.OBJECT,
            description: "Cita del libro o manual del RAG en el que se apoya la corrección",
            properties: {
              book: { type: SchemaType.STRING, description: "Nombre del libro/manual" },
              technique: { type: SchemaType.STRING, description: "Sección o técnica de la referencia" },
              belt: { type: SchemaType.STRING, description: "Cinturón de la referencia (White/Blue/Purple/Brown/Black)" },
              quote: { type: SchemaType.STRING, description: "Frase textual o concept clave del manual" }
            },
            required: ["book", "technique", "belt", "quote"]
          },
          youtube_query: { type: SchemaType.STRING, description: "Búsqueda optimizada de YouTube para su situación" }
        },
        required: ["role", "status", "summary", "techniques", "mistakes", "tips", "reference", "youtube_query"]
      }
    }
  },
  required: ["puntuacionGeneral", "errores", "puntosFuertes", "recomendacionAdaptativa", "proximaTecnicaSugerida", "fighters"]
};

