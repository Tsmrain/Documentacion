import { pipeline } from '@xenova/transformers';

export class EmbeddingService {
  private extractor: any = null;

  async init() {
    if (this.extractor) return;
    try {
      this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('✅ Modelo de embeddings local (Xenova/all-MiniLM-L6-v2) cargado correctamente');
    } catch (error) {
      console.error('❌ Error al inicializar el modelo de embeddings:', error);
      throw error;
    }
  }

  /**
   * Genera un embedding vectorial (384 dimensiones) para un texto.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.extractor) {
      await this.init();
    }
    try {
      const result = await this.extractor(text, { pooling: 'mean', normalize: true });
      return Array.from(result.data);
    } catch (error) {
      console.error('Error generando embedding:', error);
      throw new Error('Fallo al generar embedding local.');
    }
  }

  /**
   * Genera embeddings para múltiples textos de forma secuencial.
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const emb = await this.generateEmbedding(text);
      embeddings.push(emb);
    }
    return embeddings;
  }

  /**
   * Segmenta un texto largo en chunks lógicos para indexación RAG.
   */
  segmentText(text: string, maxChunkSize: number = 2000): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/);

    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      if (currentChunk.length + trimmed.length > maxChunkSize) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
        }

        if (trimmed.length > maxChunkSize) {
          // Dividir por oraciones si el párrafo es demasiado grande
          const sentences = trimmed.split(/(?<=[.!?])\s+/);
          let subChunk = '';
          for (const sentence of sentences) {
            if (subChunk.length + sentence.length > maxChunkSize) {
              if (subChunk.length > 0) chunks.push(subChunk.trim());
              subChunk = sentence;
            } else {
              subChunk += (subChunk ? ' ' : '') + sentence;
            }
          }
          currentChunk = subChunk;
        } else {
          currentChunk = trimmed;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.split(/\s+/).length >= 10);
  }
}
