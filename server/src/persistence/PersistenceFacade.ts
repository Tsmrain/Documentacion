import { PrismaClient, Cinturon, SeveridadError, EstadoValidacion, TipoFuente } from '@prisma/client';
import { PerfilCompetencia, IPersistenceService } from "../controllers/AdaptationController";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEFAULT_UUID = "00000000-0000-0000-0000-000000000001";

export interface UsuarioPerfil {
  usuarioId: string;
  nombre: string;
  cinturon: string;
  maestria: string;
  altura?: number;
  peso?: number;
}

export class PersistenceFacade implements IPersistenceService {
  private normalizarUsuarioId(usuarioId: string): string {
    if (!usuarioId || usuarioId === "user-default") {
      return DEFAULT_UUID;
    }
    return usuarioId;
  }

  async autenticarOPin(usuarioId: string, pin: string): Promise<{ success: boolean; usuario?: any; error?: string }> {
    try {
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      let dbUser = await prisma.usuario.findUnique({
        where: { id: normalizedId }
      });

      if (!dbUser) {
        // Crear usuario con nuevo PIN
        const salt = await bcrypt.genSalt(10);
        const pinHash = await bcrypt.hash(pin, salt);
        const nombreFormateado = normalizedId.startsWith("user-")
          ? normalizedId.replace("user-", "").charAt(0).toUpperCase() + normalizedId.replace("user-", "").slice(1)
          : "Practicante BJJ";
        
        dbUser = await prisma.usuario.create({
          data: {
            id: normalizedId,
            nombre: nombreFormateado,
            email: `${normalizedId}@example.com`,
            cinturon: Cinturon.BLANCO,
            altura: 1.75,
            peso: 75,
            pinHash
          }
        });
        return { success: true, usuario: dbUser };
      }

      // Validar si no tiene PIN configurado
      if (!dbUser.pinHash) {
        const salt = await bcrypt.genSalt(10);
        const pinHash = await bcrypt.hash(pin, salt);
        dbUser = await prisma.usuario.update({
          where: { id: normalizedId },
          data: { pinHash }
        });
        return { success: true, usuario: dbUser };
      }

      // Validar PIN existente
      const isMatch = await bcrypt.compare(pin, dbUser.pinHash);
      if (!isMatch) {
        return { success: false, error: "El PIN ingresado es incorrecto" };
      }

      return { success: true, usuario: dbUser };
    } catch (error: any) {
      console.error("[PersistenceFacade] Error en autenticarOPin:", error.message);
      return { success: false, error: "Error en el servidor al autenticar" };
    }
  }

  async obtenerPerfilUsuario(usuarioId: string): Promise<UsuarioPerfil> {
    try {
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      let dbUser = await prisma.usuario.findUnique({
        where: { id: normalizedId }
      });

      if (!dbUser) {
        const nombreFormateado = normalizedId.startsWith("user-")
          ? normalizedId.replace("user-", "").charAt(0).toUpperCase() + normalizedId.replace("user-", "").slice(1)
          : "Practicante BJJ";
        dbUser = await prisma.usuario.create({
          data: {
            id: normalizedId,
            nombre: nombreFormateado,
            email: `${normalizedId}@example.com`,
            cinturon: Cinturon.BLANCO,
            altura: 1.75,
            peso: 75
          }
        });
      }

      let maestria = "Principiante";
      if (dbUser.cinturon === Cinturon.AZUL) maestria = "Intermedio";
      else if (dbUser.cinturon === Cinturon.MORADO || dbUser.cinturon === Cinturon.MARRON) maestria = "Avanzado";
      else if (dbUser.cinturon === Cinturon.NEGRO) maestria = "Maestro";

      return {
        usuarioId: dbUser.id,
        nombre: dbUser.nombre,
        cinturon: dbUser.cinturon,
        maestria,
        altura: Number(dbUser.altura),
        peso: Number(dbUser.peso)
      };
    } catch (error: any) {
      console.warn("[PersistenceFacade] Error al obtener perfil de usuario: " + error.message);
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      return {
        usuarioId: normalizedId,
        nombre: "Practicante",
        cinturon: "BLANCO",
        maestria: "Principiante",
        altura: 175,
        peso: 75
      };
    }
  }

