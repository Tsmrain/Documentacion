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

  // Registro de nuevo practicante del dojo (sin password, solo nombre y cinturon)
  router.post("/registrar", async (req: Request, res: Response) => {
    try {
      const { nombre, cinturon } = req.body;
      if (!nombre || typeof nombre !== "string" || nombre.trim().length < 2) {
        return res.status(400).json({ error: "El nombre del practicante debe tener al menos 2 letras." });
      }
      const perfil = await persistence.registrarPracticante(nombre.trim(), cinturon || "BLANCO");
      return res.status(201).json(perfil);
    } catch (error: any) {
      console.warn("[usuarioRoutes] Error al registrar practicante:", error.message);
      return res.status(500).json({ error: error.message || "No se pudo registrar el practicante." });
    }
  });

  // Lista todos los practicantes del dojo para la pantalla de seleccion
  router.get("/listar", async (_req: Request, res: Response) => {
    try {
      const practicantes = await persistence.listarPracticantes();
      return res.status(200).json(practicantes);
    } catch (error: any) {
      console.warn("[usuarioRoutes] Error al listar practicantes:", error.message);
      return res.status(500).json({ error: "Error al obtener la lista de practicantes." });
    }
  });

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
