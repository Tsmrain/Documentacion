// ============================================================================
// OpenBJJ - SesionEntrenamientoController (Controlador GRASP)
// Orquesta TODOS los eventos del sistema para el CU01
// Coordina: MediaPipe → Cinemática → RAG → Gemini → Persistencia
// ============================================================================

import { MediaPipePoseAdapter } from '../services/mediaPipeAdapter';
import { GeminiServiceAdapter } from '../services/geminiService';
import { LocalPersistenceAdapter } from '../services/localPersistenceAdapter';
import { PromptBuilder } from '../services/promptBuilder';
import { RetrievalAugmentedController } from './RetrievalAugmentedController';
import {
  AnalisisBiomecanico,
  MetricaCinematica,
  ErrorBiomecanico,
  Landmark3D,
  PerfilBiomecanico,
  Severidad,
  TipoEstrategia,
  TECNICAS_BJJ,
  Usuario
} from '../models/types';

export class SesionEntrenamientoController {
  private poseEstimator: MediaPipePoseAdapter;
  private llmProvider: GeminiServiceAdapter;
  private persistence: LocalPersistenceAdapter;
  private promptBuilder: PromptBuilder;
  private ragController: RetrievalAugmentedController;

  constructor() {
    this.poseEstimator = new MediaPipePoseAdapter();
    this.llmProvider = new GeminiServiceAdapter();
    this.persistence = new LocalPersistenceAdapter();
    this.promptBuilder = new PromptBuilder();
    this.ragController = new RetrievalAugmentedController();
  }

  /**
   * CU01: Flujo principal de análisis biomecánico y táctico adaptativo.
   * Orquesta secuencialmente todas las operaciones del pipeline.
   */
  async analyzeVideo(
    videoBlob: Blob,
    tecnicaId: string,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<AnalisisBiomecanico> {
    // 1. Validar video (formato y duración ≤ 45s)
    onProgress?.('Validando video...', 5);
    await this.validateVideo(videoBlob);

    // 2. Obtener perfil del usuario
    const usuario = await this.persistence.getUser();
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
      // Flujo alternativo 4a: Fallo en estimación de Pose
      throw new Error(
        'No se pudo rastrear el esqueleto correctamente. Verifique iluminación y encuadre.'
      );
    }

    // 4. Calcular métricas cinemáticas (Experto en Información)
    onProgress?.('Calculando métricas cinemáticas...', 45);
    const tecnica = TECNICAS_BJJ.find(t => t.id === tecnicaId);
    const tecnicaNombre = tecnica?.nombre || tecnicaId;
    const metrics = this.calculateKinematics(allLandmarks, perfil);

    // 5. Extraer fotogramas clave como base64 para Gemini multimodal
    onProgress?.('Preparando fotogramas...', 50);
    const frames = await this.extractKeyFrames(videoBlob);

    // 6. Consultar RAG para contexto de grounding
    onProgress?.('Recuperando contexto RAG...', 55);
    const historial = await this.persistence.getAnalysisByTecnica(tecnicaId);
    const esRecurrente = this.detectRecurrentErrors(historial, tecnicaId);
    const erroresPrevios = this.getRecentErrors(historial);
    const ragContext = await this.ragController.getContextPrompts(
      tecnicaId,
      esRecurrente
    );

    // 7. Construir prompt estructurado (PromptBuilder - Experto)
    onProgress?.('Construyendo prompt de evaluación...', 60);
    const prompt = this.promptBuilder.buildPrompt({
      metrics,
      ragContext,
      perfil,
      tecnicaNombre,
      esErrorRecurrente: esRecurrente,
      erroresPrevios
    });

    // 8. Enviar a Gemini (única comunicación cloud)
    onProgress?.('Consultando IA (Gemini)...', 65);
    let responseText: string;
    try {
      if (frames.length > 0) {
        responseText = await this.llmProvider.evaluateWithFrames(prompt, frames);
      } else {
        responseText = await this.llmProvider.evaluateInference(prompt);
      }
    } catch (error) {
      // Flujo alternativo 9a: Fallo de conexión
      throw new Error(
        'Error de servicio de IA. Intente más tarde. Los datos de landmarks se conservarán.'
      );
    }

    // 9. Parsear y validar respuesta JSON (Integridad - Cap VII)
    onProgress?.('Procesando evaluación táctica...', 85);
    const parsed = this.promptBuilder.validateResponse(responseText);
    if (!parsed) {
      throw new Error(
        'La IA retornó una respuesta con formato inválido. Intente nuevamente.'
      );
    }

    // 10. Instanciar AnalisisBiomecanico (Patrón Creador)
    const analisis: AnalisisBiomecanico = {
      fecha: new Date(),
      tecnicaId,
      tecnicaNombre,
      puntuacionGeneral: parsed.puntuacionGeneral,
      metricas: metrics,
      errores: parsed.errores.map(e => ({
        articulacion: e.articulacion,
        anguloMedido: e.anguloMedido,
        anguloIdeal: e.anguloIdeal,
        desviacion: e.desviacion,
        severidad: e.severidad as Severidad,
        descripcionFallo: e.descripcion,
        esRecurrente: esRecurrente,
        recomendacion: e.recomendacion
      })),
      puntosFuertes: parsed.puntosFuertes,
      recomendacionAdaptativa: {
        tipoEstrategia: parsed.recomendacionAdaptativa.tipoEstrategia as TipoEstrategia,
        contenido: parsed.recomendacionAdaptativa.contenido
      },
      proximaTecnicaSugerida: parsed.proximaTecnicaSugerida
    };

    // 11. Persistir en IndexedDB (inmutable después de guardado - Cap VII)
    onProgress?.('Guardando en historial local...', 95);
    analisis.id = await this.persistence.saveAnalysis(analisis);

    // 12. Actualizar ruta de aprendizaje si hay errores recurrentes
    if (esRecurrente) {
      await this.updateLearningRoute(usuario, analisis);
    }

    onProgress?.('¡Análisis completo!', 100);
    return analisis;
  }

