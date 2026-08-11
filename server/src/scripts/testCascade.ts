import { PrismaClient, Cinturon, SeveridadError, TipoFuente } from '@prisma/client';

const prisma = new PrismaClient();
const TEST_USER_ID = '99999999-9999-9999-9999-999999999999';

async function runCascadeTest() {
  console.log('[TestCascade] Iniciando prueba de integridad referencial en cascada para 8 tablas...');

  try {
    await prisma.usuario.deleteMany({
      where: { id: TEST_USER_ID }
    });

    const usuarioCreado = await prisma.usuario.create({
      data: {
        id: TEST_USER_ID,
        nombre: 'Usuario Prueba Cascade',
        email: 'cascade-test@openbjj.org',
        cinturon: Cinturon.AZUL,
        altura: 1.80,
        peso: 80,
        perfilCompetencia: {
          create: {
            erroresHistoricos: { codo_derecho: 4 },
            rutaAprendizaje: {
              create: {
                nivelCompetenciaActual: 'Intermedio',
                drillRecomendado: 'Drill de Escape de Montada',
                videoYouTubeUrl: 'https://youtube.com/watch?v=escape-montada',
                mensajeAdaptativo: 'Mantener cadera activa'
              }
            },
            historialVisualizaciones: {
              create: {
                videoId: 'video-test-123',
                visto: true
              }
            }
          }
        },
        fuentes: {
          create: {
            titulo: 'Video RAG Test',
            url: 'https://youtube.com/watch?v=rag-test',
            tipo: TipoFuente.YOUTUBE
          }
        },
        sesiones: {
          create: {
            analisis: {
              create: {
                tecnicaId: 'pasaje-guardia',
                severidad: SeveridadError.MODERADO,
                sugerenciaPedagogica: 'Mantener base amplia al pasar guardia.',
                erroresDetectados: {
                  create: {
                    desviacionArticular: 'cadera_izquierda',
                    desviacionGrados: 25.5
                  }
                }
              }
            }
          }
        }
      },
      include: {
        perfilCompetencia: {
          include: {
            rutaAprendizaje: true,
            historialVisualizaciones: true
          }
        },
        fuentes: true,
        sesiones: {
          include: {
            analisis: {
              include: {
                erroresDetectados: true
              }
            }
          }
        }
      }
    });

    console.log('[TestCascade] Usuario de prueba e hijos creados exitosamente en PostgreSQL. ID: ' + usuarioCreado.id);

    await prisma.usuario.delete({
      where: { id: TEST_USER_ID }
    });

    console.log('[TestCascade] Registro principal Usuario eliminado. Verificando purga de tablas dependientes...');

    const countPerfil = await prisma.perfilCompetencia.count({ where: { usuarioId: TEST_USER_ID } });
    const countRuta = await prisma.rutaAprendizaje.count({ where: { perfil: { usuarioId: TEST_USER_ID } } });
    const countSesion = await prisma.sesionEntrenamiento.count({ where: { usuarioId: TEST_USER_ID } });
    const countAnalisis = await prisma.analisisBiomecanico.count({ where: { sesion: { usuarioId: TEST_USER_ID } } });
    const countError = await prisma.errorBiomecanico.count({ where: { analisis: { sesion: { usuarioId: TEST_USER_ID } } } });
    const countHistorial = await prisma.historialVisualizacion.count({ where: { perfil: { usuarioId: TEST_USER_ID } } });
    const countFuente = await prisma.fuenteConocimiento.count({ where: { usuarioId: TEST_USER_ID } });

    if (countPerfil > 0) throw new Error("Fallo de integridad referencial: Registros huerfanos detectados en la tabla PerfilCompetencia");
    if (countRuta > 0) throw new Error("Fallo de integridad referencial: Registros huerfanos detectados en la tabla RutaAprendizaje");
    if (countSesion > 0) throw new Error("Fallo de integridad referencial: Registros huerfanos detectados en la tabla SesionEntrenamiento");
    if (countAnalisis > 0) throw new Error("Fallo de integridad referencial: Registros huerfanos detectados en la tabla AnalisisBiomecanico");
    if (countError > 0) throw new Error("Fallo de integridad referencial: Registros huerfanos detectados en la tabla ErrorBiomecanico");
    if (countHistorial > 0) throw new Error("Fallo de integridad referencial: Registros huerfanos detectados en la tabla HistorialVisualizacion");
    if (countFuente > 0) throw new Error("Fallo de integridad referencial: Registros huerfanos detectados en la tabla FuenteConocimiento");

    console.log("Prueba de Integridad Referencial en Cascada Completada con Exito para las 8 tablas de Dominio");
  } catch (error: any) {
    console.error('[TestCascade] Error durante la ejecucion de la prueba: ' + error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runCascadeTest();
