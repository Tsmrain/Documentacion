import { PrismaClient } from '@prisma/client';
import { TECNICAS_BJJ } from '../models/types';

const prisma = new PrismaClient();

export class PersistenceService {
  private static seedPromise: Promise<void> | null = null;

  constructor() {
    // Inicializar la base de datos de técnicas (seed automático)
    if (!PersistenceService.seedPromise) {
      PersistenceService.seedPromise = this.seedInitialTechniques().catch(err => {
        console.error('❌ Error al realizar el seed de técnicas:', err);
        PersistenceService.seedPromise = null;
      });
    }
  }

  /**
   * Pre-pobla la tabla Tecnica con el catálogo original de BJJ si está vacía.
   */
  async seedInitialTechniques(): Promise<void> {
    const existing = await prisma.tecnica.findMany({
      where: { esCustom: false }
    });

    const existingIds = existing.map(e => e.id);
    const catalogIds = TECNICAS_BJJ.map(t => t.id);

    const hasDiscrepancy = existingIds.some(id => !catalogIds.includes(id)) || catalogIds.some(id => !existingIds.includes(id));

    if (hasDiscrepancy || existing.length === 0) {
      console.log('🌱 Actualizando catálogo de posiciones de BJJ en SQLite...');
      
      await prisma.tecnica.deleteMany({
        where: { esCustom: false }
      });

      for (const t of TECNICAS_BJJ) {
        await prisma.tecnica.create({
          data: {
            id: t.id,
            nombre: t.nombre,
            categoria: t.categoria,
            cinturonRequerido: t.cinturonRequerido,
            checkpoints: JSON.stringify(t.checkpoints),
            esCustom: false,
            descripcion: `Especificación biomecánica estándar para la posición de ${t.nombre}`
          }
        });
      }
      console.log('✅ Catálogo de posiciones prepoblado y sincronizado con éxito');
    }
  }

  /**
   * Obtiene el perfil de un usuario. Si no existe, crea el perfil predeterminado.
   */
  async getUser(id: string = 'default'): Promise<any> {
    let user = await prisma.usuario.findUnique({
      where: { id }
    });

    if (!user) {
      const defaultUser = {
        id,
        nombre: 'Practicante',
        cinturon: 'Blanco',
        altura: 1.75,
        peso: 75,
        longitudBrazos: 75,
        longitudPiernas: 85,
        rangoMovilidadArticular: JSON.stringify({
          hombro: { min: 0, max: 180 },
          codo: { min: 0, max: 145 },
          cadera: { min: 0, max: 125 },
          rodilla: { min: 0, max: 140 }
        }),
        progresoGeneral: 0,
        estadoPedagogicoActual: 'Inicio',
        tecnicasEstancadas: ''
      };

      user = await prisma.usuario.create({
        data: defaultUser
      });
    }

    return this.parseUser(user);
  }

  /**
   * Actualiza el perfil de un usuario.
   */
  async saveUser(id: string, data: any): Promise<any> {
    const updateData: any = {};
    if (data.nombre !== undefined) updateData.nombre = data.nombre;
    if (data.cinturon !== undefined) updateData.cinturon = data.cinturon;
    if (data.altura !== undefined) updateData.altura = Number(data.altura);
    if (data.peso !== undefined) updateData.peso = Number(data.peso);
    if (data.longitudBrazos !== undefined) updateData.longitudBrazos = Number(data.longitudBrazos);
    if (data.longitudPiernas !== undefined) updateData.longitudPiernas = Number(data.longitudPiernas);
    if (data.rangoMovilidadArticular !== undefined) {
      updateData.rangoMovilidadArticular = typeof data.rangoMovilidadArticular === 'string'
        ? data.rangoMovilidadArticular
        : JSON.stringify(data.rangoMovilidadArticular);
    }
    if (data.progresoGeneral !== undefined) updateData.progresoGeneral = Number(data.progresoGeneral);
    if (data.estadoPedagogicoActual !== undefined) updateData.estadoPedagogicoActual = data.estadoPedagogicoActual;
    if (data.tecnicasEstancadas !== undefined) {
      updateData.tecnicasEstancadas = Array.isArray(data.tecnicasEstancadas)
        ? data.tecnicasEstancadas.join(',')
        : data.tecnicasEstancadas;
    }

    const user = await prisma.usuario.update({
      where: { id },
      data: updateData
    });

    return this.parseUser(user);
  }