  async actualizarPerfilUsuario(usuarioId: string, datos: Partial<UsuarioPerfil>): Promise<UsuarioPerfil> {
    try {
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      await this.obtenerPerfilUsuario(normalizedId);

      const updateData: any = {};
      if (datos.nombre !== undefined) updateData.nombre = datos.nombre;
      if (datos.cinturon !== undefined) updateData.cinturon = datos.cinturon as Cinturon;
      if (datos.altura !== undefined) updateData.altura = datos.altura;
      if (datos.peso !== undefined) updateData.peso = datos.peso;

      const dbUser = await prisma.usuario.update({
        where: { id: normalizedId },
        data: updateData
      });

      if (datos.cinturon) {
        await prisma.perfilCompetencia.upsert({
          where: { usuarioId: normalizedId },
          create: {
            usuarioId: normalizedId,
            erroresHistoricos: {},
          },
          update: {}
        });
      }

      let maestria = "Principiante";
      if (dbUser.cinturon === Cinturon.AZUL) maestria = "Intermedio";
      else if (dbUser.cinturon === Cinturon.MORADO || dbUser.cinturon === Cinturon.MARRON) maestria = "Avanzado";
      else if (dbUser.cinturon === Cinturon.NEGRO) maestria = "Maestro";

      console.log(`[PersistenceFacade - Prisma] Perfil actualizado para usuario ${normalizedId}`);
      return {
        usuarioId: dbUser.id,
        nombre: dbUser.nombre,
        cinturon: dbUser.cinturon,
        maestria,
        altura: Number(dbUser.altura),
        peso: Number(dbUser.peso)
      };
    } catch (error: any) {
      console.warn("[PersistenceFacade] Error al actualizar perfil: " + error.message);
      return this.obtenerPerfilUsuario(usuarioId);
    }
  }

  async cargarPerfil(usuarioId: string): Promise<PerfilCompetencia> {
    try {
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      let dbPerfil = await prisma.perfilCompetencia.findUnique({
        where: { usuarioId: normalizedId },
        include: {
          historialVisualizaciones: true
        }
      });

      if (!dbPerfil) {
        await this.obtenerPerfilUsuario(normalizedId);
        dbPerfil = await prisma.perfilCompetencia.upsert({
          where: { usuarioId: normalizedId },
          create: {
            usuarioId: normalizedId,
            erroresHistoricos: {},
          },
          update: {},
          include: {
            historialVisualizaciones: true
          }
        });
      }

      const errores = (dbPerfil.erroresHistoricos as Record<string, number>) || {};
      const visualizaciones = (dbPerfil.historialVisualizaciones || []).map(v => ({
        videoId: v.videoId,
        visto: v.visto,
        timestamp: v.timestamp
      }));

      const user = await prisma.usuario.findUnique({
        where: { id: normalizedId }
      });

      return {
        usuarioId: normalizedId,
        cinturon: user ? user.cinturon : "BLANCO",
        erroresHistoricos: errores,
        historialVisualizaciones: visualizaciones
      };
    } catch (error: any) {
      console.warn("[PersistenceFacade] Error al cargar perfil: " + error.message);
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      return {
        usuarioId: normalizedId,
        cinturon: "BLANCO",
        erroresHistoricos: {},
        historialVisualizaciones: []
      };
    }
  }

  async guardarAnalisis(usuarioId: string, reporte: any): Promise<boolean> {
    try {
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      await this.obtenerPerfilUsuario(normalizedId);

      const parsedReport = typeof reporte === "string" ? JSON.parse(reporte) : reporte;
      const tecnicaId = parsedReport.tecnicaId || "guardia-cerrada";
      
      let severidad: SeveridadError = SeveridadError.MODERADO;
      if (parsedReport.severidad) {
        const reportSeveridad = parsedReport.severidad.toUpperCase();
        if (reportSeveridad === "LEVE") severidad = SeveridadError.LEVE;
        else if (reportSeveridad === "CRITICO" || reportSeveridad === "CRÍTICO") severidad = SeveridadError.CRITICO;
      }
      
      const sugerencia = parsedReport.sugerenciaPedagogica || "";
      const desviacionArt = parsedReport.desviacionArticular || "";
      const desviacionGr = parsedReport.desviacionGrados || 0;

      await prisma.sesionEntrenamiento.create({
        data: {
          usuarioId: normalizedId,
          analisis: {
            create: {
              tecnicaId,
              severidad,
              sugerenciaPedagogica: sugerencia,
              erroresDetectados: {
                create: {
                  desviacionArticular: desviacionArt,
                  desviacionGrados: desviacionGr
                }
              }
            }
          }
        }
      });

      const dbPerfil = await prisma.perfilCompetencia.findUnique({
        where: { usuarioId: normalizedId }
      });
      if (dbPerfil) {
        const errores = (dbPerfil.erroresHistoricos as Record<string, number>) || {};
        if (desviacionArt) {
          if (desviacionGr > 15) {
            errores[desviacionArt] = (errores[desviacionArt] || 0) + 1;
          } else {
            errores[desviacionArt] = 0;
          }
        }
        await prisma.perfilCompetencia.update({
          where: { usuarioId: normalizedId },
          data: { erroresHistoricos: errores }
        });
      }

      console.log(`[PersistenceFacade - Prisma] Guardado analisis relacional en base de datos para usuario: ${normalizedId}`);
      return true;
    } catch (error: any) {
      console.warn("[PersistenceFacade] Error al guardar analisis: " + error.message);
      return false;
    }
  }

