import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class PersistenceService {
  /**
   * Obtiene el perfil de un usuario. Si no existe, crea el perfil predeterminado.
   */
  async getUser(id: string = 'default'): Promise<any> {
    let user = await prisma.usuario.findUnique({
      where: { id }
    });

    if (!user) {
      // Perfil de usuario inicial
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

  /**
   * Guarda un análisis biomecánico completo (métricas y errores en cascada).
   */
  async saveAnalysis(userId: string, data: any): Promise<any> {
    // Asegurar que el usuario exista
    await this.getUser(userId);

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
        recomendacionesActivas: [] // Se calculan dinámicamente en el cliente
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
      }))
    };
  }
}
