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
    contenidoTexto?: string,
    file?: File,
    onProgress?: (p: number) => void
  ): Promise<number> {
    try {
      if (onProgress) onProgress(20);
      
      let response;

      if (file) {
        // Enviar como multipart/form-data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fuente', JSON.stringify(fuente));
        if (fuente.youtubeUrl) {
          formData.append('youtubeUrl', fuente.youtubeUrl);
        }

        response = await apiClient.post('/rag/ingest', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(20 + Math.round(percentCompleted * 0.7));
            }
          }
        });
      } else {
        // Enviar como JSON normal
        response = await apiClient.post('/rag/ingest', {
          fuente,
          contenidoTexto,
          youtubeUrl: fuente.youtubeUrl
        });
      }

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

  /**
   * Elimina una fuente de conocimiento en el servidor.
   */
  async deleteSource(id: number): Promise<void> {
    try {
      await apiClient.delete(`/rag/fuente/${id}`);
    } catch (error: any) {
      console.error('Error eliminando fuente RAG:', error);
      throw new Error(error.response?.data?.error || 'Error al eliminar la fuente en el servidor.');
    }
  }
}
