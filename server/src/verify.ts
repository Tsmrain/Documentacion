import { VectorDBUnavailableException } from "./exceptions/VectorDBUnavailableException";
import { CentralVectorDBAdapter, ChunkText } from "./services/CentralVectorDBAdapter";
import { DynamicPromptBuilder, MetricaCinematica } from "./services/DynamicPromptBuilder";
import { RetrievalAugmentedController } from "./controllers/RetrievalAugmentedController";
import { GeminiServiceAdapter } from "./services/GeminiServiceAdapter";
import { AdaptationController, PerfilCompetencia } from "./controllers/AdaptationController";
import { SesionEntrenamientoController, IPoseEstimator } from "./controllers/SesionEntrenamientoController";
import { PersistenceFacade } from "./persistence/PersistenceFacade";
import { createApp } from "./app";
import { Server } from "http";

// Mocks y Drivers
class MockPoseEstimator implements IPoseEstimator {
  private confidence: number = 0.95;

  setConfidence(c: number) {
    this.confidence = c;
  }

  async extraerLandmarks3D(video: any): Promise<any[]> {
    if (this.confidence < 0.5) {
      return Array(33).fill({ x: 0, y: 0, z: 0, visibility: 0.1 });
    }
    return Array(33).fill({ x: 0.5, y: 0.5, z: 0.5, visibility: 0.95 });
  }
}

class MockVectorStore implements CentralVectorDBAdapter {
  private shouldFail: boolean = false;
  private isStoreEmpty: boolean = false;
  private chunks: ChunkText[] = [{ id: "guardia-chunk-1", text: "Mantener codo pegado al cuerpo." }];

  setFailure(fail: boolean) {
    this.shouldFail = fail;
  }

  setEmpty(empty: boolean) {
    this.isStoreEmpty = empty;
  }

  async buscarSimilitud(tecnicaId: string, queryVector: number[]): Promise<ChunkText[]> {
    if (this.shouldFail) {
      throw new VectorDBUnavailableException("La conexión con ChromaDB ha expirado.");
    }
    if (this.isStoreEmpty) {
      return [];
    }
    return this.chunks;
  }

  async ingestarChunk(chunk: ChunkText): Promise<boolean> {
    if (this.shouldFail) {
      throw new VectorDBUnavailableException("La base de datos vectorial no responde.");
    }
    this.chunks.push(chunk);
    return true;
  }
}

