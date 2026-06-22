import { Request, Response } from 'express';
import { GeminiService } from '../services/geminiService';
import { EmbeddingService } from '../services/embeddingService';
import { VectorStore } from '../services/vectorStore';
import { PersistenceService } from '../services/persistenceService';
import { YoutubeService } from '../services/youtubeService';
import { v4 as uuidv4 } from 'uuid';
import { PDFParse } from 'pdf-parse';

export class RagController {
  private geminiService: GeminiService;
  private embeddingService: EmbeddingService;
  private vectorStore: VectorStore;
  private persistence: PersistenceService;
  private youtubeService: YoutubeService;

  constructor() {
    this.geminiService = new GeminiService();
    this.embeddingService = new EmbeddingService();
    this.vectorStore = new VectorStore();
    this.persistence = new PersistenceService();
    this.youtubeService = new YoutubeService();
  }

  /**
   * Ingesta una fuente de conocimiento (manual de texto, PDF o video de YouTube).
   * Valida relevancia técnica con Gemini, segmenta en chunks, genera embeddings locales
   * y guarda en la base de datos relacional (SQLite) y vectorial (ChromaDB).
   */
  ingest = async (req: Request, res: Response) => {
    try {
      let { fuente, contenidoTexto, youtubeUrl } = req.body;

      if (typeof fuente === 'string') {
        try {
          fuente = JSON.parse(fuente);
        } catch (e) {
          return res.status(400).json({ error: 'Formato inválido de metadata "fuente".' });
        }
      }

      if (!fuente) {
        fuente = {};
      }

      let parsedText = '';
      let fallbackTitle = 'Fuente de Jiu-Jitsu';

      // 1. Extraer texto según el tipo de fuente
      if (fuente.tipo === 'ManualPDF') {
        if (req.file) {
          console.log(`📄 Procesando archivo PDF subido: ${req.file.originalname}`);
          fallbackTitle = req.file.originalname.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim();
          try {
            const parser = new PDFParse({ data: req.file.buffer });
            const pdfData = await parser.getText();
            parsedText = pdfData.text;
          } catch (pdfErr: any) {
            console.error('Error parseando PDF con pdf-parse:', pdfErr);
            return res.status(400).json({ error: `No se pudo parsear el archivo PDF: ${pdfErr.message}` });
          }
        } else if (contenidoTexto && contenidoTexto.trim()) {
          parsedText = contenidoTexto;
        } else {
          return res.status(400).json({ error: 'Debe subir un archivo PDF para la ingesta de manuales.' });
        }
      } else if (fuente.tipo === 'VideoYouTube') {
        const url = youtubeUrl || fuente.youtubeUrl;
        if (!url) {
          return res.status(400).json({ error: 'Se requiere la URL de YouTube para procesar el video.' });
        }
        try {
          fallbackTitle = await this.youtubeService.fetchVideoTitle(url);
          parsedText = await this.youtubeService.getTranscript(url);
          // Asegurar que la url quede guardada en el record
          fuente.youtubeUrl = url;
        } catch (ytErr: any) {
          console.error('Error extrayendo transcripción de YouTube:', ytErr);
          return res.status(400).json({ error: `Fallo al procesar el video de YouTube: ${ytErr.message}` });
        }
      } else {
        if (contenidoTexto && contenidoTexto.trim()) {
          parsedText = contenidoTexto;
        } else {
          return res.status(400).json({ error: 'No se ha provisto contenido de texto o archivo válido.' });
        }
      }

      if (!parsedText || !parsedText.trim()) {
        return res.status(400).json({ error: 'El contenido extraído está vacío o no contiene texto legible.' });
      }

      // 2. Validar pertinencia BJJ con Gemini
      const isRelevant = await this.geminiService.validateBJJRelevance(parsedText);
      if (!isRelevant) {
        return res.status(400).json({ error: 'Contenido rechazado: El texto no está relacionado con Brazilian Jiu-Jitsu.' });
      }

      // 3. Obtener título y clasificar técnicas de forma inteligente usando Gemini
      console.log(`🤖 Analizando contenido con Gemini. Título sugerido de fallback: "${fallbackTitle}"`);
      const analysis = await this.geminiService.analyzeSourceContent(parsedText, fallbackTitle);
      fuente.titulo = analysis.titulo;
      fuente.tecnicaId = analysis.tecnicas.join(',');
      console.log(`🤖 Análisis completado: Título obtenido: "${fuente.titulo}" | Técnicas clasificadas: "${fuente.tecnicaId}"`);

      // 4. Persistir metadatos de la fuente en SQLite
      const sourceRecord = {
        titulo: fuente.titulo,
        tipo: fuente.tipo,
        estadoValidacion: 'Validado',
        tecnicaId: fuente.tecnicaId,
        contenidoOriginal: parsedText,
        youtubeUrl: fuente.youtubeUrl
      };
      const createdFuente = await this.persistence.saveFuente(sourceRecord);
      const fuenteId = createdFuente.id;

      // 5. Segmentar texto en chunks
      const chunks = this.embeddingService.segmentText(parsedText);
      if (chunks.length === 0) {
        return res.status(400).json({ error: 'Contenido demasiado breve. Debe tener al menos 10 palabras.' });
      }

      // 6. Clasificar chunks de forma individual e inteligente en lote
      console.log(`🤖 Clasificando ${chunks.length} chunks de texto de forma inteligente...`);
      const chunkTecnicas = await this.geminiService.classifyChunks(chunks);

      // 7. Generar embeddings y persistir en ChromaDB
      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        const chunkId = uuidv4();
        const embedding = await this.embeddingService.generateEmbedding(chunkText);
        const chunkTecnicaId = chunkTecnicas[i] || 'general';

        await this.vectorStore.ingestChunk(chunkId, chunkText, embedding, {
          fuenteId,
          tecnicaId: chunkTecnicaId,
          tipoRecurso: 'tecnica', // Tipo por defecto para ingesta general
          estadoValidacion: 'Validado',
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
