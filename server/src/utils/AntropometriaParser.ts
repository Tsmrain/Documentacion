// ============================================================
// AntropometriaParser.ts
// Utilidad sincrona pura de normalizacion y validacion de datos
// antropometricos del practicante antes de su persistencia en
// la tabla relacional Usuario (PostgreSQL / Prisma ORM).
//
// REFERENCIAS:
// Larman, C. (2004). Applying UML and Patterns (3rd ed.).
//   Prentice Hall. Principio de responsabilidad unica (SRP).
// Mannino, M. (2019). Database Design, Application
//   Development, and Administration (6th ed.). Reglas de
//   validacion de dominio en columnas de tipo Decimal.
// ============================================================

/**
 * Resultado estructurado de la normalizacion antropometrica.
 */
export interface DatosAntropometricosNormalizados {
  alturaM: number;
  pesoKg: number;
}

/**
 * Error de dominio lanzado cuando los valores antropometricos
 * del practicante violan las restricciones de rango fisico
 * definidas en el Diccionario de Datos (Tabla 5, Capitulo IV).
 */
export class ErrorDominioAntropometrico extends Error {
  constructor(campo: string, valor: number, rangoMin: number, rangoMax: number) {
    super(
      `[AntropometriaParser] Valor fuera de rango para el campo "${campo}": ` +
        `se recibio ${valor}, el rango valido es [${rangoMin}, ${rangoMax}].`
    );
    this.name = "ErrorDominioAntropometrico";
  }
}

/**
 * Clase de utilidad sincrona pura (sin efectos secundarios ni
 * llamadas a red o base de datos) que normaliza y valida los
 * datos antropometricos del cliente React antes de su
 * transmision al Servidor Local para persistencia relacional.
 *
 * Responsabilidades:
 * - Convertir la altura del cliente (en centimetros) a metros.
 * - Validar que los valores respeten los rangos de dominio
 *   definidos en el Diccionario de Datos del SRS (Capitulo IV,
 *   seccion 4.3.5.5, Tabla 5).
 */
export class AntropometriaParser {
  // Constantes de dominio conforme al Diccionario de Datos (Tabla 5)
  private static readonly ALTURA_MIN_M = 0.5;
  private static readonly ALTURA_MAX_M = 2.5;
  private static readonly PESO_MIN_KG = 30.0;
  private static readonly PESO_MAX_KG = 250.0;

  /**
   * Convierte y valida los datos antropometricos del practicante.
   *
   * @param alturaCm - Altura del practicante en centimetros (enviada por el cliente React).
   * @param pesoKg - Peso del practicante en kilogramos.
   * @returns Objeto normalizado con altura en metros y peso en kilogramos.
   * @throws ErrorDominioAntropometrico si alguno de los valores viola el rango de dominio.
   */
  static parsearYValidar(
    alturaCm: number,
    pesoKg: number
  ): DatosAntropometricosNormalizados {
    // Conversion sincrona de unidades: centimetros a metros
    const alturaM = alturaCm / 100;

    // Validacion de rango: altura resultante en metros
    if (alturaM < AntropometriaParser.ALTURA_MIN_M || alturaM > AntropometriaParser.ALTURA_MAX_M) {
      throw new ErrorDominioAntropometrico(
        "alturaCm",
        alturaCm,
        AntropometriaParser.ALTURA_MIN_M * 100,
        AntropometriaParser.ALTURA_MAX_M * 100
      );
    }

    // Validacion de rango: peso en kilogramos
    if (pesoKg < AntropometriaParser.PESO_MIN_KG || pesoKg > AntropometriaParser.PESO_MAX_KG) {
      throw new ErrorDominioAntropometrico(
        "pesoKg",
        pesoKg,
        AntropometriaParser.PESO_MIN_KG,
        AntropometriaParser.PESO_MAX_KG
      );
    }

    return {
      alturaM: parseFloat(alturaM.toFixed(2)),
      pesoKg: parseFloat(pesoKg.toFixed(2))
    };
  }

  /**
   * Valida exclusivamente la altura sin realizar conversion de unidades.
   * Util para flujos donde la altura ya se encuentra expresada en metros.
   *
   * @param alturaM - Altura en metros.
   * @throws ErrorDominioAntropometrico si el valor viola el rango de dominio.
   */
  static validarAlturaMt(alturaM: number): void {
    if (alturaM < AntropometriaParser.ALTURA_MIN_M || alturaM > AntropometriaParser.ALTURA_MAX_M) {
      throw new ErrorDominioAntropometrico(
        "alturaM",
        alturaM,
        AntropometriaParser.ALTURA_MIN_M,
        AntropometriaParser.ALTURA_MAX_M
      );
    }
  }

  /**
   * Valida exclusivamente el peso en kilogramos.
   *
   * @param pesoKg - Peso en kilogramos.
   * @throws ErrorDominioAntropometrico si el valor viola el rango de dominio.
   */
  static validarPesoKg(pesoKg: number): void {
    if (pesoKg < AntropometriaParser.PESO_MIN_KG || pesoKg > AntropometriaParser.PESO_MAX_KG) {
      throw new ErrorDominioAntropometrico(
        "pesoKg",
        pesoKg,
        AntropometriaParser.PESO_MIN_KG,
        AntropometriaParser.PESO_MAX_KG
      );
    }
  }
}