  async registrarVisualizacion(usuarioId: string, videoId: string): Promise<boolean> {
    try {
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      const perfil = await prisma.perfilCompetencia.findUnique({
        where: { usuarioId: normalizedId }
      });
      if (!perfil) {
        await this.cargarPerfil(normalizedId);
      }
      
      const dbPerfil = await prisma.perfilCompetencia.findUnique({
        where: { usuarioId: normalizedId }
      });

      if (dbPerfil) {
        await prisma.historialVisualizacion.create({
          data: {
            perfilId: dbPerfil.id,
            videoId,
            visto: true
          }
        });
        console.log(`[PersistenceFacade - Prisma] Registrada visualizacion de video ${videoId} para usuario: ${normalizedId}`);
        return true;
      }
      return false;
    } catch (error: any) {
      console.warn("[PersistenceFacade] Error al registrar visualizacion: " + error.message);
      return false;
    }
  }

  async obtenerHistorialAnalisis(usuarioId: string): Promise<any[]> {
    try {
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      const sesiones = await prisma.sesionEntrenamiento.findMany({
        where: { usuarioId: normalizedId },
        include: {
          analisis: {
            include: {
              erroresDetectados: true
            }
          }
        },
        orderBy: {
          fecha: 'desc'
        }
      });

      return sesiones.map(s => {
        const a = s.analisis;
        const err = a?.erroresDetectados?.[0];
        return {
          id: s.id,
          fecha: s.fecha,
          reporte: {
            tecnicaId: a?.tecnicaId || "guardia-cerrada",
            severidad: a?.severidad || "Moderado",
            sugerenciaPedagogica: a?.sugerenciaPedagogica || "",
            desviacionArticular: err?.desviacionArticular || "",
            desviacionGrados: err ? Number(err.desviacionGrados) : 0
          }
        };
      });
    } catch (error: any) {
      console.warn("[PersistenceFacade] Error al consultar historial en Prisma: " + error.message);
      return [];
    }
  }

  async eliminarAnalisis(usuarioId: string, analisisId: string): Promise<boolean> {
    try {
      await prisma.sesionEntrenamiento.delete({
        where: { id: analisisId }
      });
      return true;
    } catch (error: any) {
      console.warn("[PersistenceFacade] Error al eliminar analisis: " + error.message);
      return false;
    }
  }

  async guardarFuenteConocimiento(usuarioId: string, fuente: any): Promise<boolean> {
    try {
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      const tipo = fuente.tipo === "youtube" ? TipoFuente.YOUTUBE : TipoFuente.PDF;
      await prisma.fuenteConocimiento.create({
        data: {
          id: fuente.id || undefined,
          titulo: fuente.titulo || "Fuente de Conocimiento",
          url: fuente.url || null,
          tipo,
          estadoValidacion: EstadoValidacion.ACEPTADO,
          usuario: { connect: { id: normalizedId } }
        }
      });
      console.log(`[PersistenceFacade - Prisma] Guardada FuenteConocimiento ACEPTADA en PostgreSQL`);
      return true;
    } catch (error: any) {
      console.warn("[PersistenceFacade] Error al guardar FuenteConocimiento: " + error.message);
      return false;
    }
  }

  async obtenerFuentesConocimiento(usuarioId: string): Promise<any[]> {
    try {
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      const fuentes = await prisma.fuenteConocimiento.findMany({
        where: { usuarioId: normalizedId },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return fuentes.map(f => ({
        id: f.id,
        titulo: f.titulo,
        tipo: f.tipo === TipoFuente.YOUTUBE ? "youtube" : "archivo",
        url: f.url,
        fecha: f.createdAt.toISOString(),
        estadoValidacion: f.estadoValidacion,
        vectorizado: true
      }));
    } catch (error: any) {
      console.warn("[PersistenceFacade] Error al obtener fuentes en Prisma: " + error.message);
      return [];
    }
  }

  async eliminarFuenteConocimiento(usuarioId: string, fuenteId: string): Promise<boolean> {
    try {
      await prisma.fuenteConocimiento.delete({
        where: { id: fuenteId }
      });
      console.log(`[PersistenceFacade - Prisma] Eliminada FuenteConocimiento ${fuenteId} de PostgreSQL`);
      return true;
    } catch (error: any) {
      console.warn("[PersistenceFacade] Error al eliminar fuente: " + error.message);
      return false;
    }
  }
}
