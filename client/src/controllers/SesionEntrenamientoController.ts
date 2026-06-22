// ============================================================================
// OpenBJJ - SesionEntrenamientoController (Controlador GRASP)
// Orquesta los eventos del lado del cliente para el CU01
// Coordina: Cámara → MediaPipe → Cinemática local → Envío a Backend para IA/BD
// ============================================================================

import { MediaPipePoseAdapter } from '../services/mediaPipeAdapter';
import { apiClient } from '../services/apiClient';
import {
  AnalisisBiomecanico,
  MetricaCinematica,
  Landmark3D,
  PerfilBiomecanico,
  TECNICAS_BJJ,
  Usuario
} from '../models/types';

export class SesionEntrenamientoController {
  private poseEstimator: MediaPipePoseAdapter;

  constructor() {
    this.poseEstimator = new MediaPipePoseAdapter();
  }

  /**
   * CU01: Flujo principal de análisis biomecánico y táctico adaptativo.
   * Coordina la extracción local y envía los metadatos al backend.
   */
  async analyzeVideo(
    videoBlob: Blob,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<AnalisisBiomecanico> {
    // 1. Validar video (formato y duración ≤ 45s)
    onProgress?.('Validando video...', 5);
    await this.validateVideo(videoBlob);

    // 2. Obtener perfil de usuario desde el backend
    const usuario = await this.getUser();
    const perfil = usuario.perfilBiomecanico!;

    // 3. Extraer landmarks 3D via MediaPipe (client-side)
    onProgress?.('Extrayendo landmarks 3D...', 10);
    let allLandmarks: Landmark3D[][];
    try {
      allLandmarks = await this.poseEstimator.extract3DLandmarks(
        videoBlob,
        (p) => onProgress?.('Procesando pose 3D...', 10 + p * 0.3)
      );
    } catch (error) {
      throw new Error(
        'No se pudo rastrear el esqueleto correctamente. Verifique iluminación y encuadre.'
      );
    }

    // 4. Calcular métricas cinemáticas localmente (Experto en Información)
    onProgress?.('Calculando métricas cinemáticas...', 45);
    const metrics = this.calculateKinematics(allLandmarks, perfil);

    // 5. Extraer fotogramas clave como base64
    onProgress?.('Preparando fotogramas...', 50);
    const frames = await this.extractKeyFrames(videoBlob);

    // 6. Enviar datos al backend (IA centralizada y base de datos)
    onProgress?.('Enviando análisis al servidor...', 65);
    try {
      const response = await apiClient.post('/session/analyze', {
        frames,
        metrics,
        userId: usuario.id
      });

      onProgress?.('¡Análisis completo!', 100);
      
      const result = response.data;
      result.fecha = new Date(result.fecha);
      return result;
    } catch (error: any) {
      console.error('Error en analyzeVideo backend query:', error);
      const msg = error.response?.data?.error || error.message || 'Error al comunicarse con el servidor.';
      throw new Error(msg);
    }
  }

  /**
   * Valida el video antes de procesar (CP02: límite 45 segundos).
   */
  private async validateVideo(videoBlob: Blob): Promise<void> {
    const maxDuration = parseInt(
      import.meta.env.VITE_MAX_VIDEO_DURATION || '45'
    );

    if (!videoBlob.type.startsWith('video/')) {
      throw new Error('Formato de archivo no soportado. Use un archivo de video.');
    }

    const duration = await this.getVideoDuration(videoBlob);
    if (duration > maxDuration) {
      throw new Error(
        `Video no válido. Máximo ${maxDuration} segundos. Su video dura ${Math.round(duration)} segundos.`
      );
    }
  }

  /**
   * Obtiene la duración del video en segundos.
   */
  private getVideoDuration(blob: Blob): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => reject(new Error('No se pudo leer el video'));
      video.src = URL.createObjectURL(blob);
    });
  }

  /**
   * Calcula métricas cinemáticas a partir de los landmarks 3D.
   * Ángulos articulares, velocidades y aceleraciones.
   */
  private calculateKinematics(
    allLandmarks: Landmark3D[][],
    perfil: PerfilBiomecanico
  ): MetricaCinematica[] {
    const metrics: MetricaCinematica[] = [];

    const joints = {
      hombro: { a: 12, b: 14, c: 11 },
      codo: { a: 11, b: 13, c: 15 },
      cadera: { a: 23, b: 25, c: 11 },
      rodilla: { a: 23, b: 25, c: 27 },
      espalda: { a: 11, b: 23, c: 25 }
    };

    for (let i = 0; i < allLandmarks.length; i++) {
      const frame = allLandmarks[i];
      if (frame.length < 33) continue;

      for (const [articulacion, indices] of Object.entries(joints)) {
        const a = frame[indices.a];
        const b = frame[indices.b];
        const c = frame[indices.c];

        if (!a || !b || !c) continue;

        const angulo = this.calculateAngle(a, b, c);

        let velocidad = 0;
        if (i > 0 && allLandmarks[i - 1].length >= 33) {
          const prevB = allLandmarks[i - 1][indices.b];
          const dt = 1 / 5;
          const dx = b.x - prevB.x;
          const dy = b.y - prevB.y;
          const dz = b.z - prevB.z;
          velocidad = Math.sqrt(dx * dx + dy * dy + dz * dz) / dt;
        }

        let aceleracion = 0;
        if (i > 1 && allLandmarks[i - 2].length >= 33) {
          const prevFrame = allLandmarks[i - 1];
          const prevPrevFrame = allLandmarks[i - 2];
          const prevB = prevFrame[indices.b];
          const prevPrevB = prevPrevFrame[indices.b];
          const dt = 1 / 5;

          const v1 = Math.sqrt(
            (b.x - prevB.x) ** 2 + (b.y - prevB.y) ** 2 + (b.z - prevB.z) ** 2
          ) / dt;
          const v0 = Math.sqrt(
            (prevB.x - prevPrevB.x) ** 2 +
            (prevB.y - prevPrevB.y) ** 2 +
            (prevB.z - prevPrevB.z) ** 2
          ) / dt;
          aceleracion = (v1 - v0) / dt;
        }

        metrics.push({
          frameIndex: i,
          articulacion,
          anguloMedido: angulo,
          velocidadMedida: velocidad,
          aceleracionMedida: aceleracion
        });
      }
    }

    return metrics;
  }

  private calculateAngle(a: Landmark3D, b: Landmark3D, c: Landmark3D): number {
    const u = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    const v = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

    const dot = u.x * v.x + u.y * v.y + u.z * v.z;
    const normU = Math.sqrt(u.x ** 2 + u.y ** 2 + u.z ** 2);
    const normV = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);

    if (normU === 0 || normV === 0) return 0;

    const cosAngle = Math.max(-1, Math.min(1, dot / (normU * normV)));
    return (Math.acos(cosAngle) * 180) / Math.PI;
  }

  /**
   * Extrae fotogramas clave del video como base64.
   */
  private async extractKeyFrames(videoBlob: Blob): Promise<string[]> {
    const frames: string[] = [];

    try {
      const videoUrl = URL.createObjectURL(videoBlob);
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = true;

      await new Promise<void>(resolve => {
        video.onloadedmetadata = () => resolve();
        video.load();
      });

      const canvas = document.createElement('canvas');
      canvas.width = Math.min(video.videoWidth, 640);
      canvas.height = Math.min(video.videoHeight, 480);
      const ctx = canvas.getContext('2d')!;

      const duration = video.duration;
      const numFrames = Math.min(5, Math.floor(duration));
      const interval = duration / numFrames;

      for (let i = 0; i < numFrames; i++) {
        video.currentTime = i * interval;
        await new Promise<void>(resolve => {
          video.onseeked = () => resolve();
        });

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        frames.push(dataUrl.split(',')[1]);
      }

      URL.revokeObjectURL(videoUrl);
      video.remove();
      canvas.remove();
    } catch (e) {
      console.warn('Error extrayendo fotogramas:', e);
    }

    return frames;
  }

  /**
   * CU04: Actualizar perfil biomecánico del usuario en el servidor.
   */
  async updateUserProfile(perfil: Partial<PerfilBiomecanico> & { nombre?: string; cinturon?: string }): Promise<Usuario> {
    try {
      const response = await apiClient.post('/profile/default', perfil);
      return response.data;
    } catch (error: any) {
      console.error('Error actualizando perfil biomecánico:', error);
      throw new Error(error.response?.data?.error || 'Fallo al actualizar el perfil en el servidor.');
    }
  }

  /**
   * Registra la confirmación de visualización de un video (CU10).
   */
  async registerVideoView(videoUrl: string, tecnicaId: string): Promise<void> {
    try {
      await apiClient.post('/session/video-view', {
        videoUrl,
        tecnicaId,
        userId: 'default'
      });
    } catch (error: any) {
      console.error('Error registrando visualización de video:', error);
      throw new Error(error.response?.data?.error || 'Error al registrar la visualización de video.');
    }
  }

  /**
   * Obtener historial de análisis del servidor.
   */
  async getHistory(): Promise<AnalisisBiomecanico[]> {
    try {
      const response = await apiClient.get('/session/history/default');
      return response.data.map((item: any) => ({
        ...item,
        fecha: new Date(item.fecha)
      }));
    } catch (error) {
      console.error('Error cargando historial desde el servidor:', error);
      return [];
    }
  }

  /**
   * Eliminar un análisis del historial.
   */
  async deleteAnalysis(id: number): Promise<void> {
    try {
      await apiClient.delete(`/session/analysis/${id}`);
    } catch (error) {
      console.error('Error eliminando análisis:', error);
      throw error;
    }
  }

  /**
   * Obtener usuario actual del servidor.
   */
  async getUser(): Promise<Usuario> {
    try {
      const response = await apiClient.get('/profile/default');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      throw new Error('No se pudo establecer conexión con el servidor local.');
    }
  }

  /**
   * Estima el almacenamiento (mock local client-side).
   */
  async getStorageEstimate(): Promise<{ used: number; quota: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { used: 0, quota: 0 };
  }
}
