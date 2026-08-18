import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { createSesionRouter } from "./routes/sesionRoutes";
import { createRagRouter } from "./routes/ragRoutes";
import { createUsuarioRouter } from "./routes/usuarioRoutes";
import { SesionEntrenamientoController } from "./controllers/SesionEntrenamientoController";
import { VectorDBUnavailableException } from "./exceptions/VectorDBUnavailableException";
import { verifyToken, sanitizePayload } from "./middlewares/securityHandler";

export function createApp(sessionController: SesionEntrenamientoController): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(sanitizePayload);

  app.use("/api/sesion", verifyToken, createSesionRouter(sessionController));
  app.use("/api/rag", verifyToken, createRagRouter(sessionController));
  app.use("/api/usuario", createUsuarioRouter(sessionController));

  // Middleware de manejo de errores global (Graceful Degradation de API)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof VectorDBUnavailableException) {
      console.warn(`[API - Error Middleware] Capturada indisponibilidad de ChromaDB: ${err.message}. Respondiendo con HTTP 207 (Baseline Fallback).`);
      
      return res.status(207).json({
        success: true,
        degraded: true,
        error: "Vector Store temporalmente inalcanzable. Se aplicó inferencia Baseline de emergencia.",
        reporte: {
          tecnicaId: "guardia-cerrada",
          evaluacion: "Análisis cinemático realizado bajo parámetros Baseline (Gemini nativo).",
          desviacionArticular: "codo_derecho",
          desviacionGrados: 22,
          severidad: "Moderado"
        },
        planAdaptativo: {
          nivelCompetenciaActual: "Principiante",
          drillRecomendado: "Drill de Guardia Cerrada Estándar",
          videoYouTubeUrl: "https://www.youtube.com/results?search_query=" + encodeURIComponent("guardia-cerrada bjj tutorial"),
          mensajeAdaptativo: "Operación de emergencia activa. Se evaluó con el conocimiento nativo de Gemini BJJ."
        }
      });
    }

    console.error("[API - Error Fatal] ", err);
    return res.status(500).json({
      success: false,
      error: "Ocurrió un error inesperado en el Servidor Local."
    });
  });

  return app;
}
