import { Request, Response } from 'express';
import { GeminiService } from '../services/geminiService';
import { EmbeddingService } from '../services/embeddingService';
import { VectorStore } from '../services/vectorStore';
import { PersistenceService } from '../services/persistenceService';
import { v4 as uuidv4 } from 'uuid';

export class RagController {
  private geminiService: GeminiService;
  private embeddingService: EmbeddingService;
  private vectorStore: VectorStore;
  private persistence: PersistenceService;

  constructor() {
    this.geminiService = new GeminiService();
    this.embeddingService = new EmbeddingService();
    this.vectorStore = new VectorStore();
    this.persistence = new PersistenceService();
  }

  /**
   * Ingesta una fuente de conocimiento (manual de texto o transcripción).
   * Valida relevancia técnica con Gemini, segmenta en chunks, genera embeddings locales
   * y guarda en la base de datos relacional (SQLite) y vectorial (ChromaDB).
   */
  ingest = async (req: Request, res: Response) => {
    try {
      const { fuente, contenidoTexto } = req.body;

      if (!fuente || !contenidoTexto || !contenidoTexto.trim()) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios: fuente y contenidoTexto.' });
      }

      // 1. Validar pertinencia BJJ con Gemini
      const isRelevant = await this.geminiService.validateBJJRelevance(contenidoTexto);
      if (!isRelevant) {
        return res.status(400).json({ error: 'Contenido rechazado: El texto no está relacionado con Brazilian Jiu-Jitsu.' });
      }

      // 2. Persistir metadatos de la fuente en SQLite
      const sourceRecord = {
        titulo: fuente.titulo,
        tipo: fuente.tipo,
        estadoValidacion: fuente.estadoValidacion,
        tecnicaId: fuente.tecnicaId,
        contenidoOriginal: contenidoTexto,
        youtubeUrl: fuente.youtubeUrl
      };
      const fuenteId = await this.persistence.saveFuente(sourceRecord);

      // 3. Segmentar texto en chunks
      const chunks = this.embeddingService.segmentText(contenidoTexto);
      if (chunks.length === 0) {
        return res.status(400).json({ error: 'Contenido demasiado breve. Debe tener al menos 10 palabras.' });
      }

      // 4. Generar embeddings y persistir en ChromaDB
      for (const chunkText of chunks) {
        const chunkId = uuidv4();
        const embedding = await this.embeddingService.generateEmbedding(chunkText);

        await this.vectorStore.ingestChunk(chunkId, chunkText, embedding, {
          fuenteId,
          tecnicaId: fuente.tecnicaId,
          tipoRecurso: 'tecnica', // Tipo por defecto para ingesta general
          estadoValidacion: fuente.estadoValidacion,
          titulo: fuente.titulo
        });
      }

      res.status(201).json({ success: true, fuenteId, chunkCount: chunks.length });
    } catch (error) {
      console.error('Error en ingesta RAG:', error);
      res.status(500).json({ error: 'Fallo interno durante el proceso de ingesta RAG.' });
    }
  };

  /**
   * Aprueba o rechaza una fuente de conocimiento (CU05 - Instructor).
   */
  validate = async (req: Request, res: Response) => {
    try {
      const { fuenteId, aprobado } = req.body;

      if (fuenteId === undefined || aprobado === undefined) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios: fuenteId y aprobado.' });
      }

      const nuevoEstado = aprobado ? 'Validado' : 'Rechazado';

      // 1. Actualizar estado en base de datos SQLite
      await this.persistence.updateFuenteStatus(Number(fuenteId), nuevoEstado);

      // 2. Actualizar estado o eliminar de ChromaDB
      if (aprobado) {
        await this.vectorStore.updateValidationStatus(Number(fuenteId), nuevoEstado);
      } else {
        await this.vectorStore.deleteByFuenteId(Number(fuenteId));
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error validando fuente RAG:', error);
      res.status(500).json({ error: 'Fallo al procesar validación.' });
    }
  };

  /**
   * Obtiene estadísticas del RAG.
   */
  getStats = async (req: Request, res: Response) => {
    try {
      const totalChunks = await this.vectorStore.getChunkCount();
      const fuentes = await this.persistence.getFuentes();
      res.json({ totalChunks, totalFuentes: fuentes.length });
    } catch (error) {
      console.error('Error obteniendo estadísticas RAG:', error);
      res.status(500).json({ error: 'Fallo al obtener estadísticas.' });
    }
  };

  /**
   * Lista todas las fuentes de conocimiento.
   */
  getFuentes = async (req: Request, res: Response) => {
    try {
      const fuentes = await this.persistence.getFuentes();
      res.json(fuentes);
    } catch (error) {
      console.error('Error obteniendo fuentes:', error);
      res.status(500).json({ error: 'Fallo al listar fuentes.' });
    }
  };

  /**
   * Lista fuentes pendientes de validación.
   */
  getFuentesPendientes = async (req: Request, res: Response) => {
    try {
      const pendientes = await this.persistence.getFuentesPendientes();
      res.json(pendientes);
    } catch (error) {
      console.error('Error obteniendo fuentes pendientes:', error);
      res.status(500).json({ error: 'Fallo al listar fuentes pendientes.' });
    }
  };

  /**
   * Elimina una fuente y sus vectores de ChromaDB.
   */
  deleteFuente = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      await this.persistence.deleteFuente(id);
      await this.vectorStore.deleteByFuenteId(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error eliminando fuente:', error);
      res.status(500).json({ error: 'Fallo al eliminar fuente.' });
    }
  };
}
