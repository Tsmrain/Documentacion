// ============================================================================
// OpenBJJ - LocalVectorAdapter (RAG Local con Similitud Coseno)
// Patrón GRASP: Fabricación Pura + Variaciones Protegidas
// Implementa IVectorStore sobre IndexedDB
// ============================================================================

import { openDB, IDBPDatabase } from 'idb';
import { IVectorStore, Chunk, ChunkMetadata, ChunkQueryFilters, EstadoValidacion } from '../models/types';

export class LocalVectorAdapter implements IVectorStore {
  private db: IDBPDatabase | null = null;
  private readonly DB_NAME = 'OpenBJJ_VectorDB';
  private readonly STORE_NAME = 'embeddings';
  private readonly DB_VERSION = 1;

  /**
   * Inicializa la base de datos vectorial local en IndexedDB.
   * Crea los índices necesarios para filtrado eficiente.
   */
  async initialize(): Promise<void> {
    if (this.db) return;

    this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('embeddings')) {
          const store = db.createObjectStore('embeddings', {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('tecnicaId', 'tecnicaId', { unique: false });
          store.createIndex('estadoValidacion', 'estadoValidacion', { unique: false });
          store.createIndex('tipoRecurso', 'tipoRecurso', { unique: false });
          store.createIndex('fuenteId', 'fuenteId', { unique: false });
        }
      }
    });
  }

  /**
   * Almacena embeddings vectoriales en IndexedDB.
   * Convierte Float32Array a Array regular para persistencia.
   */
  async saveEmbeddings(chunks: Chunk[], metadata: ChunkMetadata): Promise<void> {
    if (!this.db) await this.initialize();

    const tx = this.db!.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);

    for (const chunk of chunks) {
      await store.add({
        texto: chunk.texto,
        embedding: Array.from(chunk.embedding),
        fuenteId: metadata.fuenteId,
        tecnicaId: metadata.tecnicaId,
        tipoRecurso: metadata.tipoRecurso,
        estadoValidacion: metadata.estadoValidacion,
        titulo: metadata.titulo || '',
        fechaIndexacion: new Date().toISOString()
      });
    }

    await tx.done;
  }

  /**
   * Búsqueda por similitud coseno en IndexedDB.
   * Corazón del RAG local: recupera los chunks más relevantes.
   * 
   * 1. Recupera TODOS los embeddings (con filtros opcionales)
   * 2. Calcula similitud coseno para cada chunk
   * 3. Ordena por score y retorna topK
   */
  async similarityQuery(
    queryVector: Float32Array,
    topK: number = 5,
    filters?: ChunkQueryFilters
  ): Promise<Chunk[]> {
    if (!this.db) await this.initialize();

    // 1. Recuperar todos los embeddings
    let allChunks = await this.db!.getAll(this.STORE_NAME);

    // 2. Aplicar filtros (regla RD-03: solo fuentes validadas)
    if (filters) {
      if (filters.estadoValidacion) {
        allChunks = allChunks.filter(
          c => c.estadoValidacion === filters.estadoValidacion
        );
      }
      if (filters.tipoRecurso) {
        allChunks = allChunks.filter(
          c => c.tipoRecurso === filters.tipoRecurso
        );
      }
      if (filters.tecnicaId) {
        allChunks = allChunks.filter(
          c => c.tecnicaId === filters.tecnicaId
        );
      }
    }

    // 3. Calcular similitud coseno para cada chunk
    const scored = allChunks.map(chunk => ({
      chunk: {
        id: chunk.id,
        texto: chunk.texto,
        embedding: new Float32Array(chunk.embedding),
        fuenteId: chunk.fuenteId,
        tecnicaId: chunk.tecnicaId,
        tipoRecurso: chunk.tipoRecurso,
        estadoValidacion: chunk.estadoValidacion
      } as Chunk,
      score: this.cosineSimilarity(
        queryVector,
        new Float32Array(chunk.embedding)
      )
    }));

    // 4. Ordenar por score descendente y retornar topK
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(item => item.chunk);
  }

  /**
   * Calcula la similitud coseno entre dos vectores.
   * Fórmula: cos(θ) = (A·B) / (||A|| × ||B||)
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Elimina todos los embeddings asociados a una fuente.
   * Usado cuando se rechaza una FuenteConocimiento.
   */
  async deleteByFuenteId(fuenteId: number): Promise<void> {
    if (!this.db) await this.initialize();

    const tx = this.db!.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);
    const index = store.index('fuenteId');
    const keys = await index.getAllKeys(fuenteId);

    for (const key of keys) {
      await store.delete(key);
    }

    await tx.done;
  }

  /**
   * Actualiza el estado de validación de todos los chunks de una fuente.
   * Usado cuando el instructor aprueba o rechaza una fuente (CU05).
   */
  async updateValidationStatus(
    fuenteId: number,
    nuevoEstado: EstadoValidacion
  ): Promise<void> {
    if (!this.db) await this.initialize();

    const tx = this.db!.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);
    const index = store.index('fuenteId');
    const chunks = await index.getAll(fuenteId);

    for (const chunk of chunks) {
      chunk.estadoValidacion = nuevoEstado;
      await store.put(chunk);
    }

    await tx.done;
  }

  /**
   * Cuenta total de chunks almacenados.
   */
  async getChunkCount(): Promise<number> {
    if (!this.db) await this.initialize();
    return await this.db!.count(this.STORE_NAME);
  }
}