  // ========================
  // TÉCNICAS (AUTODETECCIÓN Y ZERO-SHOT)
  // ========================

  /**
   * Obtiene una técnica por ID de la base de datos SQLite.
   */
  async getTecnica(id: string): Promise<any | null> {
    const tecnica = await prisma.tecnica.findUnique({
      where: { id }
    });
    if (!tecnica) return null;
    return {
      ...tecnica,
      checkpoints: JSON.parse(tecnica.checkpoints)
    };
  }

  /**
   * Guarda una nueva técnica descubierta dinámicamente (Zero-Shot Discovery).
   */
  async saveCustomTecnica(data: {
    id: string;
    nombre: string;
    categoria: string;
    cinturonRequerido: string;
    checkpoints: any[];
    descripcion: string;
  }): Promise<any> {
    return await prisma.tecnica.create({
      data: {
        id: data.id,
        nombre: data.nombre,
        categoria: data.categoria,
        cinturonRequerido: data.cinturonRequerido,
        checkpoints: JSON.stringify(data.checkpoints),
        esCustom: true,
        descripcion: data.descripcion
      }
    });
  }

  // ========================
  // ANÁLISIS BIOMECÁNICOS
  // ========================

  /**
   * Guarda un análisis biomecánico completo (métricas y errores en cascada).
   */
  async saveAnalysis(userId: string, data: any): Promise<any> {
    await this.getUser(userId);

    // Asegurarse de que la técnica esté en SQLite (para evitar fallo de foreign key)
    const tecnicaExists = await this.getTecnica(data.tecnicaId);
    if (!tecnicaExists) {
      // Si la técnica no existe (por ejemplo, autodetectada y no persistida aún),
      // guardamos una técnica básica por defecto para que funcione la integridad relacional
      await this.saveCustomTecnica({
        id: data.tecnicaId,
        nombre: data.tecnicaNombre || data.tecnicaId,
        categoria: 'General',
        cinturonRequerido: 'Blanco',
        checkpoints: [],
        descripcion: 'Técnica registrada automáticamente.'
      });
    }

    const result = await prisma.analisisBiomecanico.create({
      data: {
        tecnicaId: data.tecnicaId,
        tecnicaNombre: data.tecnicaNombre,
        puntuacionGeneral: data.puntuacionGeneral,
        puntosFuertes: JSON.stringify(data.puntosFuertes || []),
        proximaTecnicaSugerida: data.proximaTecnicaSugerida || '',
        recomendacionEstrategia: data.recomendacionAdaptativa?.tipoEstrategia || 'tecnica',
        recomendacionContenido: data.recomendacionAdaptativa?.contenido || '',
        usuarioId: userId,
        fightersJson: JSON.stringify(data.fighters || []),
        metricas: {
          create: (data.metricas || []).map((m: any) => ({
            frameIndex: m.frameIndex,
            articulacion: m.articulacion,
            anguloMedido: m.anguloMedido,
            velocidadMedida: m.velocidadMedida,
            aceleracionMedida: m.aceleracionMedida
          }))
        },
        errores: {
          create: (data.errores || []).map((e: any) => ({
            articulacion: e.articulacion,
            anguloMedido: e.anguloMedido,
            anguloIdeal: e.anguloIdeal,
            desviacion: e.desviacion,
            severidad: e.severidad,
            descripcionFallo: e.descripcionFallo || e.descripcion || '',
            esRecurrente: e.esRecurrente ?? false,
            recomendacion: e.recomendacion
          }))
        }
      },
      include: {
        metricas: true,
        errores: true
      }
    });

    return this.parseAnalysis(result);
  }

