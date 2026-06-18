// ============================================================================
// OpenBJJ - MediaPipePoseAdapter (Adapter GoF / Variaciones Protegidas GRASP)
// Implementa IPoseEstimator con MediaPipe PoseLandmarker
// Ejecución 100% en el navegador via WebGL (RNF05: Privacidad)
// ============================================================================

import { IPoseEstimator, Landmark3D } from '../models/types';
import {
  FilesetResolver,
  PoseLandmarker,
} from '@mediapipe/tasks-vision';

export class MediaPipePoseAdapter implements IPoseEstimator {
  private landmarker: PoseLandmarker | null = null;
  private isInitialized = false;

  /**
   * Inicializa el modelo PoseLandmarker desde CDN WASM.
   * Usa GPU (WebGL) para mejor rendimiento.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 1. Configurar el resolver de archivos WASM
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // 2. Crear PoseLandmarker con opciones optimizadas
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU' // Aceleración WebGL
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false
      });

      this.isInitialized = true;
      console.log('MediaPipe PoseLandmarker inicializado correctamente');
    } catch (error) {
      console.error('Error inicializando MediaPipe:', error);
      throw new Error(
        'No se pudo inicializar el motor de visión. Verifique que su navegador soporte WebGL.'
      );
    }
  }

  /**
   * Extrae landmarks 3D de un video blob.
   * Implementa submuestreo inteligente de fotogramas (R-01: limitar CPU).
   * El video nunca sale del dispositivo (RNF05: Privacidad).
   */
  async extract3DLandmarks(
    videoBlob: Blob,
    onProgress?: (progress: number) => void
  ): Promise<Landmark3D[][]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // 1. Crear URL del blob y cargar video
    const videoUrl = URL.createObjectURL(videoBlob);
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    // 2. Esperar a que el video esté listo
    await new Promise<void>((resolve, reject) => {
      video.addEventListener('loadedmetadata', () => resolve());
      video.addEventListener('error', () =>
        reject(new Error('No se pudo cargar el video'))
      );
      video.load();
    });

    const duration = video.duration;
    const TARGET_FPS = 5; // Submuestreo: 5 fps en lugar de 30 fps (R-01)
    const interval = 1 / TARGET_FPS;
    const totalFrames = Math.floor(duration * TARGET_FPS);

    // 3. Canvas para capturar fotogramas
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;

    const allFrameLandmarks: Landmark3D[][] = [];
    let processedFrames = 0;

    // 4. Procesar fotogramas clave con submuestreo
    for (let time = 0; time < duration; time += interval) {
      // Seek al tiempo del fotograma
      video.currentTime = time;
      await new Promise<void>(resolve => {
        video.addEventListener('seeked', () => resolve(), { once: true });
      });

      // Dibujar frame en canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Detectar pose en el fotograma
      try {
        const result = this.landmarker!.detectForVideo(
          video,
          performance.now()
        );

        if (result.landmarks && result.landmarks.length > 0) {
          // Extraer landmarks 3D con filtrado de confianza
          const worldLandmarks = result.worldLandmarks?.[0] || result.landmarks[0];
          const frameLandmarks: Landmark3D[] = worldLandmarks.map(
            (lm) => ({
              x: lm.x,
              y: lm.y,
              z: lm.z || 0,
              visibility: lm.visibility ?? 0
            })
          );

          // Filtrar: si más del 30% tienen baja confianza, marcar frame como inválido
          const validCount = frameLandmarks.filter(
            lm => lm.visibility >= 0.5
          ).length;
          const confidenceRatio = validCount / frameLandmarks.length;

          if (confidenceRatio >= 0.7) {
            allFrameLandmarks.push(frameLandmarks);
          }
        }
      } catch (e) {
        console.warn(`Frame ${processedFrames} saltado:`, e);
      }

      processedFrames++;
      if (onProgress) {
        onProgress(Math.round((processedFrames / totalFrames) * 100));
      }
    }

    // 5. Limpiar recursos (privacidad: no dejar rastros)
    URL.revokeObjectURL(videoUrl);
    video.remove();
    canvas.remove();

    if (allFrameLandmarks.length === 0) {
      throw new Error(
        'No se pudieron detectar landmarks en el video. Verifique la iluminación, el encuadre y que el cuerpo completo sea visible.'
      );
    }

    console.log(
      `MediaPipe: ${allFrameLandmarks.length} fotogramas procesados de ${totalFrames} totales`
    );
    return allFrameLandmarks;
  }

  /**
   * Libera los recursos del modelo.
   */
  dispose(): void {
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
      this.isInitialized = false;
    }
  }
}