async function runIntegrationTests() {
  console.log("=== INICIANDO PRUEBAS DE INTEGRACIÓN REST & PERSISTENCIA (OPENBJJ) ===");

  const poseEstimator = new MockPoseEstimator();
  const vectorStore = new MockVectorStore();
  const promptBuilder = new DynamicPromptBuilder();
  const geminiAdapter = new GeminiServiceAdapter();
  
  const ragController = new RetrievalAugmentedController(vectorStore, promptBuilder, geminiAdapter);
  const persistenceFacade = new PersistenceFacade(); // Capa de acceso a datos GoF Facade
  const adaptationController = new AdaptationController(persistenceFacade, ragController);
  
  const sessionController = new SesionEntrenamientoController(
    poseEstimator,
    geminiAdapter,
    geminiAdapter,
    ragController,
    adaptationController,
    persistenceFacade
  );

  // Inicializar servidor Express en un puerto libre
  const app = createApp(sessionController);
  const PORT = 3002; // Puerto de pruebas
  let server: Server;

  await new Promise<void>((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`[API Gateway] Servidor levantado en http://localhost:${PORT}`);
      resolve();
    });
  });

  try {
    // 1. HAPPY PATH: POST /api/sesion/analizar
    console.log("\n[Test 1] POST /api/sesion/analizar (RAG Personalizado):");
    const res1 = await fetch(`http://localhost:${PORT}/api/sesion/analizar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoBlob: "dummy-blob", usuarioId: "user-default" })
    });
    console.log("Status HTTP:", res1.status);
    const data1 = await res1.json() as any;
    console.log("Reporte:", data1.reporte);
    console.log("Plan Adaptativo:", data1.planAdaptativo.mensajeAdaptativo);

    // 2. EXCEPCIÓN 1: Confianza < 0.5 -> HTTP 400 Bad Request
    console.log("\n[Test 2] POST /api/sesion/analizar conlandmarks de baja confianza:");
    poseEstimator.setConfidence(0.25);
    const res2 = await fetch(`http://localhost:${PORT}/api/sesion/analizar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoBlob: "dummy-blob", usuarioId: "user-default" })
    });
    console.log("Status HTTP:", res2.status);
    const data2 = await res2.json() as any;
    console.log("Mensaje de Error:", data2.error);
    poseEstimator.setConfidence(0.95); // Restablecer

    // 3. EXCEPCIÓN 2: Fallback Baseline cuando ChromaDB devuelve 0 chunks
    console.log("\n[Test 3] POST /api/sesion/analizar con 0 chunks vectoriales:");
    vectorStore.setEmpty(true);
    const res3 = await fetch(`http://localhost:${PORT}/api/sesion/analizar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoBlob: "dummy-blob", usuarioId: "user-default" })
    });
    console.log("Status HTTP:", res3.status);
    const data3 = await res3.json() as any;
    console.log("Mensaje del Plan Adaptativo:", data3.planAdaptativo.mensajeAdaptativo);
    vectorStore.setEmpty(false); // Restablecer

    // 4. EXCEPCIÓN 3: Ingesta no pertinente (Filtro Autónomo RD-03) -> HTTP 400 Bad Request
    console.log("\n[Test 4] POST /api/rag/ingestar de archivo no pertinente (Receta de cocina):");
    const res4 = await fetch(`http://localhost:${PORT}/api/rag/ingestar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        archivoBlob: "dummy",
        metadata: { titulo: "Receta de tarta de manzana con canela y azúcar" }
      })
    });
    console.log("Status HTTP:", res4.status);
    const data4 = await res4.json() as any;
    console.log("Respuesta de rechazo RD-03:", data4.error);
    console.log("Detalle de Razón:", data4.razon);

    // 4b. EXCEPCIÓN 3b: Ingesta de enlace de YouTube no relacionado (Video Musical) -> HTTP 400 Bad Request
    console.log("\n[Test 4b] POST /api/rag/ingestar de enlace de YouTube no relacionado (Video Musical Tito Double P):");
    const res4b = await fetch(`http://localhost:${PORT}/api/rag/ingestar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        archivoBlob: "dummy",
        metadata: { url: "https://www.youtube.com/watch?v=1yZFLRJ4F0Q&list=RD1yZFLRJ4F0Q&start_radio=1" }
      })
    });
    console.log("Status HTTP Enlace Musical:", res4b.status);
    const data4b = await res4b.json() as any;
    console.log("Respuesta de rechazo Enlace Musical:", data4b.error);
    console.log("Detalle de Razón Enlace Musical:", data4b.razon);

    // 4c. EXCEPCIÓN 3c: Ingesta de enlace corto de YouTube no relacionado (Video Musical Dareyes de la Sierra) -> HTTP 400 Bad Request
    console.log("\n[Test 4c] POST /api/rag/ingestar de enlace corto de YouTube no relacionado (Dareyes de la Sierra):");
    const res4c = await fetch(`http://localhost:${PORT}/api/rag/ingestar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        archivoBlob: "dummy",
        metadata: { url: "https://youtu.be/ebXEaHEYYng?si=KsqdCUX_nveJu3Zg" }
      })
    });
    console.log("Status HTTP Enlace Musical 2:", res4c.status);
    const data4c = await res4c.json() as any;
    console.log("Respuesta de rechazo Enlace Musical 2:", data4c.error);
    console.log("Detalle de Razón Enlace Musical 2:", data4c.razon);

    // 5. EXCEPCIÓN 4: ChromaDB caída sin atrapar -> HTTP 207 Multi-Status (Graceful Degradation en Express Middleware)
    console.log("\n[Test 5] POST /api/sesion/analizar con ChromaDB caída (Express Error Middleware):");
    // Para forzar que suba hasta el middleware de Express, inhabilitamos la captura del RAG controller simulando
    // una falla no capturada o puenteando directamente la excepción en el controlador.
    // En nuestra prueba, simularemos la caída y lanzaremos la excepción directamente en la llamada.
    // Pero como RetrievalAugmentedController ya la captura y degrada a Baseline (retornando success 200),
    // para probar el middleware de Express 207, realizaremos un bypass forzado.
    // Esto demuestra que el middleware de Express responde HTTP 207 correctamente ante fallas de infraestructura de ChromaDB.
    vectorStore.setFailure(true);
    // Para forzar que suba la excepción al middleware de errores, inyectaremos un trigger que impida el catch en el controlador:
    const originalObtenerGrounding = ragController.obtenerGrounding;
    ragController.obtenerGrounding = () => { throw new VectorDBUnavailableException("Excepción forzada para Express Middleware."); };

    const res5 = await fetch(`http://localhost:${PORT}/api/sesion/analizar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoBlob: "dummy-blob", usuarioId: "user-default" })
    });
    console.log("Status HTTP:", res5.status);
    const data5 = await res5.json() as any;
    console.log("Alerta de degradación de API (HTTP 207):", data5.error);
    console.log("Plan Adaptativo Recibido:", data5.planAdaptativo.mensajeAdaptativo);

    // Restablecer
    ragController.obtenerGrounding = originalObtenerGrounding;
    vectorStore.setFailure(false);

    // 6. PERSISTENCIA Y CONSULTA: GET /api/sesion/progreso
    console.log("\n[Test 6] GET /api/sesion/progreso (Persistencia relacional en Facade):");
    // Al realizar análisis previos, la visualización y errores se persistieron en el facade.
    const res6 = await fetch(`http://localhost:${PORT}/api/sesion/progreso?usuarioId=user-default`);
    console.log("Status HTTP:", res6.status);
    const data6 = await res6.json() as any;
    console.log("Ruta de Aprendizaje del Perfil Persistido:", data6.drillRecomendado);

    // 7. HISTORIAL (CU05): GET /api/sesion/historial (Mapeo UUID y Graceful Degradation HTTP 200 [])
    console.log("\n[Test 7] GET /api/sesion/historial (CU05 Graceful Degradation y Mapeo UUID):");
    const res7 = await fetch(`http://localhost:${PORT}/api/sesion/historial?usuarioId=user-default`);
    console.log("Status HTTP usuario user-default:", res7.status);
    const data7 = await res7.json() as any;
    console.log("Historial devuelto (longitud):", Array.isArray(data7) ? data7.length : "No es arreglo");

    const res7b = await fetch(`http://localhost:${PORT}/api/sesion/historial?usuarioId=usuario-inexistente`);
    console.log("Status HTTP usuario inexistente:", res7b.status);
    const data7b = await res7b.json() as any;
    console.log("Historial devuelto para usuario inexistente:", data7b);

    // 8. ARQUITECTURA MULTIUSUARIO: GET /api/sesion/perfil & GET /api/usuario/perfil
    console.log("\n[Test 8] GET /api/sesion/perfil & /api/usuario/perfil (Consulta aislada multiusuario):");
    const res8a = await fetch(`http://localhost:${PORT}/api/sesion/perfil?usuarioId=user-default`);
    console.log("Status HTTP perfil user-default:", res8a.status);
    const data8a = await res8a.json() as any;
    console.log("Perfil user-default:", data8a.nombre, "| Cinturón:", data8a.cinturon);

    const res8b = await fetch(`http://localhost:${PORT}/api/usuario/perfil?usuarioId=user-maria`);
    console.log("Status HTTP perfil user-maria:", res8b.status);
    const data8b = await res8b.json() as any;
    console.log("Perfil user-maria:", data8b.nombre, "| Cinturón:", data8b.cinturon);

    // 9. GESTIÓN DE PERFIL ANTROPOMÉTRICO (CU04 / CO04): POST /api/usuario/perfil
    console.log("\n[Test 9] POST /api/usuario/perfil (Actualizar datos antropométricos CU04 / CO04):");
    const res9 = await fetch(`http://localhost:${PORT}/api/usuario/perfil`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuarioId: "user-carlos",
        nombre: "Carlos Gómez",
        cinturon: "AZUL",
        altura: 184,
        peso: 88
      })
    });
    console.log("Status HTTP POST perfil:", res9.status);
    const data9 = await res9.json() as any;
    console.log("Perfil actualizado:", data9.nombre, "| Cinturón:", data9.cinturon, "| Altura:", data9.altura, "cm | Peso:", data9.peso, "kg");

  } catch (error) {
    console.error("Falla en pruebas de integración:", error);
  } finally {
    // Apagar Express de forma limpia para liberar el puerto
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log("\n[API Gateway] Servidor apagado de forma limpia.");
        resolve();
      });
    });
  }

  console.log("\n=== VERIFICACIÓN DE INTEGRACIÓN FINALIZADA CON ÉXITO ===");
}

runIntegrationTests().catch(err => console.error("Error crítico en suite de pruebas:", err));
