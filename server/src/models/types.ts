export enum Cinturon {
  Blanco = 'Blanco',
  Azul = 'Azul',
  Morado = 'Morado',
  Marron = 'Marrón',
  Negro = 'Negro'
}

export enum Severidad {
  Leve = 'leve',
  Moderado = 'moderado',
  Critico = 'critico'
}

export enum EstadoValidacion {
  Pendiente = 'Pendiente',
  Validado = 'Validado',
  Rechazado = 'Rechazado'
}

export enum TipoRecurso {
  Tecnica = 'tecnica',
  Drill = 'drill',
  ExplicacionAnatomica = 'explicacion_anatomica'
}

export enum TipoFuente {
  ManualPDF = 'ManualPDF',
  VideoYouTube = 'VideoYouTube'
}

export enum TipoEstrategia {
  Tecnica = 'tecnica',
  Drill = 'drill',
  ExplicacionAnatomica = 'explicacion_anatomica'
}

export interface CheckpointTecnico {
  fase: string;
  articulacion: string;
  anguloArticularIdeal: number;
  toleranciaGrados: number;
}

export interface Tecnica {
  id: string;
  nombre: string;
  categoria: string;
  cinturonRequerido: Cinturon;
  checkpoints: CheckpointTecnico[];
}

export const TECNICAS_BJJ: Tecnica[] = [
  {
    id: 'guardia-cerrada',
    nombre: 'Guardia Cerrada',
    categoria: 'Guardia',
    cinturonRequerido: Cinturon.Blanco,
    checkpoints: [
      { fase: 'Control', articulacion: 'cadera', anguloArticularIdeal: 90, toleranciaGrados: 15 },
      { fase: 'Control', articulacion: 'rodilla', anguloArticularIdeal: 45, toleranciaGrados: 15 },
      { fase: 'Agarre', articulacion: 'codo', anguloArticularIdeal: 90, toleranciaGrados: 15 }
    ]
  },
  {
    id: 'montada',
    nombre: 'Montada',
    categoria: 'Posición Dominante',
    cinturonRequerido: Cinturon.Blanco,
    checkpoints: [
      { fase: 'Base', articulacion: 'cadera', anguloArticularIdeal: 110, toleranciaGrados: 15 },
      { fase: 'Base', articulacion: 'rodilla', anguloArticularIdeal: 72, toleranciaGrados: 15 },
      { fase: 'Postura', articulacion: 'espalda', anguloArticularIdeal: 170, toleranciaGrados: 10 }
    ]
  },
  {
    id: 'control-lateral',
    nombre: 'Control Lateral (Side Control)',
    categoria: 'Posición Dominante',
    cinturonRequerido: Cinturon.Blanco,
    checkpoints: [
      { fase: 'Presión', articulacion: 'cadera', anguloArticularIdeal: 85, toleranciaGrados: 15 },
      { fase: 'Presión', articulacion: 'hombro', anguloArticularIdeal: 45, toleranciaGrados: 15 },
      { fase: 'Control', articulacion: 'codo', anguloArticularIdeal: 90, toleranciaGrados: 15 }
    ]
  },
  {
    id: 'escape-montada',
    nombre: 'Escape de Montada (Upa)',
    categoria: 'Escape',
    cinturonRequerido: Cinturon.Blanco,
    checkpoints: [
      { fase: 'Puente', articulacion: 'cadera', anguloArticularIdeal: 160, toleranciaGrados: 15 },
      { fase: 'Puente', articulacion: 'rodilla', anguloArticularIdeal: 90, toleranciaGrados: 15 },
      { fase: 'Giro', articulacion: 'hombro', anguloArticularIdeal: 45, toleranciaGrados: 20 }
    ]
  },
  {
    id: 'raspado-tijera',
    nombre: 'Raspado de Tijera (Scissor Sweep)',
    categoria: 'Raspado',
    cinturonRequerido: Cinturon.Blanco,
    checkpoints: [
      { fase: 'Guardia', articulacion: 'cadera', anguloArticularIdeal: 90, toleranciaGrados: 15 },
      { fase: 'Corte', articulacion: 'rodilla', anguloArticularIdeal: 170, toleranciaGrados: 15 },
      { fase: 'Tracción', articulacion: 'codo', anguloArticularIdeal: 80, toleranciaGrados: 15 }
    ]
  },
  {
    id: 'armbar',
    nombre: 'Armbar (Llave de Brazo)',
    categoria: 'Sumisión',
    cinturonRequerido: Cinturon.Azul,
    checkpoints: [
      { fase: 'Aislamiento', articulacion: 'cadera', anguloArticularIdeal: 90, toleranciaGrados: 15 },
      { fase: 'Control', articulacion: 'rodilla', anguloArticularIdeal: 45, toleranciaGrados: 10 },
      { fase: 'Extensión', articulacion: 'codo_oponente', anguloArticularIdeal: 180, toleranciaGrados: 10 }
    ]
  },
  {
    id: 'triangle-choke',
    nombre: 'Triángulo (Triangle Choke)',
    categoria: 'Sumisión',
    cinturonRequerido: Cinturon.Azul,
    checkpoints: [
      { fase: 'Encuadre', articulacion: 'cadera', anguloArticularIdeal: 95, toleranciaGrados: 15 },
      { fase: 'Cierre', articulacion: 'rodilla', anguloArticularIdeal: 35, toleranciaGrados: 10 },
      { fase: 'Ángulo', articulacion: 'hombro', anguloArticularIdeal: 45, toleranciaGrados: 15 }
    ]
  },
  {
    id: 'pasaje-guardia',
    nombre: 'Pasaje de Guardia',
    categoria: 'Pasaje',
    cinturonRequerido: Cinturon.Azul,
    checkpoints: [
      { fase: 'Postura', articulacion: 'espalda', anguloArticularIdeal: 170, toleranciaGrados: 10 },
      { fase: 'Base', articulacion: 'rodilla', anguloArticularIdeal: 90, toleranciaGrados: 15 },
      { fase: 'Presión', articulacion: 'cadera', anguloArticularIdeal: 70, toleranciaGrados: 15 }
    ]
  }
];

