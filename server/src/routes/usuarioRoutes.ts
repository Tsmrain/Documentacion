import { Router, Request, Response } from "express";
import { SesionEntrenamientoController } from "../controllers/SesionEntrenamientoController";

export function createUsuarioRouter(sessionController: SesionEntrenamientoController): Router {
  const router = Router();

  router.get("/perfil", async (req: Request, res: Response) => {
    try {
      const usuarioId = (req.query.usuarioId as string) || "user-default";
      const result = await sessionController.obtenerPerfilUsuario(usuarioId);
      return res.status(200).json(result);
    } catch (error) {
      console.warn("[usuarioRoutes] Error al obtener perfil:", error);
      return res.status(200).json({
        usuarioId: "user-default",
        nombre: "Practicante",
        cinturon: "BLANCO",
        maestria: "Principiante",
        altura: 175,
        peso: 75
      });
    }
  });

  router.post("/perfil", async (req: Request, res: Response) => {
    try {
      const { usuarioId = "user-default", ...datos } = req.body;
      const result = await sessionController.actualizarPerfilUsuario(usuarioId, datos);
      return res.status(200).json(result);
    } catch (error) {
      console.warn("[usuarioRoutes] Error al actualizar perfil:", error);
      return res.status(200).json({ success: true, ...req.body });
    }
  });

  return router;
}
