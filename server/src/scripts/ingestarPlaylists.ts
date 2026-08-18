import fs from "fs";
import path from "path";
import { CentralVectorDBAdapter } from "../services/CentralVectorDBAdapter";
import { DynamicPromptBuilder } from "../services/DynamicPromptBuilder";
import { GeminiServiceAdapter } from "../services/GeminiServiceAdapter";
import { RetrievalAugmentedController } from "../controllers/RetrievalAugmentedController";
import { PersistenceFacade } from "../persistence/PersistenceFacade";

// Cargar .env si existe en la raíz del proyecto
const envPath = path.resolve(__dirname, "../../../.env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  envConfig.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valParts] = trimmed.split("=");
      if (key && valParts.length > 0) {
        const val = valParts.join("=").trim().replace(/^["']|["']$/g, "");
        process.env[key.trim()] = val;
      }
    }
  });
}

async function runIngestaPlaylists() {
  console.log("================================================================================");
  console.log("=== INGESTA AUTOMATIZADA MASIVA DE PLAYLISTS DE BJJ (OPENBJJ) ===");
  console.log("================================================================================\n");

  const filePath = path.resolve(__dirname, "../../../todas_las_playlists.txt");
  if (!fs.existsSync(filePath)) {
    console.error(`[Error] No se encontró el archivo ${filePath}`);
    process.exit(1);
  }

  const rawContent = fs.readFileSync(filePath, "utf-8");
  const lines = rawContent.split("\n");

  const ytRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s"']+)/g;
  const rawUrls: string[] = [];
  
  lines.forEach(line => {
    const matches = line.match(ytRegex);
    if (matches) {
      matches.forEach(url => rawUrls.push(url.trim()));
    }
  });

  // Normalizar y eliminar duplicados
  const uniqueUrls = Array.from(new Set(rawUrls));

  console.log(`[Análisis] Total de líneas leídas: ${lines.length}`);
  console.log(`[Análisis] URLs de YouTube extraídas: ${rawUrls.length}`);
  console.log(`[Análisis] URLs de YouTube únicas a procesar: ${uniqueUrls.length}\n`);

  const vectorStore = new CentralVectorDBAdapter();
  const promptBuilder = new DynamicPromptBuilder();
  const geminiAdapter = new GeminiServiceAdapter();
  const ragController = new RetrievalAugmentedController(vectorStore, promptBuilder, geminiAdapter);
  const persistenceFacade = new PersistenceFacade();

  const usuarioId = "user-default";

  // Consultar fuentes existentes para no duplicar
  let fuentesExistentes: any[] = [];
  try {
    fuentesExistentes = await persistenceFacade.obtenerFuentesConocimiento(usuarioId);
  } catch (e: any) {
    console.warn(`[Aviso] No se pudieron consultar fuentes previas: ${e.message}`);
  }

  const urlsExistentes = new Set(fuentesExistentes.map(f => f.url).filter(Boolean));
  console.log(`[Persistencia] Fuentes previamente registradas en PostgreSQL: ${urlsExistentes.size}`);

  const urlsAProcesar = uniqueUrls.filter(url => !urlsExistentes.has(url));
  console.log(`[Persistencia] URLs pendientes de ingestar: ${urlsAProcesar.length}\n`);

  if (urlsAProcesar.length === 0) {
    console.log("Todas las fuentes de la lista ya han sido ingestadas previamente.");
    return;
  }

  let exitoCount = 0;
  let rechazadosCount = 0;
  let errorCount = 0;
  const CONCURRENCY = 8; // Lotes concurrentes para acelerar la ingesta

  console.log(`[Procesamiento] Iniciando ingesta en lotes de ${CONCURRENCY} peticiones en paralelo...\n`);

  for (let i = 0; i < urlsAProcesar.length; i += CONCURRENCY) {
    const chunkBatch = urlsAProcesar.slice(i, i + CONCURRENCY);

    await Promise.all(
      chunkBatch.map(async (url) => {
        try {
          const res = await ragController.procesarEIngestarFuente(null, {
            url,
            usuarioId
          }, usuarioId);

          if (res.success) {
            exitoCount++;
          } else {
            rechazadosCount++;
          }
        } catch (err: any) {
          errorCount++;
        }
      })
    );

    const processed = Math.min(i + CONCURRENCY, urlsAProcesar.length);
    if (processed % 40 === 0 || processed >= urlsAProcesar.length) {
      const pct = Math.round((processed / urlsAProcesar.length) * 100);
      console.log(`[Progreso] ${processed}/${urlsAProcesar.length} (${pct}%) | Éxitos: ${exitoCount} | Rechazados: ${rechazadosCount} | Errores: ${errorCount}`);
    }
  }

  console.log("\n================================================================================");
  console.log("=== INGESTA MASIVA COMPLETADA CON ÉXITO ===");
  console.log("================================================================================");
  console.log(`- Total URLs únicas analizadas: ${uniqueUrls.length}`);
  console.log(`- Previamente existentes (omitiendo duplicados): ${uniqueUrls.length - urlsAProcesar.length}`);
  console.log(`- Ingestadas exitosamente en RAG y PostgreSQL: ${exitoCount}`);
  console.log(`- Rechazadas por moderación semántica RD-03: ${rechazadosCount}`);
  console.log(`- Fallos de red u oEmbed: ${errorCount}`);
  console.log("================================================================กระจ\n");
}

runIngestaPlaylists().catch(err => {
  console.error("Error crítico en script de ingesta masiva:", err);
});