  /**
   * Valida el video antes de procesar (CP02: límite 45 segundos).
   */
  private async validateVideo(videoBlob: Blob): Promise<void> {
    const maxDuration = parseInt(
      import.meta.env.VITE_MAX_VIDEO_DURATION || '45'
    );

    // Verificar formato
    if (!videoBlob.type.startsWith('video/')) {
      throw new Error('Formato de archivo no soportado. Use un archivo de video.');
    }

    // Verificar duración
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
   * (Experto en Información GRASP)
   */
  private calculateKinematics(
    allLandmarks: Landmark3D[][],
    perfil: PerfilBiomecanico
  ): MetricaCinematica[] {
    const metrics: MetricaCinematica[] = [];

    // Índices de landmarks de MediaPipe para articulaciones clave
    const joints = {
      hombro: { a: 12, b: 14, c: 11 },    // hombro_der, codo_der, hombro_izq
      codo: { a: 11, b: 13, c: 15 },       // hombro_izq, codo_izq, muñeca_izq
      cadera: { a: 23, b: 25, c: 11 },     // cadera_izq, rodilla_izq, hombro_izq
      rodilla: { a: 23, b: 25, c: 27 },    // cadera_izq, rodilla_izq, tobillo_izq
      espalda: { a: 11, b: 23, c: 25 }     // hombro_izq, cadera_izq, rodilla_izq
    };

    for (let i = 0; i < allLandmarks.length; i++) {
      const frame = allLandmarks[i];
      if (frame.length < 33) continue; // MediaPipe debe tener 33 landmarks

      for (const [articulacion, indices] of Object.entries(joints)) {
        const a = frame[indices.a];
        const b = frame[indices.b];
        const c = frame[indices.c];

        if (!a || !b || !c) continue;

        // Calcular ángulo articular via producto punto
        const angulo = this.calculateAngle(a, b, c);

        // Calcular velocidad (derivada temporal)
        let velocidad = 0;
        if (i > 0 && allLandmarks[i - 1].length >= 33) {
          const prevB = allLandmarks[i - 1][indices.b];
          const dt = 1 / 5; // 5 fps (submuestreo)
          const dx = b.x - prevB.x;
          const dy = b.y - prevB.y;
          const dz = b.z - prevB.z;
          velocidad = Math.sqrt(dx * dx + dy * dy + dz * dz) / dt;
        }

        // Calcular aceleración
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

  /**
   * Calcula el ángulo entre tres puntos 3D usando producto punto.
   * Fórmula: cos(θ) = (u·v) / (||u|| × ||v||)
   */
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
   * Detecta si hay errores recurrentes para esta técnica.
   * Recurrente = mismo error en >70% de los últimos 5 análisis.
   */
  private detectRecurrentErrors(
    historial: AnalisisBiomecanico[],
    tecnicaId: string
  ): boolean {
    const recent = historial
      .filter(a => a.tecnicaId === tecnicaId)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 5);

    if (recent.length < 3) return false;

    // Contar ocurrencias de cada error
    const errorCounts: Record<string, number> = {};
    for (const analisis of recent) {
      for (const error of analisis.errores) {
        const key = `${error.articulacion}-${error.severidad}`;
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      }
    }

    // Si algún error aparece en >70% de los análisis recientes
    return Object.values(errorCounts).some(
      count => count / recent.length > 0.7
    );
  }

  /**
   * Obtiene errores recientes para el prompt de adaptabilidad.
   */
  private getRecentErrors(
    historial: AnalisisBiomecanico[]
  ): ErrorBiomecanico[] {
    const recent = historial
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 5);

    return recent.flatMap(a => a.errores);
  }

  /**
   * Extrae fotogramas clave del video como base64.
   * Máximo 5 frames para optimizar tokens del LLM.
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
        frames.push(dataUrl.split(',')[1]); // Extraer base64
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
   * Actualiza la ruta de aprendizaje del usuario.
   */
  private async updateLearningRoute(
    usuario: Usuario,
    analisis: AnalisisBiomecanico
  ): Promise<void> {
    if (!usuario.rutaAprendizaje) return;

    const ruta = usuario.rutaAprendizaje;

    // Agregar técnica a estancadas si no está ya
    if (!ruta.tecnicasEstancadas.includes(analisis.tecnicaId)) {
      ruta.tecnicasEstancadas.push(analisis.tecnicaId);
    }

    // Actualizar recomendaciones activas
    ruta.recomendacionesActivas = [analisis.recomendacionAdaptativa];
    ruta.estadoPedagogicoActual = `Adaptando: ${analisis.tecnicaNombre}`;

    usuario.rutaAprendizaje = ruta;
    await this.persistence.saveUser(usuario);
  }

  /**
   * CU04: Actualizar perfil biomecánico del usuario.
   */
  async updateUserProfile(perfil: Partial<PerfilBiomecanico> & { nombre?: string; cinturon?: string }): Promise<Usuario> {
    const usuario = await this.persistence.getUser();

    if (perfil.nombre) usuario.nombre = perfil.nombre;
    if (perfil.cinturon) usuario.cinturon = perfil.cinturon as any;

    if (usuario.perfilBiomecanico) {
      if (perfil.altura) usuario.perfilBiomecanico.altura = perfil.altura;
      if (perfil.peso) usuario.perfilBiomecanico.peso = perfil.peso;
      if (perfil.longitudBrazos) usuario.perfilBiomecanico.longitudBrazos = perfil.longitudBrazos;
      if (perfil.longitudPiernas) usuario.perfilBiomecanico.longitudPiernas = perfil.longitudPiernas;
      if (perfil.rangoMovilidadArticular) {
        usuario.perfilBiomecanico.rangoMovilidadArticular = perfil.rangoMovilidadArticular;
      }
    }

    await this.persistence.saveUser(usuario);
    return usuario;
  }

  /**
   * Obtener historial de análisis.
   */
  async getHistory(): Promise<AnalisisBiomecanico[]> {
    return this.persistence.getAnalysisHistory();
  }

  /**
   * Eliminar un análisis del historial.
   */
  async deleteAnalysis(id: number): Promise<void> {
    return this.persistence.deleteAnalysis(id);
  }

  /**
   * Obtener usuario actual.
   */
  async getUser(): Promise<Usuario> {
    return this.persistence.getUser();
  }

  /**
   * Obtener estimación de almacenamiento.
   */
  async getStorageEstimate(): Promise<{ used: number; quota: number }> {
    return this.persistence.getStorageEstimate();
  }
}
