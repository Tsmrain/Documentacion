-- CreateEnum
CREATE TYPE "Cinturon" AS ENUM ('BLANCO', 'AZUL', 'MORADO', 'MARRON', 'NEGRO');

-- CreateEnum
CREATE TYPE "CategoriaTecnica" AS ENUM ('GUARDIA', 'PASAJE', 'SUMISION', 'DERRIBO', 'TRANSICION');

-- CreateEnum
CREATE TYPE "SeveridadError" AS ENUM ('LEVE', 'MODERADO', 'CRITICO');

-- CreateEnum
CREATE TYPE "TipoFuente" AS ENUM ('PDF', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "EstadoValidacion" AS ENUM ('ACEPTADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cinturon" "Cinturon" NOT NULL DEFAULT 'BLANCO',
    "altura" DECIMAL(3,2) NOT NULL,
    "peso" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilCompetencia" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "erroresHistoricos" JSONB NOT NULL,

    CONSTRAINT "PerfilCompetencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SesionEntrenamiento" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "SesionEntrenamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalisisBiomecanico" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "tecnicaId" TEXT NOT NULL,
    "severidad" "SeveridadError" NOT NULL,
    "sugerenciaPedagogica" TEXT NOT NULL,

    CONSTRAINT "AnalisisBiomecanico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorBiomecanico" (
    "id" TEXT NOT NULL,
    "analisisId" TEXT NOT NULL,
    "desviacionArticular" TEXT NOT NULL,
    "desviacionGrados" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "ErrorBiomecanico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialVisualizacion" (
    "id" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "visto" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialVisualizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RutaAprendizaje" (
    "id" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "nivelCompetenciaActual" TEXT NOT NULL,
    "drillRecomendado" TEXT NOT NULL,
    "videoYouTubeUrl" TEXT NOT NULL,
    "mensajeAdaptativo" TEXT NOT NULL,

    CONSTRAINT "RutaAprendizaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuenteConocimiento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "autor" TEXT,
    "url" TEXT,
    "tipo" "TipoFuente" NOT NULL,
    "estadoValidacion" "EstadoValidacion" NOT NULL DEFAULT 'ACEPTADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuenteConocimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilCompetencia_usuarioId_key" ON "PerfilCompetencia"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalisisBiomecanico_sesionId_key" ON "AnalisisBiomecanico"("sesionId");

-- CreateIndex
CREATE UNIQUE INDEX "RutaAprendizaje_perfilId_key" ON "RutaAprendizaje"("perfilId");

-- AddForeignKey
ALTER TABLE "PerfilCompetencia" ADD CONSTRAINT "PerfilCompetencia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionEntrenamiento" ADD CONSTRAINT "SesionEntrenamiento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalisisBiomecanico" ADD CONSTRAINT "AnalisisBiomecanico_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "SesionEntrenamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorBiomecanico" ADD CONSTRAINT "ErrorBiomecanico_analisisId_fkey" FOREIGN KEY ("analisisId") REFERENCES "AnalisisBiomecanico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialVisualizacion" ADD CONSTRAINT "HistorialVisualizacion_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "PerfilCompetencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RutaAprendizaje" ADD CONSTRAINT "RutaAprendizaje_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "PerfilCompetencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
