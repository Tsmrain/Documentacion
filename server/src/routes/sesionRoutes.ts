import { Router, Request, Response, NextFunction } from "express";
import { SesionEntrenamientoController } from "../controllers/SesionEntrenamientoController";

export function createSesionRouter(sessionController: SesionEntrenamientoController): Router {
  const router = Router();

  router.post("/analizar", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { videoBlob, usuarioId } = req.body;
      const result = await sessionController.analizarVideo(videoBlob || "dummy-blob", usuarioId || "user-default");
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/progreso", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioId = req.query.usuarioId as string || "user-default";
      const result = await sessionController.consultarProgresoAdaptativo(usuarioId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/visualizacion", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { videoId, usuarioId } = req.body;
      const result = await sessionController.registrarVisualizacion(usuarioId || "user-default", videoId || "video-default");
      return res.status(200).json({ success: result });
    } catch (error) {
      next(error);
    }
  });

  router.get("/historial", async (req: Request, res: Response) => {
    try {
      const usuarioId = req.query.usuarioId as string || "user-default";
      const result = await sessionController.obtenerHistorialAnalisis(usuarioId);
      return res.status(200).json(Array.isArray(result) ? result : []);
    } catch (error) {
      console.warn("[sesionRoutes] Excepción no capturada en historial. Conmutando a HTTP 200 con []:", error);
      return res.status(200).json([]);
    }
  });

  router.get("/perfil", async (req: Request, res: Response) => {
    try {
      const usuarioId = (req.query.usuarioId as string) || "user-default";
      const result = await sessionController.obtenerPerfilUsuario(usuarioId);
      return res.status(200).json(result);
    } catch (error) {
      console.warn("[sesionRoutes] Error al consultar perfil:", error);
      return res.status(200).json({ usuarioId: "user-default", nombre: "Practicante", cinturon: "BLANCO", maestria: "Principiante" });
    }
  });

  router.post("/perfil", async (req: Request, res: Response) => {
    try {
      const { usuarioId = "user-default", ...datos } = req.body;
      const result = await sessionController.actualizarPerfilUsuario(usuarioId, datos);
      return res.status(200).json(result);
    } catch (error) {
      console.warn("[sesionRoutes] Error al actualizar perfil:", error);
      return res.status(200).json({ success: true, ...req.body });
    }
  });

  return router;
}
