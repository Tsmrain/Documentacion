import { Router, Request, Response } from "express";
import { SesionEntrenamientoController } from "../controllers/SesionEntrenamientoController";
import { UsuarioController } from "../controllers/UsuarioController";
import { PersistenceFacade } from "../persistence/PersistenceFacade";
import { verifyToken } from "../middlewares/securityHandler";

export function createUsuarioRouter(sessionController: SesionEntrenamientoController): Router {
  const router = Router();
  const persistence = new PersistenceFacade();
  const usuarioController = new UsuarioController(persistence);

  router.post("/auth", (req, res) => usuarioController.autenticarConPin(req, res));

  router.get("/perfil", verifyToken, async (req: Request, res: Response) => {
    try {
      const usuarioId = (req as any).usuarioId || "user-default";
      const result = await sessionController.obtenerPerfilUsuario(usuarioId);
      return res.status(200).json(result);
    } catch (error) {
      console.warn("[usuarioRoutes] Error al obtener perfil:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  router.post("/perfil", verifyToken, async (req: Request, res: Response) => {
    try {
      const usuarioId = (req as any).usuarioId || "user-default";
      const datos = req.body;
      const result = await sessionController.actualizarPerfilUsuario(usuarioId, datos);
      return res.status(200).json(result);
    } catch (error) {
      console.warn("[usuarioRoutes] Error al actualizar perfil:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  return router;
}
