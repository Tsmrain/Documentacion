-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('INICIO_SESION', 'ANALISIS_EJECUTADO', 'LECCION_VISUALIZADA');

-- CreateTable
CREATE TABLE "RegistroActividad" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipoEvento" "TipoEvento" NOT NULL,
    "fechaEvento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duracionSesionSegundos" DECIMAL(10,2),
    "detalles" JSONB,

    CONSTRAINT "RegistroActividad_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RegistroActividad" ADD CONSTRAINT "RegistroActividad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
