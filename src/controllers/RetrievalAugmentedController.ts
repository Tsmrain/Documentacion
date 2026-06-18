// ============================================================================
// OpenBJJ - RetrievalAugmentedController (Fabricación Pura GRASP)
// Gestiona la consulta y ensamblado de embeddings para grounding RAG
// No corresponde a ningún concepto del tatami físico
// ============================================================================

import { LocalVectorAdapter } from '../services/vectorStoreAdapter';
import { EmbeddingService } from '../services/embeddingService';
import {
  Chunk,
  EstadoValidacion,
  TipoRecurso,
  ChunkQueryFilters,
  ChunkMetadata,
  FuenteConocimiento
} from '../models/types';
import { LocalPersistenceAdapter } from '../services/localPersistenceAdapter';

export class RetrievalAugmentedController {
  private vectorStore: LocalVectorAdapter;
  private embeddingService: EmbeddingService;
  private persistence: LocalPersistenceAdapter;

  constructor() {
    this.vectorStore = new LocalVectorAdapter();
    this.embeddingService = new EmbeddingService();
    this.persistence = new LocalPersistenceAdapter();
  }

  /**
   * Recupera los prompts de contexto RAG para una técnica específica.
   * Solo busca en fuentes con estadoValidacion === 'Validado' (regla RD-03).
   * 
   * Si hay errores recurrentes, filtra por tipoRecurso 'drill' o 'explicacion_anatomica'.
   */
  async getContextPrompts(
    tecnicaId: string,
    esErrorRecurrente: boolean = false
  ): Promise<string[]> {
    try {
      // Generar embedding para la query de búsqueda
      const queryText = `técnica ${tecnicaId} checkpoints biomecánicos ángulos articulares`;
      const queryVector = await this.embeddingService.generateQueryEmbedding(queryText);

      // Configurar filtros (regla RD-03: solo fuentes validadas)
      const filters: ChunkQueryFilters = {
        estadoValidacion: EstadoValidacion.Validado,
        tecnicaId: tecnicaId
      };

      // Si error recurrente, buscar drills y explicaciones anatómicas
      if (esErrorRecurrente) {
        // Hacer dos búsquedas: drills + explicaciones anatómicas
        const drillFilters = { ...filters, tipoRecurso: TipoRecurso.Drill };
        const anatomyFilters = { ...filters, tipoRecurso: TipoRecurso.ExplicacionAnatomica };

        const drillChunks = await this.vectorStore.similarityQuery(queryVector, 3, drillFilters);
        const anatomyChunks = await this.vectorStore.similarityQuery(queryVector, 2, anatomyFilters);

        const chunks = [...drillChunks, ...anatomyChunks];

        if (chunks.length > 0) {
          return chunks.map(c =>
            `[Fuente RAG - ${c.tipoRecurso}]: ${c.texto}`
          );
        }
      }

      // Búsqueda estándar en todas las fuentes validadas
      const topK = parseInt(import.meta.env.VITE_RAG_TOP_K || '5');
      const chunks = await this.vectorStore.similarityQuery(queryVector, topK, filters);

      if (chunks.length > 0) {
        return chunks.map(c =>
          `[Fuente RAG - ${c.tipoRecurso}]: ${c.texto}`
        );
      }

      // Fallback: buscar sin filtro de técnica específica
      const generalChunks = await this.vectorStore.similarityQuery(
        queryVector, topK,
        { estadoValidacion: EstadoValidacion.Validado }
      );

      if (generalChunks.length > 0) {
        return generalChunks.map(c =>
          `[Fuente RAG General]: ${c.texto}`
        );
      }

      // Fallback final: principios universales de BJJ
      return [this.getFallbackContext()];
    } catch (error) {
      console.warn('RAG: Error en búsqueda vectorial, usando fallback:', error);
      return [this.getFallbackContext()];
    }
  }

  /**
   * Ingesta una nueva fuente de conocimiento (CU02).
   * Extrae texto, segmenta en chunks, genera embeddings, y almacena.
   */
  async ingestSource(
    fuente: FuenteConocimiento,
    contenidoTexto: string,
    onProgress?: (p: number) => void
  ): Promise<number> {
    // 1. Guardar la fuente en persistencia local
    const fuenteId = await this.persistence.saveFuente(fuente);

    // 2. Segmentar el texto en chunks
    const textChunks = this.embeddingService.segmentText(contenidoTexto);

    if (textChunks.length === 0) {
      throw new Error(
        'Contenido demasiado breve para ser útil técnicamente. Mínimo 50 palabras.'
      );
    }

    // 3. Generar embeddings para cada chunk
    const embeddings = await this.embeddingService.generateEmbeddings(textChunks);

    // 4. Crear objetos Chunk
    const chunks: Chunk[] = textChunks.map((texto, i) => ({
      texto,
      embedding: embeddings[i],
      fuenteId,
      tecnicaId: fuente.tecnicaId,
      tipoRecurso: TipoRecurso.Tecnica,
      estadoValidacion: fuente.estadoValidacion
    }));

    // 5. Almacenar en el vector store
    const metadata: ChunkMetadata = {
      fuenteId,
      tecnicaId: fuente.tecnicaId,
      tipoRecurso: TipoRecurso.Tecnica,
      estadoValidacion: fuente.estadoValidacion,
      titulo: fuente.titulo
    };

    await this.vectorStore.saveEmbeddings(chunks, metadata);

    if (onProgress) onProgress(100);

    return fuenteId;
  }

  /**
   * Valida o rechaza una fuente (CU05 - Instructor).
   */
  async validateSource(
    fuenteId: number,
    aprobado: boolean
  ): Promise<void> {
    const nuevoEstado = aprobado
      ? EstadoValidacion.Validado
      : EstadoValidacion.Rechazado;

    // Actualizar la fuente
    await this.persistence.updateFuenteStatus(fuenteId, nuevoEstado);

    // Actualizar los chunks en el vector store
    if (aprobado) {
      await this.vectorStore.updateValidationStatus(fuenteId, nuevoEstado);
    } else {
      // Rechazada: eliminar los embeddings
      await this.vectorStore.deleteByFuenteId(fuenteId);
    }
  }

  /**
   * Contexto de fallback con principios universales de BJJ.
   * Usado cuando no hay fuentes RAG disponibles.
   */
  private getFallbackContext(): string {
    return `[Principios Universales de BJJ]:
1. BASE: Mantener una base sólida distribuyendo el peso correctamente entre los puntos de apoyo.
2. ALINEACIÓN: La columna vertebral debe permanecer alineada, evitando curvaturas excesivas.
3. PALANCA: Usar los principios de palanca mecánica para maximizar la eficiencia del movimiento.
4. PRESIÓN: Aplicar presión constante usando el peso corporal de manera eficiente.
5. FRAMES: Crear estructuras óseas (frames) para mantener distancia o prevenir avances del oponente.
6. ÁNGULOS: Buscar ángulos de ataque y defensa que maximicen la ventaja mecánica.
7. CONTROL DE CADERA: La cadera es el centro de gravedad y control del movimiento en BJJ.
8. RESPIRACIÓN: Mantener una respiración controlada para gestionar la resistencia y la calma.`;
  }

  /**
   * Obtiene estadísticas del RAG.
   */
  async getStats(): Promise<{ totalChunks: number; totalFuentes: number }> {
    const totalChunks = await this.vectorStore.getChunkCount();
    const fuentes = await this.persistence.getFuentes();
    return { totalChunks, totalFuentes: fuentes.length };
  }
}
