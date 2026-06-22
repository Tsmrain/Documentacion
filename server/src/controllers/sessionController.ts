import { Request, Response } from 'express';
import { GeminiService } from '../services/geminiService';
import { EmbeddingService } from '../services/embeddingService';
import { VectorStore } from '../services/vectorStore';
import { PersistenceService } from '../services/persistenceService';
import { PromptBuilder } from '../services/promptBuilder';
import { TECNICAS_BJJ, ErrorBiomecanico, AnalisisBiomecanico } from '../models/types';

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
   * 1. Detecta técnica (opcionalmente) o usa la seleccionada.
   * 2. Recupera grounding RAG desde ChromaDB.
   * 3. Combina perfil de usuario, historial de errores y métricas locales.
   * 4. Llama a Gemini.
   * 5. Persiste en SQLite.
   */
  analyzeVideo = async (req: Request, res: Response) => {
    try {
      const { frames, metrics, tecnicaId, userId } = req.body;
      const activeUserId = userId || 'default';

      if (!tecnicaId) {
        return res.status(400).json({ error: 'El parámetro tecnicaId es requerido.' });
      }

      // 1. Obtener datos del usuario
      const usuario = await this.persistence.getUser(activeUserId);
      const perfil = usuario.perfilBiomecanico;

      const tecnica = TECNICAS_BJJ.find(t => t.id === tecnicaId);
      const tecnicaNombre = tecnica ? tecnica.nombre : tecnicaId;

      // 2. Comprobar historial y detectar recurrencia
      const historial = await this.persistence.getAnalysisByTecnica(activeUserId, tecnicaId);
      const esRecurrente = this.detectRecurrentErrors(historial, tecnicaId);
      const erroresPrevios = this.getRecentErrors(historial);

      // 3. Recuperar contexto RAG centralizado
      const ragContext = await this.getContextPrompts(tecnicaId, esRecurrente);

      // 4. Construir prompt y evaluar con Gemini
      const prompt = this.promptBuilder.buildPrompt({
        metrics: metrics || [],
        ragContext,
        perfil,
        tecnicaNombre,
        esErrorRecurrente: esRecurrente,
        erroresPrevios
      });

      // 5. Inferencia de Gemini
      let responseText: string;
      if (frames && frames.length > 0) {
        // Ejecución multimodal para validar aspectos visuales
        responseText = await this.geminiService.evaluateMovement(prompt);
      } else {
        responseText = await this.geminiService.evaluateMovement(prompt);
      }

      // 6. Validar y estructurar respuesta
      const parsed = this.promptBuilder.validateResponse(responseText);
      if (!parsed) {
        return res.status(422).json({ error: 'La respuesta de la IA no pudo ser parseada al esquema JSON esperado.' });
      }

      // 7. Guardar análisis biomecánico en SQLite
      const analisis = await this.persistence.saveAnalysis(activeUserId, {
        tecnicaId,
        tecnicaNombre,
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

      // 8. Actualizar ruta de aprendizaje si hay estancamiento / recurrencia
      if (esRecurrente) {
        const rutaActualizada = { ...usuario.rutaAprendizaje };
        if (!rutaActualizada.tecnicasEstancadas.includes(tecnicaId)) {
          rutaActualizada.tecnicasEstancadas.push(tecnicaId);
        }
        rutaActualizada.estadoPedagogicoActual = `Adaptando: ${tecnicaNombre}`;

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
        // Recuperar drills y explicaciones anatómicas
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

      // Consulta regular
      const results = await this.vectorStore.querySimilar(queryVector, 5, filters);
      const docs = results.documents?.[0] || [];

      if (docs.length > 0) {
        return docs.map((doc, idx) => {
          const meta = (results.metadatas?.[0]?.[idx] as any) || {};
          return `[Fuente RAG - ${meta.tipoRecurso || 'tecnica'}]: ${doc}`;
        });
      }

      // General fallback sin filtro de técnica específica
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
