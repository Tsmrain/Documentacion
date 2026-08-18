import { IVectorStore, ChunkText } from "../services/CentralVectorDBAdapter";
import { DynamicPromptBuilder, MetricaCinematica } from "../services/DynamicPromptBuilder";
import { VectorDBUnavailableException } from "../exceptions/VectorDBUnavailableException";
import { ModerationResult, IContentModerator } from "../services/GeminiServiceAdapter";
import { PersistenceFacade } from "../persistence/PersistenceFacade";

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
  private persistence: PersistenceFacade;

  constructor(vectorStore: IVectorStore, promptBuilder: DynamicPromptBuilder, contentModerator?: IContentModerator) {
    this.vectorStore = vectorStore;
    this.promptBuilder = promptBuilder;
    this.contentModerator = contentModerator;
    this.persistence = new PersistenceFacade();
  }

  async obtenerGrounding(tecnicaId: string, metricas: MetricaCinematica[]): Promise<string> {
    try {
      const chunks = await this.vectorStore.buscarSimilitud(tecnicaId, []);
      
      if (chunks && chunks.length > 0) {
        console.log(`[RAG] Chunks recuperados para tecnica ${tecnicaId}. Aplicando RAG Vivo Personalizado.`);
        return this.promptBuilder.compilarPromptRAG(metricas, chunks);
      } else {
        console.log(`[RAG] 0 chunks recuperados. Conmutando a Modo Baseline Fallback.`);
        return this.promptBuilder.compilarPromptBaseline(metricas);
      }
    } catch (error: any) {
      const isVectorDBOffline = error instanceof VectorDBUnavailableException || 
                                error.name === "VectorDBUnavailableException" || 
                                (error.message && error.message.includes("ChromaDB"));
      
      if (isVectorDBOffline) {
        console.warn(`[Dojo Fallback] ChromaDB no disponible, activando prompt Baseline. Detalle: ${error.message}`);
        return this.promptBuilder.compilarPromptBaseline(metricas);
      }
      throw error;
    }
  }

  private async extraerMetadatosYouTube(url: string): Promise<string> {
    try {
      const cleanUrl = url.split("&list=")[0].split("?list=")[0];
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const json: any = await res.json();
        if (json && json.title) {
          const metaText = [
            json.title,
            json.author_name ? `Canal: ${json.author_name}` : "",
            json.provider_name ? `Plataforma: ${json.provider_name}` : ""
          ].filter(Boolean).join(". ");
          console.log(`[oEmbed YouTube] Metadatos obtenidos: ${metaText.substring(0, 120)}`);
          return metaText;
        }
      } else {
        console.warn(`[oEmbed YouTube] HTTP ${res.status} desde youtube.com/oembed. Probando noembed.com...`);
      }
    } catch (e: any) {
      console.warn("[oEmbed YouTube] Fallo en oEmbed primario:", e.message);
    }

    try {
      const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
      const res2 = await fetch(noembedUrl, { signal: AbortSignal.timeout(5000) });
      if (res2.ok) {
        const json2: any = await res2.json();
        if (json2 && json2.title) {
          const metaText2 = [
            json2.title,
            json2.author_name ? `Canal: ${json2.author_name}` : ""
          ].filter(Boolean).join(". ");
          console.log(`[oEmbed noembed.com] Metadatos obtenidos: ${metaText2.substring(0, 120)}`);
          return metaText2;
        }
      }
    } catch (e2: any) {
      console.warn("[oEmbed noembed.com] Fallo en oEmbed secundario:", e2.message);
    }

    console.warn(`[oEmbed YouTube] Ambos intentos fallaron. Usando URL como identificador: ${url}`);
    return `Video de YouTube BJJ: ${url}`;
  }

  async procesarEIngestarFuente(archivoBlob: any, metadata: SourceMetadata, usuarioIdParam?: string): Promise<{ success: boolean; error?: string; razon?: string; degraded?: boolean; vectorizado?: boolean }> {
    let textoExtraido = "";

    if (metadata.url && (metadata.url.includes("youtube.com") || metadata.url.includes("youtu.be"))) {
      const infoYouTube = await this.extraerMetadatosYouTube(metadata.url);
      textoExtraido = infoYouTube;
    } else {
      textoExtraido = metadata.titulo || "Documento de texto sin titulo.";
    }

    const textoNormalizado = textoExtraido.toLowerCase();
    const muestra1000 = textoNormalizado.substring(0, 1000);

    if (this.contentModerator) {
      const resultado = await this.contentModerator.validarPertinenciaBJJ(muestra1000);
      if (!resultado.esPertinente) {
        console.log(`[RAG Controller - RD-03] Ingesta rechazada por moderacion autonoma: ${resultado.razon}`);
        return {
          success: false,
          error: "Contenido no relacionado con BJJ. Moderacion autonoma rechazada.",
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
      titulo: metadata.url ? textoExtraido : (metadata.titulo || "Fuente de Conocimiento"),
      tipo: metadata.url ? "youtube" : "archivo",
      url: metadata.url,
      fecha: new Date().toISOString(),
      estadoValidacion: "ACEPTADO",
      vectorizado: exitoVectorStore
    };

    try {
      await this.persistence.guardarFuenteConocimiento(targetUserId, nuevaFuente);
    } catch (dbErr: any) {
      console.warn(`[RAG Controller] Error al guardar fuente relacional: ${dbErr.message}`);
    }

    if (vectorError) {
      console.warn(`[Dojo Fallback] Ingesta vectorial fallida. Fuente relacional preservada en PostgreSQL.`);
    }

    return {
      success: true,
      degraded: !exitoVectorStore,
      vectorizado: exitoVectorStore
    };
  }

  async obtenerFuentes(usuarioId: string): Promise<any[]> {
    const targetUserId = usuarioId || "user-default";
    return this.persistence.obtenerFuentesConocimiento(targetUserId);
  }

  async eliminarFuente(usuarioId: string, fuenteId: string): Promise<boolean> {
    const targetUserId = usuarioId || "user-default";
    try {
      await this.persistence.eliminarFuenteConocimiento(targetUserId, fuenteId);
    } catch (dbErr: any) {
      console.warn(`[RAG Controller] Error al eliminar fuente relacional: ${dbErr.message}`);
    }
    
    try {
      await this.vectorStore.eliminarChunk(fuenteId);
    } catch (e: any) {
      console.warn("[RAG] Error al purgar chunk de ChromaDB:", e.message);
    }
    
    return true;
  }
}
