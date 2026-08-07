import fs from "fs";
import path from "path";
import { createApp } from "./app";
import { SesionEntrenamientoController } from "./controllers/SesionEntrenamientoController";
import { RetrievalAugmentedController } from "./controllers/RetrievalAugmentedController";
import { AdaptationController } from "./controllers/AdaptationController";
import { PersistenceFacade } from "./persistence/PersistenceFacade";
import { GeminiServiceAdapter } from "./services/GeminiServiceAdapter";
import { CentralVectorDBAdapter } from "./services/CentralVectorDBAdapter";
import { DynamicPromptBuilder } from "./services/DynamicPromptBuilder";

// Cargar variables de entorno desde .env en la raíz del proyecto
const envPath = path.resolve(__dirname, "../../.env");
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

const port = process.env.PORT || 3001;

const poseEstimator = {
  async extraerLandmarks3D() {
    return Array(33).fill({ x: 0.5, y: 0.5, z: 0.5, visibility: 0.95 });
  }
};

const vectorStore = new CentralVectorDBAdapter();
const promptBuilder = new DynamicPromptBuilder();
const geminiAdapter = new GeminiServiceAdapter();
const ragController = new RetrievalAugmentedController(vectorStore, promptBuilder, geminiAdapter);
const persistenceFacade = new PersistenceFacade();
const adaptationController = new AdaptationController(persistenceFacade);

const sessionController = new SesionEntrenamientoController(
  poseEstimator,
  geminiAdapter,
  geminiAdapter,
  ragController,
  adaptationController,
  persistenceFacade
);

const app = createApp(sessionController);

app.listen(port, () => {
  console.log(`[API Gateway] Servidor de OpenBJJ escuchando en http://localhost:${port}`);
});
