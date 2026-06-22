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
      const ragContext = await this.getContextPrompts(tecnicaId, esRecurrente);

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

  private async getContextPrompts(tecnicaId: string, esErrorRecurrente: boolean): Promise<string[]> {
    try {
      const queryText = `técnica ${tecnicaId} checkpoints biomecánicos ángulos articulares`;
      const queryVector = await this.embeddingService.generateEmbedding(queryText);

      const filters: any = {
        estadoValidacion: 'Validado',
        tecnicaId
      };

      if (esErrorRecurrente) {
        const drillResults = await this.vectorStore.querySimilar(queryVector, 3, {
          ...filters,
          tipoRecurso: 'drill'
        });
        const anatomyResults = await this.vectorStore.querySimilar(queryVector, 2, {
          ...filters,
          tipoRecurso: 'explicacion_anatomica'
        });

        const drillDocuments = drillResults.documents?.[0] || [];
        const anatomyDocuments = anatomyResults.documents?.[0] || [];

        const combined = [
          ...drillDocuments.map(doc => `[Fuente RAG - drill]: ${doc}`),
          ...anatomyDocuments.map(doc => `[Fuente RAG - explicacion_anatomica]: ${doc}`)
        ];

        if (combined.length > 0) return combined;
      }

      const results = await this.vectorStore.querySimilar(queryVector, 5, filters);
      const docs = results.documents?.[0] || [];

      if (docs.length > 0) {
        return docs.map((doc, idx) => {
          const meta = (results.metadatas?.[0]?.[idx] as any) || {};
          return `[Fuente RAG - ${meta.tipoRecurso || 'tecnica'}]: ${doc}`;
        });
      }

      const generalResults = await this.vectorStore.querySimilar(queryVector, 5, {
        estadoValidacion: 'Validado'
      });
      const generalDocs = generalResults.documents?.[0] || [];

      if (generalDocs.length > 0) {
        return generalDocs.map(doc => `[Fuente RAG General]: ${doc}`);
      }

      return [this.getFallbackContext()];
    } catch (e) {
      console.warn('Error en vectorStore RAG query, aplicando fallback:', e);
      return [this.getFallbackContext()];
    }
  }

  private getFallbackContext(): string {
    return `[Principios Universales de BJJ]:
1. BASE: Mantener una base sólida distribuyendo el peso correctamente entre los puntos de apoyo.
2. ALINEACIÓN: La columna vertebral debe permanecer alineada, evitando curvaturas excesivas.
3. PALANCA: Usar los principios de palanca mecánica para maximizar la eficiencia del movimiento.
4. PRESIÓN: Aplicar presión constante usando el peso corporal de manera eficiente.
5. FRAMES: Crear estructuras óseas (frames) para mantener distancia o prevenir avances del oponente.`;
  }
}
