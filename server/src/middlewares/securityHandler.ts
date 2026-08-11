import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_local_dev';

export interface AuthenticatedRequest extends Request {
  usuarioId?: string;
}

export function verifyToken(req: AuthenticatedRequest, res: Response, next: NextFunction): any {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Falta cabecera de autorizacion (Token JWT requerido)' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Formato de token invalido (Bearer <token>)' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { usuarioId: string };
    req.usuarioId = decoded.usuarioId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token JWT invalido o expirado' });
  }
}

export function sanitizePayload(req: AuthenticatedRequest, res: Response, next: NextFunction): any {
  if (req.method === 'POST' && req.path === '/api/sesion/analizar') {
    const { frames } = req.body;
    if (frames && Array.isArray(frames)) {
      for (const frame of frames) {
        if (!frame.landmarks || !Array.isArray(frame.landmarks)) continue;
        for (const lm of frame.landmarks) {
          if (typeof lm.x !== 'number' || typeof lm.y !== 'number' || typeof lm.z !== 'number') {
            return res.status(400).json({ error: 'Violacion de integridad (RNF02): Coordenadas cinematicas malformadas.' });
          }
          if (lm.x < -10000 || lm.x > 10000 || lm.y < -10000 || lm.y > 10000 || lm.z < -10000 || lm.z > 10000) {
            return res.status(400).json({ error: 'Violacion de integridad (RNF02): Valores de landmarks fuera de rango fisico.' });
          }
        }
      }
    }
  }
  
  if (req.body) {
    const strBody = JSON.stringify(req.body);
    if (strBody.includes('<script>') || strBody.includes('</script>') || strBody.includes('javascript:')) {
      return res.status(400).json({ error: 'Inyeccion de codigo detectada. Payload rechazado.' });
    }
  }

  next();
}
