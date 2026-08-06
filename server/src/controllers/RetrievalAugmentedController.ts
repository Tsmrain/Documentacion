import { IVectorStore, ChunkText } from "../services/CentralVectorDBAdapter";
import { DynamicPromptBuilder, MetricaCinematica } from "../services/DynamicPromptBuilder";
import { VectorDBUnavailableException } from "../exceptions/VectorDBUnavailableException";
import { ModerationResult, IContentModerator } from "../services/GeminiServiceAdapter";

export interface SourceMetadata {
  titulo: string;
  autor?: string;
  url?: string;
  usuarioId?: string;
}

export { IContentModerator };

const DEFAULT_UUID = "00000000-0000-0000-0000-000000000001";

export class RetrievalAugmentedController {
  private vectorStore: IVectorStore;
  private promptBuilder: DynamicPromptBuilder;
  private contentModerator?: IContentModerator;
  private fuentesMemoria: Map<string, any[]> = new Map();

  constructor(vectorStore: IVectorStore, promptBuilder: DynamicPromptBuilder, contentModerator?: IContentModerator) {
    this.vectorStore = vectorStore;
    this.promptBuilder = promptBuilder;
    this.contentModerator = contentModerator;
  }

  async obtenerGrounding(tecnicaId: string, metricas: MetricaCinematica[]): Promise<string> {
    try {
      const chunks = await this.vectorStore.buscarSimilitud(tecnicaId, []);
      
      if (chunks && chunks.length > 0) {
        console.log(`[RAG] Chunks recuperados para técnica ${tecnicaId}. Aplicando RAG Vivo Personalizado.`);
        return this.promptBuilder.compilarPromptRAG(metricas, chunks);
      } else {
        console.log(`[RAG] 0 chunks recuperados. Conmutando a Modo Baseline Fallback.`);
        return this.promptBuilder.compilarPromptBaseline(metricas);
      }
    } catch (error: any) {
      if (error instanceof VectorDBUnavailableException) {
        console.warn(`[RAG - Graceful Degradation] ChromaDB no disponible: ${error.message}. Conmutando a Modo Baseline Fallback.`);
        return this.promptBuilder.compilarPromptBaseline(metricas);
      }
      throw error;
    }
  }

  private async extraerMetadatosYouTube(url: string): Promise<string> {
    try {
      if (typeof fetch !== "undefined") {
        const cleanUrl = url.split("&list=")[0].split("?list=")[0];
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
        const res = await fetch(oembedUrl);
        if (res.ok) {
          const json: any = await res.json();
          if (json && json.title) {
            return `Título del Video de YouTube: ${json.title}. Canal/Autor: ${json.author_name || ""}.`;
          }
        }
      }
    } catch (e) {
      console.warn("[oEmbed YouTube] No se pudo resolver oEmbed:", e);
    }
    return `Video de YouTube: ${url}`;
  }

  async procesarEIngestarFuente(archivoBlob: any, metadata: SourceMetadata, usuarioIdParam?: string): Promise<{ success: boolean; error?: string; razon?: string } | boolean> {
    let textoExtraido = "";

    if (metadata.url && (metadata.url.includes("youtube.com") || metadata.url.includes("youtu.be"))) {
      const infoYouTube = await this.extraerMetadatosYouTube(metadata.url);
      textoExtraido = infoYouTube;
    } else {
      textoExtraido = metadata.titulo || "Documento de texto sin título.";
    }
    
    // Muestra de los primeros 1000 caracteres para validación semántica (RD-03)
    const muestra1000 = textoExtraido.substring(0, 1000);

    if (this.contentModerator) {
      const resultado = await this.contentModerator.validarPertinenciaBJJ(muestra1000);
      if (!resultado.esPertinente) {
        console.log(`[RAG Controller - RD-03] Ingesta rechazada por moderación autónoma: ${resultado.razon}`);
        return {
          success: false,
          error: "Contenido no relacionado con BJJ. Moderación autónoma rechazada.",
          razon: resultado.razon
        };
      }
    }

    const targetUserId = metadata.usuarioId || usuarioIdParam || "user-default";
    const fuenteId = `fuente-${Date.now()}`;
    const chunk: ChunkText = {
      id: fuenteId,
      text: textoExtraido
    };

    let exitoVectorStore = false;
    let vectorError: any = null;
    try {
      exitoVectorStore = await this.vectorStore.ingestarChunk(chunk);
    } catch (e: any) {
      vectorError = e;
      console.warn(`[RAG Controller] Error en Vector Store: ${e.message}. Guardando fuente en repositorio local.`);
    }

    const nuevaFuente = {
      id: fuenteId,
      titulo: metadata.titulo || metadata.url || "Fuente de Conocimiento",
      tipo: metadata.url ? "youtube" : "archivo",
      url: metadata.url,
      fecha: new Date().toISOString(),
      estadoValidacion: "ACEPTADO",
      vectorizado: exitoVectorStore
    };

    const fuentesTarget = this.fuentesMemoria.get(targetUserId) || [];
    fuentesTarget.push(nuevaFuente);
    this.fuentesMemoria.set(targetUserId, fuentesTarget);

    const fuentesDefault = this.fuentesMemoria.get("user-default") || [];
    if (targetUserId !== "user-default" && !fuentesDefault.some(f => f.id === fuenteId)) {
      fuentesDefault.push(nuevaFuente);
      this.fuentesMemoria.set("user-default", fuentesDefault);
    }

    const fuentesUUID = this.fuentesMemoria.get(DEFAULT_UUID) || [];
    if (targetUserId !== DEFAULT_UUID && !fuentesUUID.some(f => f.id === fuenteId)) {
      fuentesUUID.push(nuevaFuente);
      this.fuentesMemoria.set(DEFAULT_UUID, fuentesUUID);
    }

    if (vectorError) {
      throw vectorError;
    }

    return exitoVectorStore;
  }

  async obtenerFuentes(usuarioId: string): Promise<any[]> {
    const targetUserId = usuarioId || "user-default";
    let fuentes = this.fuentesMemoria.get(targetUserId);
    if (!fuentes || fuentes.length === 0) {
      fuentes = this.fuentesMemoria.get(DEFAULT_UUID) || this.fuentesMemoria.get("user-default") || [];
    }
    return fuentes;
  }

  async eliminarFuente(usuarioId: string, fuenteId: string): Promise<boolean> {
    const targetUserId = usuarioId || "user-default";
    const fuentes = this.fuentesMemoria.get(targetUserId) || [];
    const filtradas = fuentes.filter(f => f.id !== fuenteId);
    this.fuentesMemoria.set(targetUserId, filtradas);

    // Mantener sincronizado
    if (targetUserId === "user-default" || targetUserId === DEFAULT_UUID) {
      this.fuentesMemoria.set("user-default", filtradas);
      this.fuentesMemoria.set(DEFAULT_UUID, filtradas);
    }
    
    try {
      await this.vectorStore.eliminarChunk(fuenteId);
    } catch (e) {
      console.warn("[RAG] Error al purgar chunk de ChromaDB:", e);
    }
    
    return true;
  }
}
