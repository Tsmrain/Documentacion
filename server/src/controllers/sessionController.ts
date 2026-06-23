import { Request, Response } from 'express';
import { GeminiService } from '../services/geminiService';
import { EmbeddingService } from '../services/embeddingService';
import { VectorStore } from '../services/vectorStore';
import { PersistenceService } from '../services/persistenceService';
import { PromptBuilder } from '../services/promptBuilder';
import { TECNICAS_BJJ, ErrorBiomecanico } from '../models/types';

export class SessionController {
  private geminiService: GeminiService;
  private embeddingService: EmbeddingService;
  private vectorStore: VectorStore;
  private persistence: PersistenceService;
  private promptBuilder: PromptBuilder;

  constructor() {
    this.geminiService = new GeminiService();
    this.embeddingService = new EmbeddingService();
    this.vectorStore = new VectorStore();
    this.persistence = new PersistenceService();
    this.promptBuilder = new PromptBuilder();
  }

  /**
   * Procesa la captura de video enviada por el cliente:
   * 1. Clasifica y autodetecta la técnica utilizando Gemini Vision (multimodal).
   * 2. Si es una técnica nueva, aplica el flujo Zero-Shot Discovery para guardarla e indexarla.
   * 3. Recupera grounding RAG desde ChromaDB.
   * 4. Combina perfil de usuario, historial de errores y checkpoints técnicos.
   * 5. Llama a Gemini para evaluar el movimiento.
   * 6. Persiste el análisis en SQLite.
   */
  analyzeVideo = async (req: Request, res: Response) => {
    try {
      const { frames, metrics, userId } = req.body;
      const activeUserId = userId || 'default';

      if (!frames || frames.length === 0) {
        return res.status(400).json({ error: 'Se requieren fotogramas clave (frames) para la autodetección de la técnica.' });
      }

      // 1. Obtener datos del usuario
      const usuario = await this.persistence.getUser(activeUserId);
      const perfil = usuario.perfilBiomecanico;

      // 2. Autodetectar técnica usando Gemini Vision
      console.log('🤖 Clasificando técnica de video usando Gemini Vision...');
      let techniqueName = '';
      let techniqueCategory = '';

      try {
        const classificationResponse = await this.geminiService.classifyTechnique(frames);
        
        let cleaned = classificationResponse.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
        if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
        cleaned = cleaned.trim();

        const parsedClass = JSON.parse(cleaned);
        techniqueName = parsedClass.nombre || 'Técnica Desconocida';
        techniqueCategory = parsedClass.categoria || 'Transición';
      } catch (e) {
        console.warn('Fallo al clasificar técnica por Gemini, usando valores por defecto:', e);
        techniqueName = 'Técnica Desconocida';
        techniqueCategory = 'Transición';
      }

      // Crear slug ID para la técnica
      const tecnicaId = techniqueName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      console.log(`🤖 Técnica detectada: "${techniqueName}" (ID: ${tecnicaId}, Categoría: ${techniqueCategory})`);

      // 3. Buscar técnica en SQLite. Si no existe -> Zero-Shot Discovery
      let tecnica = await this.persistence.getTecnica(tecnicaId);

      if (!tecnica) {
        console.log(`🔍 Técnica "${techniqueName}" no registrada en SQLite. Iniciando Zero-Shot Discovery...`);
        let descripcion = '';
        let checkpoints: any[] = [];

        try {
          const discoveryPrompt = `Analiza detalladamente este movimiento deportivo de Brazilian Jiu-Jitsu.
Genera una descripción biomecánica del movimiento y define un array de checkpoints críticos.
Responde únicamente en formato JSON con la siguiente estructura (no agregues texto adicional ni markdown):
{
  "nombre": "${techniqueName}",
  "categoria": "${techniqueCategory}",
  "cinturonRequerido": "Blanco",
  "descripcion": "Descripción detallada del movimiento y sus objetivos...",
  "checkpoints": [
    { "fase": "Control", "articulacion": "cadera", "anguloArticularIdeal": 90, "toleranciaGrados": 15 },
    { "fase": "Base", "articulacion": "rodilla", "anguloArticularIdeal": 45, "toleranciaGrados": 15 }
  ]
}`;
          const discoveryResponse = await this.geminiService.evaluateMovement(discoveryPrompt);
          
          let cleanedDisc = discoveryResponse.trim();
          if (cleanedDisc.startsWith('```json')) cleanedDisc = cleanedDisc.slice(7);
          if (cleanedDisc.startsWith('```')) cleanedDisc = cleanedDisc.slice(3);
          if (cleanedDisc.endsWith('```')) cleanedDisc = cleanedDisc.slice(0, -3);
          cleanedDisc = cleanedDisc.trim();

          const parsedDisc = JSON.parse(cleanedDisc);
          descripcion = parsedDisc.descripcion || '';
          checkpoints = parsedDisc.checkpoints || [];
        } catch (err) {
          console.error('Zero-Shot Discovery falló, creando datos por defecto:', err);
          descripcion = `Descripción biomecánica autogenerada para la técnica ${techniqueName}.`;
          checkpoints = [
            { fase: 'Postura', articulacion: 'espalda', anguloArticularIdeal: 170, toleranciaGrados: 15 },
            { fase: 'Base', articulacion: 'cadera', anguloArticularIdeal: 90, toleranciaGrados: 15 }
          ];
        }

        // Guardar en la base de datos relacional
        await this.persistence.saveCustomTecnica({
          id: tecnicaId,
          nombre: techniqueName,
          categoria: techniqueCategory,
          cinturonRequerido: 'Blanco',
          checkpoints,
          descripcion
        });

        // Indexar en la base de datos vectorial ChromaDB para RAG futuro
        try {
          const chunkId = `discovered-${tecnicaId}`;
          const embedding = await this.embeddingService.generateEmbedding(descripcion);
          await this.vectorStore.ingestChunk(chunkId, descripcion, embedding, {
            fuenteId: 9999, // ID convencional para Zero-Shot Discovery
            tecnicaId,
            tipoRecurso: 'tecnica',
            estadoValidacion: 'Validado',
            titulo: `Autodescubrimiento: ${techniqueName}`
          });
        } catch (err) {
          console.error('Error indexando descripción Zero-Shot en ChromaDB:', err);
        }

        // Cargar técnica recién creada
        tecnica = await this.persistence.getTecnica(tecnicaId);
      }

      // 4. Comprobar historial del usuario y recurrencia de errores
      const historial = await this.persistence.getAnalysisByTecnica(activeUserId, tecnicaId);
      const esRecurrente = this.detectRecurrentErrors(historial, tecnicaId);
      const erroresPrevios = this.getRecentErrors(historial);

      // 5. Consultar grounding RAG centralizado
      const ragContext = await this.getContextPrompts(tecnicaId, esRecurrente, techniqueName);

      // 6. Construir prompt dinámico inyectando checkpoints y RAG
      const prompt = this.promptBuilder.buildPrompt({
        metrics: metrics || [],
        ragContext,
        perfil,
        tecnicaNombre: techniqueName,
        checkpoints: tecnica ? tecnica.checkpoints : [],
        esErrorRecurrente: esRecurrente,
        erroresPrevios
      });

      // 7. Evaluar con Gemini
      console.log('🤖 Generando evaluación biomecánica con Gemini...');
      const responseText = await this.geminiService.evaluateMovement(prompt);

      // 8. Validar y estructurar respuesta JSON
      const parsed = this.promptBuilder.validateResponse(responseText);
      if (!parsed) {
        return res.status(422).json({ error: 'La respuesta de la IA no pudo ser parseada al esquema JSON esperado.' });
      }

      // 9. Guardar análisis biomecánico en SQLite
      const analisis = await this.persistence.saveAnalysis(activeUserId, {
        tecnicaId,
        tecnicaNombre: techniqueName,
        puntuacionGeneral: parsed.puntuacionGeneral,
        puntosFuertes: parsed.puntosFuertes,
        proximaTecnicaSugerida: parsed.proximaTecnicaSugerida,
        recomendacionAdaptativa: parsed.recomendacionAdaptativa,
        fighters: parsed.fighters || [],
        metricas: metrics || [],
        errores: parsed.errores.map((e: any) => ({
          articulacion: e.articulacion,
          anguloMedido: e.anguloMedido,
          anguloIdeal: e.anguloIdeal,
          desviacion: e.desviacion,
          severidad: e.severidad,
          descripcionFallo: e.descripcion,
          esRecurrente: esRecurrente,
          recomendacion: e.recomendacion
        }))
      });

      // 10. Actualizar ruta de aprendizaje si hay estancamiento
      if (esRecurrente) {
        const rutaActualizada = { ...usuario.rutaAprendizaje };
        if (!rutaActualizada.tecnicasEstancadas.includes(tecnicaId)) {
          rutaActualizada.tecnicasEstancadas.push(tecnicaId);
        }
        rutaActualizada.estadoPedagogicoActual = `Adaptando: ${techniqueName}`;

        await this.persistence.saveUser(activeUserId, {
          tecnicasEstancadas: rutaActualizada.tecnicasEstancadas,
          estadoPedagogicoActual: rutaActualizada.estadoPedagogicoActual
        });
      }

      res.json(analisis);
    } catch (error) {
      console.error('Error procesando análisis de video:', error);
      res.status(500).json({ error: 'Error interno del servidor al analizar la sesión.' });
    }
  };

