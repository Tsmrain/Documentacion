import fs from "fs";
import path from "path";
import { GeminiServiceAdapter } from "../services/GeminiServiceAdapter";
import { ChatGPTServiceAdapter } from "../services/ChatGPTServiceAdapter";
import { LLMRedirectionProxy } from "../services/LLMRedirectionProxy";

// Cargar variables de entorno desde .env
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

async function runFailoverTest() {
  console.log("================================================================================");
  console.log("=== PRUEBA DE RESILIENCIA Y FAILOVER EN CALIENTE (GEMINI -> OPENAI CHATGPT) ===");
  console.log("================================================================================\n");

  // Simular falla en Gemini (anulando temporalmente su API Key)
  process.env.GEMINI_API_KEY = "invalid_gemini_key_for_test";

  console.log("[Test Setup] 1. GEMINI_API_KEY forzada a valor inválido para simular la caída de Gemini.");
  console.log(`[Test Setup] 2. OPENAI_API_KEY detectada correctamente desde .env (${(process.env.OPENAI_API_KEY || "").substring(0, 12)}...).\n`);

  const geminiAdapter = new GeminiServiceAdapter();
  const chatGptAdapter = new ChatGPTServiceAdapter();
  const proxy = new LLMRedirectionProxy(geminiAdapter, chatGptAdapter);

  const samplePromptJSON = JSON.stringify({
    tecnicaId: "guardia-cerrada",
    metricas: [
      { articulacion: "codo_derecho", desviacionGrados: 28, anguloMedido: 118 }
    ]
  });

  console.log("[Ejecución] Invocando proxy.evaluarMovimiento()...");
  
  try {
    const startTime = Date.now();
    const resultadoJSON = await proxy.evaluarMovimiento(samplePromptJSON);
    const duration = Date.now() - startTime;

    console.log("\n--------------------------------------------------------------------------------");
    console.log(`[Resultado] Respuesta recibida en ${duration}ms.`);
    console.log("[Resultado] Payload JSON retornado:");
    console.log(resultadoJSON);
    console.log("--------------------------------------------------------------------------------\n");

    const parsed = JSON.parse(resultadoJSON);
    if (parsed.tecnicaId || parsed.evaluacion) {
      console.log("✅ VERIFICACIÓN COMPLETADA CON ÉXITO:");
      console.log("   Gemini falló -> El Proxy redirigió a OpenAI -> ChatGPT respondió con el esquema rígido.");
    }
  } catch (error: any) {
    console.error("❌ Fallo en la prueba de failover:", error.message);
  }
}

runFailoverTest();