  /**
   * Recupera todo el historial de análisis de un usuario.
   */
  async getAnalysisHistory(userId: string): Promise<any[]> {
    const list = await prisma.analisisBiomecanico.findMany({
      where: { usuarioId: userId },
      orderBy: { fecha: 'desc' },
      include: {
        metricas: true,
        errores: true
      }
    });

    return list.map(item => this.parseAnalysis(item));
  }

  /**
   * Recupera los análisis de una técnica específica para identificar recurrencia.
   */
  async getAnalysisByTecnica(userId: string, tecnicaId: string): Promise<any[]> {
    const list = await prisma.analisisBiomecanico.findMany({
      where: {
        usuarioId: userId,
        tecnicaId
      },
      orderBy: { fecha: 'desc' },
      include: {
        metricas: true,
        errores: true
      }
    });

    return list.map(item => this.parseAnalysis(item));
  }

  /**
   * Obtiene un análisis específico por su ID.
   */
  async getAnalysisById(id: number): Promise<any | null> {
    const item = await prisma.analisisBiomecanico.findUnique({
      where: { id },
      include: {
        metricas: true,
        errores: true
      }
    });
    return this.parseAnalysis(item);
  }

  /**
   * Actualiza las métricas y errores principales de un análisis para vincularlo a un luchador específico.
   */
  async updateAnalysisFighter(id: number, score: number, errors: any[], fighters: any[], nextTecnica: string): Promise<any> {
    // 1. Eliminar errores antiguos de la tabla de relaciones
    await prisma.errorBiomecanico.deleteMany({
      where: { analisisId: id }
    });

    // 2. Actualizar datos de puntuación y recrear relaciones de errores
    const result = await prisma.analisisBiomecanico.update({
      where: { id },
      data: {
        puntuacionGeneral: score,
        proximaTecnicaSugerida: nextTecnica,
        fightersJson: JSON.stringify(fighters),
        errores: {
          create: errors.map(e => ({
            articulacion: e.articulacion,
            anguloMedido: Number(e.anguloMedido || 0),
            anguloIdeal: Number(e.anguloIdeal || 0),
            desviacion: Number(e.desviacion || 0),
            severidad: e.severidad || 'leve',
            descripcionFallo: e.descripcionFallo || e.descripcion || '',
            esRecurrente: false,
            recomendacion: e.recomendacion || ''
          }))
        }
      },
      include: {
        metricas: true,
        errores: true
      }
    });

    return this.parseAnalysis(result);
  }

  /**
   * Elimina un análisis específico.
   */
  async deleteAnalysis(id: number): Promise<void> {
    await prisma.analisisBiomecanico.delete({
      where: { id }
    });
  }

  // ========================
  // FUENTES DE CONOCIMIENTO (RAG)
  // ========================

  async saveFuente(data: any): Promise<any> {
    return await prisma.fuenteConocimiento.create({
      data: {
        titulo: data.titulo,
        tipo: data.tipo,
        estadoValidacion: data.estadoValidacion,
        tecnicaId: data.tecnicaId,
        fechaCreacion: data.fechaCreacion ? new Date(data.fechaCreacion) : new Date(),
        contenidoOriginal: data.contenidoOriginal,
        numeroPaginas: data.numeroPaginas,
        isbn: data.isbn,
        duracionSegundos: data.duracionSegundos,
        canalAutor: data.canalAutor,
        youtubeUrl: data.youtubeUrl
      }
    });
  }

  async getFuentes(): Promise<any[]> {
    return await prisma.fuenteConocimiento.findMany({
      orderBy: { fechaCreacion: 'desc' }
    });
  }