  /**
   * Registra la confirmación de visualización de un video (CU10).
   */
  registerVideoView = async (req: Request, res: Response) => {
    try {
      const { videoUrl, tecnicaId, userId } = req.body;
      const activeUserId = userId || 'default';

      if (!videoUrl || !tecnicaId) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios: videoUrl y tecnicaId.' });
      }

      console.log(`🎥 Registrando visualización de video para usuario "${activeUserId}" en técnica "${tecnicaId}"...`);
      const record = await this.persistence.saveVideoView(activeUserId, videoUrl, tecnicaId);

      // Si el video fue visto, actualizamos la ruta de aprendizaje
      const usuario = await this.persistence.getUser(activeUserId);
      const ruta = usuario.rutaAprendizaje;
      ruta.estadoPedagogicoActual = `Estudio completado para técnica ${tecnicaId}`;
      
      await this.persistence.saveUser(activeUserId, {
        estadoPedagogicoActual: ruta.estadoPedagogicoActual
      });

      res.json({ success: true, record });
    } catch (error) {
      console.error('Error registrando visualización de video:', error);
      res.status(500).json({ error: 'Fallo al registrar la visualización.' });
    }
  };

  /**
   * Obtiene historial de análisis de un usuario.
   */
  getHistory = async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId || 'default';
      const history = await this.persistence.getAnalysisHistory(userId);
      res.json(history);
    } catch (error) {
      console.error('Error al obtener historial:', error);
      res.status(500).json({ error: 'Fallo al recuperar historial.' });
    }
  };

  /**
   * Elimina un análisis por ID.
   */
  deleteAnalysis = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      await this.persistence.deleteAnalysis(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error eliminando análisis:', error);
      res.status(500).json({ error: 'Fallo al eliminar el análisis.' });
    }
  };

  /**
   * Compara los intentos de una técnica con la referencia RAG o de Internet y evalúa.
   */
  compareTechnique = async (req: Request, res: Response) => {
    try {
      const { tecnicaId, userId } = req.params;
      const activeUserId = userId || 'default';

      // 1. Obtener historial de análisis de esta técnica
      const historial = await this.persistence.getAnalysisByTecnica(activeUserId, tecnicaId);
      if (!historial || historial.length === 0) {
        return res.status(404).json({ error: 'No se encontraron análisis para la técnica seleccionada.' });
      }

      const tecnicaNombre = historial[0].tecnicaNombre || tecnicaId;

      // 2. Buscar en RAG
      const source = await this.persistence.getValidatedFuenteByTecnica(tecnicaId);
      let referenceInfo = '';
      let sourceUrl = '';
      let isRAG = false;

      if (source) {
        isRAG = true;
        referenceInfo = `Título del Manual/Video RAG: ${source.titulo}\nTipo: ${source.tipo}\n`;
        if (source.contenidoOriginal) {
          referenceInfo += `Contenido técnico/Instrucciones: ${source.contenidoOriginal.slice(0, 1500)}\n`;
        }
        if (source.youtubeUrl) {
          sourceUrl = source.youtubeUrl;
          referenceInfo += `URL del video de soporte RAG: ${source.youtubeUrl}\n`;
        }
      } else {
        // Fallback a internet (YouTube search)
        console.log(`🔍 No se encontró fuente RAG para ${tecnicaNombre}. Buscando en internet...`);
        const internetVideo = await this.searchFallbackVideo(tecnicaNombre).catch(() => null);
        if (internetVideo) {
          sourceUrl = internetVideo;
          referenceInfo = `Referencia encontrada en Internet (YouTube): ${internetVideo}\n`;
        } else {
          referenceInfo = `Principios biomecánicos universales de BJJ para la técnica: ${tecnicaNombre}\n`;
        }
      }

      // 3. Resumir los intentos previos del usuario
      const attemptsSummary = historial.map((a, idx) => ({
        intento: idx + 1,
        fecha: a.fecha,
        puntuacion: a.puntuacionGeneral,
        erroresDetectados: a.errores.map((e: any) => ({
          articulacion: e.articulacion,
          descripcion: e.descripcionFallo || e.descripcion,
          severidad: e.severidad
        })),
        puntosFuertes: a.puntosFuertes ? (typeof a.puntosFuertes === 'string' ? JSON.parse(a.puntosFuertes) : a.puntosFuertes) : []
      }));

      // 4. Generar la comparación usando Gemini
      const prompt = `Eres un cinturón negro de Brazilian Jiu-Jitsu (BJJ) con 20 años de experiencia e instructor experto en biomecánica.
Analiza el historial de intentos del alumno y compáralo con la referencia técnica proporcionada.

## TÉCNICA A EVALUAR: "${tecnicaNombre}"

## HISTORIAL DE INTENTOS DEL PRACTICANTE
${JSON.stringify(attemptsSummary, null, 2)}

## REFERENCIA TÉCNICA DE COMPARACIÓN
${referenceInfo}

## INSTRUCCIONES
Compara los intentos del alumno con la referencia técnica para identificar patrones de movimiento y áreas consistentes.
Genera una respuesta en español estructurada estrictamente en formato JSON con los siguientes campos (sin bloques de código markdown, sin texto adicional):
{
  "haceBien": "<Un breve análisis de 1 o 2 párrafos concisos destacando lo que el practicante ejecuta de manera correcta y sus fortalezas>",
  "haceMal": "<Un breve análisis de 1 o 2 párrafos concisos sobre los errores consistentes, malos hábitos biomecánicos o áreas que requieren atención urgente>",
  "consultaYouTube": "<Una consulta de búsqueda corta en YouTube (máximo 5 palabras, ej. 'BJJ triangle choke details') optimizada para que el alumno aprenda a resolver sus errores específicos>"
}`;

      console.log(`🤖 Comparando técnica "${tecnicaNombre}" con Gemini...`);
      const responseText = await this.geminiService.evaluateMovement(prompt);

      let cleaned = responseText.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      cleaned = cleaned.trim();

      const parsed = JSON.parse(cleaned);

      res.json({
        tecnicaId,
        tecnicaNombre,
        isRAG,
        sourceUrl,
        referenceTitle: source ? source.titulo : (sourceUrl ? 'Video de Internet' : 'Principios Universales'),
        haceBien: parsed.haceBien || 'No se pudo generar el análisis positivo.',
        haceMal: parsed.haceMal || 'No se pudo generar el análisis correctivo.',
        consultaYouTube: parsed.consultaYouTube || `${tecnicaNombre} BJJ technique details`
      });

    } catch (error: any) {
      console.error('Error en compareTechnique controller:', error);
      res.status(500).json({ error: 'Fallo interno del servidor al comparar la técnica.' });
    }
  };

  /**
   * Obtiene los datos del usuario.
   */
  getUser = async (req: Request, res: Response) => {
    try {
      const userId = req.params.id || 'default';
      const user = await this.persistence.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      res.status(500).json({ error: 'Fallo al recuperar perfil del usuario.' });
    }
  };

  /**
   * Actualiza el perfil biomecánico del usuario.
   */
  updateUserProfile = async (req: Request, res: Response) => {
    try {
      const userId = req.params.id || 'default';
      const updated = await this.persistence.saveUser(userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Error al actualizar perfil de usuario:', error);
      res.status(500).json({ error: 'Fallo al actualizar perfil.' });
    }
  };

  // ========================
  // MÉTODOS DE APOYO (REPETICIÓN Y RAG)
  // ========================

  private detectRecurrentErrors(historial: any[], tecnicaId: string): boolean {
    const recent = historial
      .filter(a => a.tecnicaId === tecnicaId)
      .slice(0, 5);

    if (recent.length < 3) return false;

    const errorCounts: Record<string, number> = {};
    for (const analisis of recent) {
      for (const error of analisis.errores) {
        const key = `${error.articulacion}-${error.severidad}`;
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      }
    }

    return Object.values(errorCounts).some(
      count => count / recent.length > 0.7
    );
  }

  private getRecentErrors(historial: any[]): ErrorBiomecanico[] {
    const recent = historial.slice(0, 5);
    return recent.flatMap(a => a.errores);
  }

  private async searchFallbackVideo(query: string): Promise<string | null> {
    try {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' BJJ tutorial')}`;
      console.log(`🔍 Buscando video de soporte en YouTube para: "${query}"...`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const html = await response.text();
      
      const match = html.match(/"videoId"\s*:\s*"([\w-]{11})"/);
      if (match && match[1]) {
        return `https://www.youtube.com/watch?v=${match[1]}`;
      }
      
      const watchMatch = html.match(/\/watch\?v=([\w-]{11})/);
      if (watchMatch && watchMatch[1]) {
        return `https://www.youtube.com/watch?v=${watchMatch[1]}`;
      }
    } catch (err) {
      console.warn('Error buscando video de respaldo en YouTube:', err);
    }
    return null;
  }

  private async getContextPrompts(tecnicaId: string, esErrorRecurrente: boolean, techniqueName: string): Promise<string[]> {
    try {
      const queryText = `técnica ${tecnicaId} checkpoints biomecánicos ángulos articulares`;
      const queryVector = await this.embeddingService.generateEmbedding(queryText);

      const filters: any = {
        estadoValidacion: 'Validado',
        tecnicaId
      };

      // Cargar todas las fuentes para asociar sus URLs de YouTube a los chunks del RAG
      const fuentes = await this.persistence.getFuentes();
      const urlMap = new Map<number, string>();
      for (const f of fuentes) {
        if (f.id && f.youtubeUrl) {
          urlMap.set(f.id, f.youtubeUrl);
        }
      }

      if (esErrorRecurrente) {
        const drillResults = await this.vectorStore.querySimilar(queryVector, 3, {
          ...filters,
          tipoRecurso: 'drill'
        });
        const anatomyResults = await this.vectorStore.querySimilar(queryVector, 2, {
          ...filters,
          tipoRecurso: 'explicacion_anatomica'
        });

        const drillDocs = drillResults.documents?.[0] || [];
        const drillMetas = drillResults.metadatas?.[0] || [];
        const anatomyDocs = anatomyResults.documents?.[0] || [];
        const anatomyMetas = anatomyResults.metadatas?.[0] || [];

        const drillList = drillDocs.map((doc, idx) => {
          const meta = (drillMetas[idx] as any) || {};
          const ytUrl = meta.fuenteId ? urlMap.get(Number(meta.fuenteId)) : undefined;
          const urlStr = ytUrl ? ` (URL de YouTube: ${ytUrl})` : '';
          return `[Fuente RAG - drill${urlStr}]: ${doc}`;
        });

        const anatomyList = anatomyDocs.map((doc, idx) => {
          const meta = (anatomyMetas[idx] as any) || {};
          const ytUrl = meta.fuenteId ? urlMap.get(Number(meta.fuenteId)) : undefined;
          const urlStr = ytUrl ? ` (URL de YouTube: ${ytUrl})` : '';
          return `[Fuente RAG - explicacion_anatomica${urlStr}]: ${doc}`;
        });

        const combined = [...drillList, ...anatomyList];

        if (combined.length > 0) return combined;
      }

      const results = await this.vectorStore.querySimilar(queryVector, 5, filters);
      const docs = results.documents?.[0] || [];
      const metas = results.metadatas?.[0] || [];

      if (docs.length > 0) {
        return docs.map((doc, idx) => {
          const meta = (metas[idx] as any) || {};
          const ytUrl = meta.fuenteId ? urlMap.get(Number(meta.fuenteId)) : undefined;
          const urlStr = ytUrl ? ` (URL de YouTube: ${ytUrl})` : '';
          return `[Fuente RAG - ${meta.tipoRecurso || 'tecnica'}${urlStr}]: ${doc}`;
        });
      }

      // Si no hay RAG específico para la técnica, buscar video de soporte basado en la técnica detectada
      console.log(`⚠️ No se encontraron documentos específicos en el RAG para "${techniqueName}" (${tecnicaId}). Aplicando fallback dinámico basado en la técnica...`);
      const fallbackVideo = await this.searchFallbackVideo(techniqueName);
      return [this.getFallbackContext(fallbackVideo, techniqueName)];
    } catch (e) {
      console.warn('Error en vectorStore RAG query, aplicando fallback:', e);
      // Buscar video de YouTube dinámicamente también en caso de error
      const fallbackVideo = await this.searchFallbackVideo(techniqueName).catch(() => null);
      return [this.getFallbackContext(fallbackVideo, techniqueName)];
    }
  }

  private getFallbackContext(videoUrl?: string | null, techniqueName?: string): string {
    const videoLine = videoUrl ? `\n(Video de Fundamentos/Técnica de BJJ: ${videoUrl})` : '';
    return `[Principios Universales de BJJ aplicados a la técnica detectada]:
Técnica detectada: ${techniqueName || 'Desconocida'}
1. BASE: Mantener una base sólida distribuyendo el peso correctamente entre los puntos de apoyo.
2. ALINEACIÓN: La columna vertebral debe permanecer alineada, evitando curvaturas excesivas.
3. PALANCA: Usar los principios de palanca mecánica para maximizar la eficiencia del movimiento.
4. PRESIÓN: Aplicar presión constante usando el peso corporal de manera eficiente.
5. FRAMES: Crear estructuras óseas (frames) para mantener distancia o prevenir avances del oponente.${videoLine}`;
  }
}
