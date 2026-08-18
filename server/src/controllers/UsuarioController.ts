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
      const { usuarioId, pin } = req.body;
      
      if (!usuarioId || !pin) {
        return res.status(400).json({ success: false, error: "Usuario ID y PIN son obligatorios" });
      }

      if (!/^\d{4}$/.test(pin)) {
        return res.status(400).json({ success: false, error: "El PIN debe ser numerico y de 4 digitos" });
      }

      const authResult = await this.persistence.autenticarOPin(usuarioId, pin);
      
      if (!authResult.success) {
        return res.status(401).json({ success: false, error: authResult.error || "Credenciales invalidas" });
      }

      const token = jwt.sign({ usuarioId }, JWT_SECRET, { expiresIn: '7d' });
      
      return res.status(200).json({ success: true, token, usuario: authResult.usuario });
    } catch (error: any) {
      console.error("[UsuarioController] Error de autenticacion:", error);
      return res.status(500).json({ success: false, error: "Error interno del servidor" });
    }
  }
}
