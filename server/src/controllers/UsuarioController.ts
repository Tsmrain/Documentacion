import { Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_local_dev';

export class UsuarioController {
  private persistence: any; // We will type it properly later, it's just passing it through

  constructor(persistence: any) {
    this.persistence = persistence;
  }

  async autenticarConPin(req: Request, res: Response): Promise<any> {
    try {
      const { usuarioId, username, email, pin, password, portal } = req.body;
      const identificador = username || email || usuarioId;
      const contrasena = password || pin;
      
      if (!identificador || !contrasena) {
        return res.status(400).json({ success: false, error: "El usuario y la contraseña son obligatorios." });
      }

      const authResult = await this.persistence.autenticarUsuario(identificador, contrasena);
      
      if (!authResult.success) {
        return res.status(401).json({ success: false, error: authResult.error || "Credenciales inválidas." });
      }

      const nombreLower = (authResult.usuario.nombre || "").toLowerCase();
      const esAdmin = nombreLower === "admin" || nombreLower === "administrador" || nombreLower === "sensei" || nombreLower === "dojo_admin" || nombreLower === "director";
      const rol = esAdmin ? "ADMIN" : "PRACTICANTE";

      // Control estricto de roles por portal (Craig Larman - Separation of Concerns)
      if (portal === "admin" && !esAdmin) {
        return res.status(403).json({
          success: false,
          error: "Acceso denegado: Esta cuenta es de Practicante. Debes ingresar por el 'Portal del Practicante'."
        });
      }

      if (portal === "practicante" && esAdmin) {
        return res.status(403).json({
          success: false,
          error: "Esta cuenta es de nivel Administrativo. Debes ingresar mediante 'Administración Dojo (BI)'."
        });
      }

      const targetUserId = authResult.usuario.id;
      const token = jwt.sign({ usuarioId: targetUserId }, JWT_SECRET, { expiresIn: '7d' });
      
      return res.status(200).json({
        success: true,
        token,
        usuario: {
          usuarioId: authResult.usuario.id,
          nombre: authResult.usuario.nombre,
          rol,
          email: authResult.usuario.email,
          cinturon: authResult.usuario.cinturon,
          maestria: esAdmin ? "Maestro / Administración" : (authResult.usuario.cinturon === "BLANCO" ? "Principiante" : authResult.usuario.cinturon === "AZUL" ? "Intermedio" : "Avanzado"),
          altura: Number(authResult.usuario.altura),
          peso: Number(authResult.usuario.peso)
        }
      });
    } catch (error: any) {
      console.error("[UsuarioController] Error de autenticación:", error);
      return res.status(500).json({ success: false, error: "Error interno del servidor." });
    }
  }
}
