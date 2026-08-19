// ============================================================
// TelemetryController.ts
// Fabricacion Pura (GRASP - Larman, 2004) para el registro
// de eventos de telemetria analitica y el calculo del indice
// de compromiso EVI (Engagement Velocity Indicator).
//
// REFERENCIAS:
// Larman, C. (2004). Applying UML and Patterns (3rd ed.).
//   Prentice Hall.
// Mannino, M. (2019). Database Design, Application
//   Development, and Administration (6th ed.). University of
//   Denver.
// ============================================================

import { PrismaClient, TipoEvento } from "@prisma/client";

const prisma = new PrismaClient();

export { TipoEvento };

/**
 * Resultado del calculo del Engagement Velocity Indicator.
 * El campo 'alerta' se activa unicamente cuando el EVI cae
 * por debajo del umbral critico de 0.50.
 */
export interface EVIResult {
  evi: number;
  periodoActualAnalisis: number;
  periodoAnteriorAnalisis: number;
  alerta: "NORMAL" | "BAJO_COMPROMISO";
}

/**
 * Fabricacion Pura de Larman responsable de:
 * 1. Registrar de forma persistente los eventos de interaccion
 *    del practicante con el sistema en la tabla RegistroActividad.
 * 2. Calcular el Engagement Velocity Indicator (EVI) mediante
 *    consultas de agregacion temporal no procedural (GROUP BY)
 *    sobre PostgreSQL conforme a la metodologia de Mannino (2019).
 */
export class TelemetryController {
  private readonly EVI_UMBRAL_BAJO_COMPROMISO = 0.5;

