import { Router, Request, Response, NextFunction } from "express";
import { SesionEntrenamientoController } from "../controllers/SesionEntrenamientoController";

export function createRagRouter(sessionController: SesionEntrenamientoController): Router {
  const router = Router();

  router.post("/ingestar", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { archivoBlob, metadata = {}, usuarioId } = req.body;
      const targetUserId = usuarioId || metadata.usuarioId || (req.query.usuarioId as string) || "user-default";
      const fullMetadata = { ...metadata, usuarioId: targetUserId };
      
      const result = await sessionController.ingestarFuenteConocimiento(archivoBlob || "dummy", fullMetadata);
      
      if (!result || result.success === false) {
        return res.status(400).json({
          error: result?.error || "Contenido no relacionado con BJJ. Moderación autónoma rechazada.",
          razon: result?.razon || "El texto no corresponde al dominio de Brazilian Jiu-Jitsu ni disciplinas de agarre afines."
        });
      }

      if (result.degraded) {
        return res.status(207).json({
          success: true,
          degraded: true,
          message: "Fuente agregada en repositorio local. Vector Store ChromaDB fuera de línea."
        });
      }

      return res.status(200).json({ success: true, message: "Fuente agregada y vectorizada." });
    } catch (error: any) {
      if (error?.name === "VectorDBUnavailableException" || error?.constructor?.name === "VectorDBUnavailableException") {
        console.warn(`[RAG API] ChromaDB no está activo en puerto 8000. Fuente guardada en memoria local en Modo Baseline Fallback (HTTP 207).`);
        return res.status(207).json({
          success: true,
          degraded: true,
          message: "Fuente agregada en memoria local. Vector Store ChromaDB fuera de línea."
        });
      }
      next(error);
    }
  });

  router.get("/fuentes", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioId = (req.query.usuarioId as string) || "user-default";
      const fuentes = await sessionController.obtenerFuentes(usuarioId);
      return res.status(200).json(fuentes);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/fuentes/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fuenteId = req.params.id as string;
      const usuarioId = (req.query.usuarioId as string) || "user-default";
      const result = await sessionController.eliminarFuente(usuarioId, fuenteId);
      return res.status(200).json({ success: result, message: "Fuente eliminada del sistema." });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
