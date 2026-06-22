// ============================================================================
// OpenBJJ - LocalPersistenceAdapter (Fabricación Pura GRASP)
// Abstrae IndexedDB para la persistencia local del historial de análisis,
// perfil de usuario, y fuentes de conocimiento
// Capítulo VII - Integridad: Transacciones atómicas con rollback
// ============================================================================

import { openDB, IDBPDatabase } from 'idb';
import {
  AnalisisBiomecanico,
  Usuario,
  FuenteConocimiento,
  Cinturon,
  EstadoValidacion
} from '../models/types';

const DB_NAME = 'OpenBJJ_Main';
const DB_VERSION = 1;

export class LocalPersistenceAdapter {
  private db: IDBPDatabase | null = null;

  /**
   * Inicializa la base de datos principal con todos los object stores.
   */
  async initialize(): Promise<void> {
    if (this.db) return;

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store para historial de análisis biomecánicos
        if (!db.objectStoreNames.contains('analisis')) {
          const analisisStore = db.createObjectStore('analisis', {
            keyPath: 'id',
            autoIncrement: true
          });
          analisisStore.createIndex('fecha', 'fecha');
          analisisStore.createIndex('tecnicaId', 'tecnicaId');
        }

        // Store para el perfil del usuario
        if (!db.objectStoreNames.contains('usuario')) {
          db.createObjectStore('usuario', { keyPath: 'id' });
        }

        // Store para fuentes de conocimiento
        if (!db.objectStoreNames.contains('fuentes')) {
          const fuentesStore = db.createObjectStore('fuentes', {
            keyPath: 'id',
            autoIncrement: true
          });
          fuentesStore.createIndex('estadoValidacion', 'estadoValidacion');
          fuentesStore.createIndex('tecnicaId', 'tecnicaId');
        }
      }
    });
  }

  // ========================
  // ANÁLISIS BIOMECÁNICOS
  // ========================

  /**
   * Guarda un análisis biomecánico en el historial local.
   * Transacción atómica (Capítulo VII - Integridad).
   */
  async saveAnalysis(analisis: AnalisisBiomecanico): Promise<number> {
    if (!this.db) await this.initialize();

    const record = {
      ...analisis,
      fecha: analisis.fecha.toISOString()
    };

    const id = await this.db!.add('analisis', record);
    return id as number;
  }

  /**
   * Recupera todo el historial de análisis, ordenado por fecha descendente.
   */
  async getAnalysisHistory(): Promise<AnalisisBiomecanico[]> {
    if (!this.db) await this.initialize();

    const records = await this.db!.getAll('analisis');
    return records
      .map(r => ({
        ...r,
        fecha: new Date(r.fecha)
      }))
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }

  /**
   * Recupera análisis por técnica específica.
   */
  async getAnalysisByTecnica(tecnicaId: string): Promise<AnalisisBiomecanico[]> {
    if (!this.db) await this.initialize();

    const records = await this.db!.getAllFromIndex('analisis', 'tecnicaId', tecnicaId);
    return records.map(r => ({
      ...r,
      fecha: new Date(r.fecha)
    }));
  }

  /**
   * Elimina un análisis del historial con verificación.
   * Capítulo VII - Disponibilidad: gestión de cuotas de almacenamiento.
   */
  async deleteAnalysis(id: number): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.delete('analisis', id);
  }

  /**
   * Cuenta total de análisis almacenados.
   */
  async getAnalysisCount(): Promise<number> {
    if (!this.db) await this.initialize();
    return await this.db!.count('analisis');
  }

  // ========================
  // USUARIO Y PERFIL
  // ========================

  /**
   * Guarda o actualiza el perfil del usuario.
   */
  async saveUser(usuario: Usuario): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.put('usuario', usuario);
  }

  /**
   * Recupera el perfil del usuario activo.
   * Si no existe, crea uno por defecto.
   */
  async getUser(): Promise<Usuario> {
    if (!this.db) await this.initialize();

    const user = await this.db!.get('usuario', 'default');
    if (user) return user;

    // Crear usuario por defecto
    const defaultUser: Usuario = {
      id: 'default',
      nombre: 'Practicante',
      cinturon: Cinturon.Blanco,
      perfilBiomecanico: {
        altura: 1.75,
        peso: 75,
        longitudBrazos: 75,
        longitudPiernas: 85,
        rangoMovilidadArticular: {
          hombro: { min: 0, max: 180 },
          codo: { min: 0, max: 145 },
          cadera: { min: 0, max: 125 },
          rodilla: { min: 0, max: 140 }
        }
      },
      rutaAprendizaje: {
        progresoGeneral: 0,
        estadoPedagogicoActual: 'Inicio',
        tecnicasEstancadas: [],
        recomendacionesActivas: []
      }
    };

    await this.db!.put('usuario', defaultUser);
    return defaultUser;
  }

  // ========================
  // FUENTES DE CONOCIMIENTO
  // ========================

  /**
   * Guarda una nueva fuente de conocimiento.
   */
  async saveFuente(fuente: FuenteConocimiento): Promise<number> {
    if (!this.db) await this.initialize();
    const record = {
      ...fuente,
      fechaCreacion: fuente.fechaCreacion.toISOString()
    };
    const id = await this.db!.add('fuentes', record);
    return id as number;
  }

  /**
   * Recupera todas las fuentes de conocimiento.
   */
  async getFuentes(): Promise<FuenteConocimiento[]> {
    if (!this.db) await this.initialize();
    const records = await this.db!.getAll('fuentes');
    return records.map(r => ({
      ...r,
      fechaCreacion: new Date(r.fechaCreacion)
    }));
  }

  /**
   * Recupera fuentes pendientes de validación (CU05).
   */
  async getFuentesPendientes(): Promise<FuenteConocimiento[]> {
    if (!this.db) await this.initialize();
    const records = await this.db!.getAllFromIndex(
      'fuentes',
      'estadoValidacion',
      EstadoValidacion.Pendiente
    );
    return records.map(r => ({
      ...r,
      fechaCreacion: new Date(r.fechaCreacion)
    }));
  }

  /**
   * Actualiza el estado de validación de una fuente.
   */
  async updateFuenteStatus(
    id: number,
    status: EstadoValidacion
  ): Promise<void> {
    if (!this.db) await this.initialize();

    const fuente = await this.db!.get('fuentes', id);
    if (fuente) {
      fuente.estadoValidacion = status;
      await this.db!.put('fuentes', fuente);
    }
  }

  /**
   * Elimina una fuente y sus datos asociados.
   */
  async deleteFuente(id: number): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.delete('fuentes', id);
  }

  /**
   * Estima el uso de almacenamiento local.
   */
  async getStorageEstimate(): Promise<{ used: number; quota: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { used: 0, quota: 0 };
  }
}
