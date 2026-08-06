import { createApp } from "./app";
import { SesionEntrenamientoController } from "./controllers/SesionEntrenamientoController";
import { RetrievalAugmentedController } from "./controllers/RetrievalAugmentedController";
import { AdaptationController } from "./controllers/AdaptationController";
import { PersistenceFacade } from "./persistence/PersistenceFacade";
import { GeminiServiceAdapter } from "./services/GeminiServiceAdapter";
import { CentralVectorDBAdapter } from "./services/CentralVectorDBAdapter";
import { DynamicPromptBuilder } from "./services/DynamicPromptBuilder";

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
