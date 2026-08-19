import { Router, Request, Response, NextFunction } from "express";
import { SesionEntrenamientoController } from "../controllers/SesionEntrenamientoController";

export function createSesionRouter(sessionController: SesionEntrenamientoController): Router {
  const router = Router();

  router.post("/analizar", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await sessionController.analizarVideo(req.body);
      
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

  router.delete("/historial/:id", async (req: Request, res: Response) => {
    try {
      const usuarioId = req.query.usuarioId as string || "user-default";
      const analisisId = req.params.id as string;
      const success = await sessionController.eliminarHistorialAnalisis(usuarioId, analisisId);
      
      if (success) {
        return res.status(200).json({ success: true, message: "Historial eliminado correctamente" });
      } else {
        return res.status(404).json({ success: false, message: "Análisis no encontrado" });
      }
    } catch (error) {
      console.warn("[sesionRoutes] Error al eliminar historial:", error);
      return res.status(500).json({ success: false, message: "Error interno del servidor" });
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

  router.get("/telemetria", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioId = (req.query.usuarioId as string) || "user-default";
      const result = await sessionController.obtenerTelemetriaDojo(usuarioId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
