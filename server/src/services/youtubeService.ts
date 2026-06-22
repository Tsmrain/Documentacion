import { YoutubeTranscript } from 'youtube-transcript';
import { GeminiService } from './geminiService';

export class YoutubeService {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  /**
   * Extrae el ID del video de YouTube a partir de diversas variantes de URLs.
   */
  extractVideoId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  /**
   * Intenta obtener el título del video de YouTube a través de fetch básico de su HTML.
   */
  async fetchVideoTitle(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const html = await response.text();
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      if (titleMatch && titleMatch[1]) {
        // Limpiar el sufijo " - YouTube"
        return titleMatch[1].replace(' - YouTube', '').trim();
      }
    } catch (err) {
      console.warn('No se pudo extraer el título del video de YouTube:', err);
    }
    return 'Tutorial de Jiu-Jitsu';
  }

  /**
   * Obtiene la transcripción del video. Si falla, usa Gemini para autogenerar una
   * guía de transcripción técnica detallada basada en el título y contexto del video.
   */
  async getTranscript(url: string, tecnicaNombre?: string): Promise<string> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('La URL de YouTube proporcionada no es válida.');
    }

    console.log(`🎥 Procesando video de YouTube. VideoID: ${videoId}`);

    try {
      // 1. Intentar obtener la transcripción oficial/automática de YouTube
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
      if (transcriptItems && transcriptItems.length > 0) {
        console.log('✅ Transcripción de YouTube obtenida de forma exitosa.');
        return transcriptItems.map(item => item.text).join(' ');
      }
    } catch (err: any) {
      console.warn(`⚠️ No se pudo recuperar los subtítulos de YouTube (${err.message}). Ejecutando fallback inteligente...`);
    }

    // 2. Fallback: Obtener el título e invocar a Gemini para autogenerar la transcripción técnica
    const videoTitle = await this.fetchVideoTitle(url);
    const techniqueContext = tecnicaNombre ? ` la técnica "${tecnicaNombre}"` : 'técnicas de Jiu-Jitsu';

    console.log(`🤖 Generando transcripción virtual con Gemini para el video: "${videoTitle}"`);

    const fallbackPrompt = `
Estás actuando como un sistema inteligente de ingesta RAG para una academia de Brazilian Jiu-Jitsu. 
El usuario ha indexado un video de YouTube titulado "${videoTitle}" (URL: ${url}) asociado a ${techniqueContext}.
Lamentablemente, el video no cuenta con subtítulos automáticos legibles.

Genera una transcripción instructiva y descriptiva muy detallada del video (mínimo 300 palabras). Debes detallar los pasos biomecánicos de forma técnica, incluyendo qué movimientos se realizan, los puntos de control clave (frames), los ángulos articulares sugeridos (como codos cerrados, caderas elevadas, etc.) y consejos de prevención de errores comunes para este movimiento en Brazilian Jiu-Jitsu.
Evita introducciones informales. Responde directamente con el texto técnico instructivo que represente el contenido pedagógico del video para ser indexado en el RAG.
`;

    const generatedContent = await this.geminiService.evaluateMovement(fallbackPrompt);
    return `[Transcripción virtual autogenerada por IA para: ${videoTitle}]\n\n${generatedContent}`;
  }
}