  async getFuentesPendientes(): Promise<any[]> {
    return await prisma.fuenteConocimiento.findMany({
      where: { estadoValidacion: 'Pendiente' },
      orderBy: { fechaCreacion: 'desc' }
    });
  }

  async updateFuenteStatus(id: number, status: string): Promise<void> {
    await prisma.fuenteConocimiento.update({
      where: { id },
      data: { estadoValidacion: status }
    });
  }

  async deleteFuente(id: number): Promise<void> {
    await prisma.fuenteConocimiento.delete({
      where: { id }
    });
  }

  async getFuente(id: number): Promise<any | null> {
    return await prisma.fuenteConocimiento.findUnique({
      where: { id }
    });
  }

  async getValidatedFuenteByTecnica(tecnicaId: string): Promise<any | null> {
    return await prisma.fuenteConocimiento.findFirst({
      where: {
        tecnicaId,
        estadoValidacion: 'Validado'
      }
    });
  }

  // ========================
  // HISTORIAL DE VISUALIZACIÓN DE VIDEOS (CU10)
  // ========================

  /**
   * Registra una visualización de video de YouTube para el perfil adaptativo.
   */
  async saveVideoView(usuarioId: string, videoUrl: string, tecnicaId: string): Promise<any> {
    return await prisma.historialVisualizacion.create({
      data: {
        usuarioId,
        videoUrl,
        tecnicaId
      }
    });
  }

  /**
   * Obtiene la lista de videos vistos por el usuario.
   */
  async getWatchedVideos(usuarioId: string): Promise<any[]> {
    return await prisma.historialVisualizacion.findMany({
      where: { usuarioId },
      orderBy: { fechaVisualizacion: 'desc' }
    });
  }

  /**
   * Obtiene la lista de todos los usuarios registrados en el sistema.
   */
  async listUsers(): Promise<any[]> {
    const list = await prisma.usuario.findMany({
      orderBy: { nombre: 'asc' }
    });
    return list.map(u => this.parseUser(u));
  }

  // ========================
  // PARSER UTILITIES
  // ========================

  private parseUser(user: any) {
    if (!user) return null;
    return {
      id: user.id,
      nombre: user.nombre,
      cinturon: user.cinturon,
      perfilBiomecanico: {
        altura: user.altura,
        peso: user.peso,
        longitudBrazos: user.longitudBrazos,
        longitudPiernas: user.longitudPiernas,
        rangoMovilidadArticular: user.rangoMovilidadArticular ? JSON.parse(user.rangoMovilidadArticular) : {}
      },
      rutaAprendizaje: {
        progresoGeneral: user.progresoGeneral,
        estadoPedagogicoActual: user.estadoPedagogicoActual,
        tecnicasEstancadas: user.tecnicasEstancadas ? user.tecnicasEstancadas.split(',').filter(Boolean) : [],
        recomendacionesActivas: []
      }
    };
  }

  private parseAnalysis(item: any) {
    if (!item) return null;
    return {
      id: item.id,
      fecha: item.fecha,
      tecnicaId: item.tecnicaId,
      tecnicaNombre: item.tecnicaNombre,
      puntuacionGeneral: item.puntuacionGeneral,
      puntosFuertes: item.puntosFuertes ? JSON.parse(item.puntosFuertes) : [],
      proximaTecnicaSugerida: item.proximaTecnicaSugerida,
      recomendacionAdaptativa: {
        tipoEstrategia: item.recomendacionEstrategia,
        contenido: item.recomendacionContenido
      },
      metricas: item.metricas || [],
      errores: (item.errores || []).map((e: any) => ({
        articulacion: e.articulacion,
        anguloMedido: e.anguloMedido,
        anguloIdeal: e.anguloIdeal,
        desviacion: e.desviacion,
        severidad: e.severidad,
        descripcionFallo: e.descripcionFallo,
        esRecurrente: e.esRecurrente,
        recomendacion: e.recomendacion
      })),
      fighters: item.fightersJson ? JSON.parse(item.fightersJson) : []
    };
  }
}
