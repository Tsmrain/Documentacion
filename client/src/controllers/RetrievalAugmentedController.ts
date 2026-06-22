// ============================================================================
// OpenBJJ - RetrievalAugmentedController (Fabricación Pura GRASP)
// Gestiona el enrutamiento de consultas e ingestas RAG hacia el servidor
// ============================================================================

import { apiClient } from '../services/apiClient';
import { FuenteConocimiento } from '../models/types';

export class RetrievalAugmentedController {
  /**
   * Obtiene estadísticas del RAG desde el servidor.
   */
  async getStats(): Promise<{ totalChunks: number; totalFuentes: number }> {
    try {
      const response = await apiClient.get('/rag/stats');
      return response.data;
    } catch (error) {
      console.error('Error cargando estadísticas RAG:', error);
      return { totalChunks: 0, totalFuentes: 0 };
    }
  }

  /**
   * Envía una nueva fuente de conocimiento al servidor para su ingesta.
   */
  async ingestSource(
    fuente: FuenteConocimiento,
    contenidoTexto: string,
    onProgress?: (p: number) => void
  ): Promise<number> {
    try {
      if (onProgress) onProgress(20);
      
      const response = await apiClient.post('/rag/ingest', {
        fuente,
        contenidoTexto
      });

      if (onProgress) onProgress(100);
      return response.data.fuenteId;
    } catch (error: any) {
      console.error('Error ingiriendo fuente RAG:', error);
      const msg = error.response?.data?.error || error.message || 'Error durante la ingesta en el servidor.';
      throw new Error(msg);
    }
  }

  /**
   * Aprueba o rechaza una fuente (Instructor - CU05).
   */
  async validateSource(fuenteId: number, aprobado: boolean): Promise<void> {
    try {
      await apiClient.post('/rag/validate', {
        fuenteId,
        aprobado
      });
    } catch (error: any) {
      console.error('Error validando fuente RAG:', error);
      throw new Error(error.response?.data?.error || 'Error al validar fuente en el servidor.');
    }
  }

  /**
   * Recupera todas las fuentes registradas desde el servidor.
   */
  async getFuentes(): Promise<FuenteConocimiento[]> {
    try {
      const response = await apiClient.get('/rag/fuentes');
      return response.data;
    } catch (error) {
      console.error('Error recuperando fuentes RAG:', error);
      return [];
    }
  }
}
