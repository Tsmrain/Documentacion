import { ChromaClient, Collection } from 'chromadb';

export class VectorStore {
  private client: ChromaClient;
  private collection: Collection | null = null;
  private collectionName = 'bjj_knowledge';

  constructor() {
    const host = process.env.CHROMA_HOST || 'localhost';
    const port = process.env.CHROMA_PORT || '8000';
    this.client = new ChromaClient({ path: `http://${host}:${port}` });
  }

  async init() {
    if (this.collection) return;
    try {
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { 'hnsw:space': 'cosine' }
      });
      console.log('✅ Conectado a la colección de ChromaDB:', this.collectionName);
    } catch (error) {
      console.error('❌ Error al inicializar la base de datos ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Agrega un nuevo chunk de texto vectorizado a ChromaDB.
   */
  async ingestChunk(id: string, text: string, embedding: number[], metadata: any) {
    await this.init();
    if (!this.collection) throw new Error('ChromaDB collection not initialized');
    await this.collection.add({
      ids: [id],
      embeddings: [embedding],
      metadatas: [metadata],
      documents: [text]
    });
  }

  /**
   * Realiza una consulta por similitud coseno en ChromaDB.
   * Admite filtros por estadoValidacion, tipoRecurso y tecnicaId.
   */
  async querySimilar(embedding: number[], nResults: number = 5, filters?: any) {
    await this.init();
    if (!this.collection) throw new Error('ChromaDB collection not initialized');

    const whereConditions: any[] = [];
    if (filters) {
      if (filters.estadoValidacion) whereConditions.push({ 'estadoValidacion': filters.estadoValidacion });
      if (filters.tipoRecurso) whereConditions.push({ 'tipoRecurso': filters.tipoRecurso });
      if (filters.tecnicaId) whereConditions.push({ 'tecnicaId': filters.tecnicaId });
    }

    const where = whereConditions.length === 1
      ? whereConditions[0]
      : whereConditions.length > 1
        ? { '$and': whereConditions }
        : undefined;

    const queryParams: any = {
      queryEmbeddings: [embedding],
      nResults
    };

    if (where) {
      queryParams.where = where;
    }

    return await this.collection.query(queryParams);
  }

  /**
   * Elimina todos los chunks asociados a un id de fuente.
   */
  async deleteByFuenteId(fuenteId: number) {
    await this.init();
    if (!this.collection) throw new Error('ChromaDB collection not initialized');
    await this.collection.delete({
      where: { fuenteId }
    });
  }

  /**
   * Actualiza el estado de validación de todos los chunks de una fuente.
   */
  async updateValidationStatus(fuenteId: number, nuevoEstado: string) {
    await this.init();
    if (!this.collection) throw new Error('ChromaDB collection not initialized');

    const results = await this.collection.get({
      where: { fuenteId }
    });

    if (results && results.ids && results.ids.length > 0) {
      const updatedMetadatas = (results.metadatas || []).map((m: any) => ({
        ...m,
        estadoValidacion: nuevoEstado
      }));

      const cleanDocuments = (results.documents || []).map((doc: string | null) => doc || '');

      // upsert reemplaza si los IDs coinciden
      await this.collection.upsert({
        ids: results.ids,
        embeddings: results.embeddings || undefined,
        metadatas: updatedMetadatas,
        documents: cleanDocuments
      });
    }
  }

  /**
   * Retorna la cantidad total de chunks indexados.
   */
  async getChunkCount(): Promise<number> {
    await this.init();
    if (!this.collection) return 0;
    return await this.collection.count();
  }
}
