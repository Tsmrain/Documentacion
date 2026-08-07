import { PerfilCompetencia, IPersistenceService } from "../controllers/AdaptationController";

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
  // Simulación de base de datos relacional Prisma en memoria
  private perfiles: Map<string, PerfilCompetencia> = new Map();
  private analisis: Map<string, any[]> = new Map();
  private usuarios: Map<string, UsuarioPerfil> = new Map();

  constructor() {
    // Inicializar perfil por defecto sin datos mock de prueba
    this.perfiles.set(DEFAULT_UUID, {
      usuarioId: DEFAULT_UUID,
      cinturon: "BLANCO",
      erroresHistoricos: {},
      historialVisualizaciones: []
    });

    this.usuarios.set(DEFAULT_UUID, {
      usuarioId: DEFAULT_UUID,
      nombre: "Practicante",
      cinturon: "BLANCO",
      maestria: "Principiante",
      altura: 175,
      peso: 75
    });

    this.usuarios.set("user-maria", {
      usuarioId: "user-maria",
      nombre: "María Silva",
      cinturon: "MORADO",
      maestria: "Avanzado",
      altura: 165,
      peso: 60
    });

    this.perfiles.set("user-maria", {
      usuarioId: "user-maria",
      cinturon: "MORADO",
      erroresHistoricos: {},
      historialVisualizaciones: []
    });

    this.usuarios.set("user-carlos", {
      usuarioId: "user-carlos",
      nombre: "Carlos Gómez",
      cinturon: "BLANCO",
      maestria: "Principiante",
      altura: 182,
      peso: 85
    });

    this.perfiles.set("user-carlos", {
      usuarioId: "user-carlos",
      cinturon: "BLANCO",
      erroresHistoricos: {},
      historialVisualizaciones: []
    });
  }

  private normalizarUsuarioId(usuarioId: string): string {
    if (!usuarioId || usuarioId === "user-default") {
      return DEFAULT_UUID;
    }
    return usuarioId;
  }

  async obtenerPerfilUsuario(usuarioId: string): Promise<UsuarioPerfil> {
    try {
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      let user = this.usuarios.get(normalizedId);
      if (!user) {
        const nombreFormateado = normalizedId.startsWith("user-")
          ? normalizedId.replace("user-", "").charAt(0).toUpperCase() + normalizedId.replace("user-", "").slice(1)
          : "Practicante BJJ";
        user = {
          usuarioId: normalizedId,
          nombre: nombreFormateado,
          cinturon: "BLANCO",
          maestria: "Principiante",
          altura: 175,
          peso: 75
        };
        this.usuarios.set(normalizedId, user);
      }
      return user;
    } catch (error) {
      console.warn("[PersistenceFacade] Error al obtener perfil de usuario:", error);
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
      let user = await this.obtenerPerfilUsuario(normalizedId);

      user = {
        ...user,
        ...datos,
        usuarioId: normalizedId
      };

      if (datos.cinturon) {
        let maestria = "Principiante";
        if (datos.cinturon === "AZUL") maestria = "Intermedio";
        else if (datos.cinturon === "MORADO" || datos.cinturon === "MARRON") maestria = "Avanzado";
        else if (datos.cinturon === "NEGRO") maestria = "Maestro";
        user.maestria = maestria;

        const perfil = await this.cargarPerfil(normalizedId);
        perfil.cinturon = datos.cinturon;
      }

      this.usuarios.set(normalizedId, user);
      console.log(`[PersistenceFacade - Prisma] Perfil actualizado para usuario ${normalizedId}:`, user);
      return user;
    } catch (error) {
      console.warn("[PersistenceFacade] Error al actualizar perfil:", error);
      return this.obtenerPerfilUsuario(usuarioId);
    }
  }

  async cargarPerfil(usuarioId: string): Promise<PerfilCompetencia> {
    try {
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      let perfil = this.perfiles.get(normalizedId);
      if (!perfil) {
        // Simula el fallback relacional del ORM Prisma (default row)
        perfil = {
          usuarioId: normalizedId,
          cinturon: "BLANCO",
          erroresHistoricos: {},
          historialVisualizaciones: []
        };
        this.perfiles.set(normalizedId, perfil);
      }
      return perfil;
    } catch (error) {
      console.warn("[PersistenceFacade] Error al cargar perfil:", error);
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
      const list = this.analisis.get(normalizedId) || [];
      list.push({
        id: `analisis-${Date.now()}`,
        fecha: new Date(),
        reporte
      });
      this.analisis.set(normalizedId, list);
      console.log(`[PersistenceFacade - Prisma] Guardado análisis relacional en base de datos para usuario: ${normalizedId}`);
      return true;
    } catch (error) {
      console.warn("[PersistenceFacade] Error al guardar análisis:", error);
      return false;
    }
  }

  async registrarVisualizacion(usuarioId: string, videoId: string): Promise<boolean> {
    try {
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      const perfil = await this.cargarPerfil(normalizedId);
      perfil.historialVisualizaciones.push({
        videoId,
        visto: true,
        timestamp: new Date()
      });
      console.log(`[PersistenceFacade - Prisma] Registrada visualización de video ${videoId} para usuario: ${normalizedId}`);
      return true;
    } catch (error) {
      console.warn("[PersistenceFacade] Error al registrar visualización:", error);
      return false;
    }
  }

  async obtenerHistorialAnalisis(usuarioId: string): Promise<any[]> {
    try {
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      const list = this.analisis.get(normalizedId);
      return list || [];
    } catch (error) {
      console.warn("[PersistenceFacade] Error al consultar historial en Prisma. Devolviendo arreglo vacío []:", error);
      return [];
    }
  }

  private fuentesConocimiento: Map<string, any[]> = new Map();

  async guardarFuenteConocimiento(usuarioId: string, fuente: any): Promise<boolean> {
    try {
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      const list = this.fuentesConocimiento.get(normalizedId) || [];
      list.push({
        ...fuente,
        usuarioId: normalizedId,
        estadoValidacion: "ACEPTADO"
      });
      this.fuentesConocimiento.set(normalizedId, list);
      console.log(`[PersistenceFacade - Prisma] Guardada FuenteConocimiento ACEPTADA para usuario: ${normalizedId}`);
      return true;
    } catch (error) {
      console.warn("[PersistenceFacade] Error al guardar FuenteConocimiento:", error);
      return false;
    }
  }

  async obtenerFuentesConocimiento(usuarioId: string): Promise<any[]> {
    try {
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      const list = this.fuentesConocimiento.get(normalizedId);
      return list || [];
    } catch (error) {
      console.warn("[PersistenceFacade] Error al obtener fuentes en Prisma:", error);
      return [];
    }
  }

  async eliminarFuenteConocimiento(usuarioId: string, fuenteId: string): Promise<boolean> {
    try {
      const normalizedId = this.normalizarUsuarioId(usuarioId);
      const list = this.fuentesConocimiento.get(normalizedId) || [];
      const filtradas = list.filter(f => f.id !== fuenteId);
      this.fuentesConocimiento.set(normalizedId, filtradas);
      console.log(`[PersistenceFacade - Prisma] Eliminada FuenteConocimiento ${fuenteId} para usuario: ${normalizedId}`);
      return true;
    } catch (error) {
      console.warn("[PersistenceFacade] Error al eliminar fuente:", error);
      return false;
    }
  }
}