export interface Usuario {
  id: string;
  nombre: string;
  cinturon: Cinturon;
  perfilBiomecanico?: PerfilBiomecanico;
  rutaAprendizaje?: RutaAprendizaje;
}

export interface PerfilBiomecanico {
  altura: number;
  peso: number;
  longitudBrazos: number;
  longitudPiernas: number;
  rangoMovilidadArticular: Record<string, { min: number; max: number }>;
}

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface MetricaCinematica {
  frameIndex: number;
  articulacion: string;
  anguloMedido: number;
  velocidadMedida: number;
  aceleracionMedida: number;
}

export interface ErrorBiomecanico {
  articulacion: string;
  anguloMedido: number;
  anguloIdeal: number;
  desviacion: number;
  severidad: Severidad;
  descripcionFallo: string;
  esRecurrente: boolean;
  recomendacion: string;
}

export interface RecomendacionAdaptativa {
  tipoEstrategia: TipoEstrategia;
  contenido: string;
}

export interface RutaAprendizaje {
  progresoGeneral: number;
  estadoPedagogicoActual: string;
  tecnicasEstancadas: string[];
  recomendacionesActivas: RecomendacionAdaptativa[];
}

export interface FighterAnalysis {
  role: string;
  status: 'approved' | 'correction_needed';
  summary: string;
  techniques: string[];
  mistakes: string[];
  tips: string[];
  reference: {
    book: string;
    technique: string;
    belt: string;
    quote: string;
  };
  youtube_query: string;
}

export interface AnalisisBiomecanico {
  id?: number;
  fecha: Date;
  tecnicaId: string;
  tecnicaNombre: string;
  puntuacionGeneral: number;
  metricas: MetricaCinematica[];
  errores: ErrorBiomecanico[];
  puntosFuertes: string[];
  recomendacionAdaptativa: RecomendacionAdaptativa;
  proximaTecnicaSugerida: string;
  landmarks?: Landmark3D[][];
  fighters?: FighterAnalysis[];
}

export interface GeminiEvaluationResponse {
  puntuacionGeneral: number;
  errores: {
    articulacion: string;
    anguloMedido: number;
    anguloIdeal: number;
    desviacion: number;
    severidad: string;
    descripcion: string;
    recomendacion: string;
  }[];
  puntosFuertes: string[];
  recomendacionAdaptativa: {
    tipoEstrategia: string;
    contenido: string;
  };
  proximaTecnicaSugerida: string;
  fighters?: FighterAnalysis[];
}