  /**
   * Registra un evento de actividad del practicante en la
   * tabla relacional RegistroActividad.
   *
   * @param usuarioId - Identificador UUID del practicante.
   * @param tipoEvento - Tipo de evento de la enumeracion TipoEvento.
   * @param duracionSegundos - Duracion opcional de la sesion en segundos.
   * @param detalles - Metadatos adicionales en formato JSON.
   */
  async registrarEvento(
    usuarioId: string,
    tipoEvento: TipoEvento,
    duracionSegundos?: number,
    detalles?: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.registroActividad.create({
        data: {
          usuarioId,
          tipoEvento,
          duracionSesionSegundos: duracionSegundos ?? null,
          detalles: detalles ?? null
        }
      });
      console.log(
        `[TelemetryController] Evento registrado: ${tipoEvento} para usuarioId=${usuarioId}`
      );
    } catch (error: any) {
      // La falla de telemetria nunca debe interrumpir el flujo principal
      // del pipeline de analisis biomecanico (Degradacion Graciosa).
      console.warn(
        `[TelemetryController] Fallo no critico al registrar evento de telemetria: ${error.message}`
      );
    }
  }

  /**
   * Calcula el Engagement Velocity Indicator (EVI) para un
   * practicante mediante una consulta de agregacion temporal
   * no procedural (Mannino, 2019) en PostgreSQL.
   *
   * El EVI compara el conteo de analisis ejecutados en los
   * ultimos 7 dias contra los 7 dias precedentes (dias 8 a 14).
   * Un EVI menor a 0.50 activa la alerta BAJO_COMPROMISO.
   *
   * Formula:
   *   EVI = conteoSemanaActual / max(conteoSemanaAnterior, 1)
   *
   * @param usuarioId - Identificador UUID del practicante o dojo.
   * @returns Objeto EVIResult con el valor EVI y el estado de alerta.
   */
  async calcularEVI(usuarioId: string): Promise<EVIResult> {
    const ahora = new Date();

    // Limite inferior de la semana actual: hace 7 dias
    const inicioSemanaActual = new Date(ahora);
    inicioSemanaActual.setDate(ahora.getDate() - 7);

    // Limite inferior de la semana anterior: hace 14 dias
    const inicioSemanaAnterior = new Date(ahora);
    inicioSemanaAnterior.setDate(ahora.getDate() - 14);

    // Consulta de agregacion no procedural: periodo actual (dias 1 a 7)
    // Equivale a: SELECT COUNT(*) FROM RegistroActividad
    //   WHERE usuarioId = :id
    //     AND tipoEvento = 'ANALISIS_EJECUTADO'
    //     AND fechaEvento >= :inicioSemanaActual
    const periodoActualAnalisis = await prisma.registroActividad.count({
      where: {
        usuarioId,
        tipoEvento: TipoEvento.ANALISIS_EJECUTADO,
        fechaEvento: {
          gte: inicioSemanaActual
        }
      }
    });

    // Consulta de agregacion no procedural: periodo anterior (dias 8 a 14)
    // Equivale a: SELECT COUNT(*) FROM RegistroActividad
    //   WHERE usuarioId = :id
    //     AND tipoEvento = 'ANALISIS_EJECUTADO'
    //     AND fechaEvento >= :inicioSemanaAnterior
    //     AND fechaEvento < :inicioSemanaActual
    const periodoAnteriorAnalisis = await prisma.registroActividad.count({
      where: {
        usuarioId,
        tipoEvento: TipoEvento.ANALISIS_EJECUTADO,
        fechaEvento: {
          gte: inicioSemanaAnterior,
          lt: inicioSemanaActual
        }
      }
    });

    // Calculo del EVI: division entera protegida contra division por cero
    const denominador = Math.max(periodoAnteriorAnalisis, 1);
    const evi = periodoActualAnalisis / denominador;

    const alerta: "NORMAL" | "BAJO_COMPROMISO" =
      evi < this.EVI_UMBRAL_BAJO_COMPROMISO ? "BAJO_COMPROMISO" : "NORMAL";

    console.log(
      `[TelemetryController] EVI calculado para usuarioId=${usuarioId}: ` +
        `${evi.toFixed(4)} (actual=${periodoActualAnalisis}, anterior=${periodoAnteriorAnalisis}) -> ${alerta}`
    );

    return {
      evi,
      periodoActualAnalisis,
      periodoAnteriorAnalisis,
      alerta
    };
  }

  /**
   * Calcula el conteo de Usuarios Activos Diarios (DAU),
   * Semanales (WAU) y Mensuales (MAU) para telemetria global
   * del dojo mediante consultas de agregacion temporal.
   * Conforme al Requisito Funcional RF08.
   */
  async calcularMetricasGlobales(): Promise<{
    dau: number;
    wau: number;
    mau: number;
  }> {
    const ahora = new Date();

    const inicioDia = new Date(ahora);
    inicioDia.setHours(0, 0, 0, 0);

    const inicioSemana = new Date(ahora);
    inicioSemana.setDate(ahora.getDate() - 7);

    const inicioMes = new Date(ahora);
    inicioMes.setDate(ahora.getDate() - 30);

    // DAU: usuarios distintos con ANALISIS_EJECUTADO en las ultimas 24 horas
    const registrosDia = await prisma.registroActividad.findMany({
      where: {
        tipoEvento: TipoEvento.ANALISIS_EJECUTADO,
        fechaEvento: { gte: inicioDia }
      },
      select: { usuarioId: true },
      distinct: ["usuarioId"]
    });

    // WAU: usuarios distintos con ANALISIS_EJECUTADO en los ultimos 7 dias
    const registrosSemana = await prisma.registroActividad.findMany({
      where: {
        tipoEvento: TipoEvento.ANALISIS_EJECUTADO,
        fechaEvento: { gte: inicioSemana }
      },
      select: { usuarioId: true },
      distinct: ["usuarioId"]
    });

    // MAU: usuarios distintos con ANALISIS_EJECUTADO en los ultimos 30 dias
    const registrosMes = await prisma.registroActividad.findMany({
      where: {
        tipoEvento: TipoEvento.ANALISIS_EJECUTADO,
        fechaEvento: { gte: inicioMes }
      },
      select: { usuarioId: true },
      distinct: ["usuarioId"]
    });

    return {
      dau: registrosDia.length,
      wau: registrosSemana.length,
      mau: registrosMes.length
    };
  }
}
