export class LocalEmbeddingAdapter {
  private static extractor: any = null;

  private static async getExtractor(): Promise<any> {
    if (!this.extractor) {
      const { pipeline } = await import('@xenova/transformers');
      this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return this.extractor;
  }

  async generarEmbedding(texto: string): Promise<number[]> {
    try {
      const extractor = await LocalEmbeddingAdapter.getExtractor();
      const output = await extractor(texto, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (error: any) {
      console.warn('[LocalEmbeddingAdapter] Error al generar embedding: ' + error.message);
      return Array(384).fill(0.0);
    }
  }
}
