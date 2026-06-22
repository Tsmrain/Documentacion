// ============================================================================
// OpenBJJ - EmbeddingService
// Genera embeddings vectoriales locales en el navegador
// Usa una implementación ligera sin dependencia de Transformers.js pesado
// para la primera versión (puede intercambiarse por el patrón Polimorfismo)
// ============================================================================

export class EmbeddingService {
  private static EMBEDDING_DIM = 384; // Dimensión del vector

  /**
   * Genera embeddings para un array de textos.
   * Implementación ligera basada en hashing semántico local.
   * Para producción, intercambiar con Transformers.js via Web Workers.
   */
  async generateEmbeddings(texts: string[]): Promise<Float32Array[]> {
    const embeddings: Float32Array[] = [];

    for (const text of texts) {
      const embedding = this.generateLocalEmbedding(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * Genera un embedding para una query de búsqueda.
   */
  async generateQueryEmbedding(query: string): Promise<Float32Array> {
    return this.generateLocalEmbedding(query);
  }

  /**
   * Implementación local de generación de embeddings.
   * Usa hashing de n-gramas con normalización para capturar semántica básica.
   * Suficiente para el MVP; intercambiable con modelo real via IPoseEstimator.
   */
  private generateLocalEmbedding(text: string): Float32Array {
    const embedding = new Float32Array(EmbeddingService.EMBEDDING_DIM);
    const normalized = text.toLowerCase().trim();

    // Tokenizar en palabras y n-gramas
    const words = normalized.split(/\s+/);
    const ngrams: string[] = [];

    // Unigramas
    for (const word of words) {
      ngrams.push(word);
    }

    // Bigramas
    for (let i = 0; i < words.length - 1; i++) {
      ngrams.push(`${words[i]} ${words[i + 1]}`);
    }

    // Trigramas de caracteres
    for (let i = 0; i < normalized.length - 2; i++) {
      ngrams.push(normalized.substring(i, i + 3));
    }

    // Hash cada n-grama y distribuir en el vector
    for (const ngram of ngrams) {
      const hash = this.hashString(ngram);
      const index = Math.abs(hash) % EmbeddingService.EMBEDDING_DIM;
      const value = ((hash & 0xff) / 255) * 2 - 1; // Normalizar a [-1, 1]
      embedding[index] += value;
    }

    // Normalizar el vector (L2 norm)
    let norm = 0;
    for (let i = 0; i < embedding.length; i++) {
      norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= norm;
      }
    }

    return embedding;
  }

  /**
   * Hash function (FNV-1a) para strings.
   */
  private hashString(str: string): number {
    let hash = 0x811c9dc5; // FNV offset basis
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 0x01000193) | 0; // FNV prime
    }
    return hash;
  }

  /**
   * Segmenta texto largo en chunks de tamaño óptimo.
   * Cada chunk tiene ~500 tokens (~2000 caracteres).
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
        // Si el párrafo es más largo que el máximo, dividir por oraciones
        if (trimmed.length > maxChunkSize) {
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

    // Filtrar chunks demasiado cortos (< 50 palabras)
    return chunks.filter(
      chunk => chunk.split(/\s+/).length >= 10
    );
  }
}
