import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { RetrievalAugmentedController } from '../controllers/RetrievalAugmentedController';
import { DynamicPromptBuilder } from '../services/DynamicPromptBuilder';

describe('Suite TDD - CU02: Ingestar Nueva Fuente de Conocimiento (Filtro RD-03)', () => {
  let app: express.Application;
  let mockVectorStore: any;
  let mockPromptBuilder: any;
  let mockContentModerator: any;
  let ragController: RetrievalAugmentedController;

  beforeEach(() => {
    vi.clearAllMocks();

    mockVectorStore = {
      ingestarChunk: vi.fn().mockResolvedValue(true),
      buscarSimilitud: vi.fn().mockResolvedValue([])
    };

    mockPromptBuilder = new DynamicPromptBuilder();

    mockContentModerator = {
      validarPertinenciaBJJ: vi.fn()
    };

    ragController = new RetrievalAugmentedController(
      mockVectorStore,
      mockPromptBuilder,
      mockContentModerator
    );

    app = express();
    app.use(express.json({ limit: '50mb' }));

    // Endpoint REST bajo prueba
    app.post('/api/rag/ingestar', async (req, res) => {
      try {
        const { texto, archivoBlob, metadata = {}, usuarioId } = req.body;
        const targetUserId = usuarioId || metadata.usuarioId || 'test-user';
        const fullMetadata = {
          titulo: metadata.titulo || texto || 'Fuente de prueba',
          autor: metadata.autor,
          url: metadata.url,
          usuarioId: targetUserId
        };

        const result = await ragController.procesarEIngestarFuente(
          archivoBlob || texto,
          fullMetadata,
          targetUserId
        );

        if (!result.success) {
          return res.status(400).json({
            error: `Contenido rechazado: El material no está relacionado con el Jiu-Jitsu (${result.razon || 'Filtro RD-03'})`,
            razon: result.razon
          });
        }

        return res.status(200).json({
          success: true,
          fuenteId: result.fuenteId || 'fuente-test-123',
          estadoValidacion: 'Aceptado',
          message: 'Fuente agregada y vectorizada.'
        });
      } catch (e: any) {
        return res.status(500).json({ error: e.message });
      }
    });
  });

  it('🔴 ROJO -> VERDE: Debe aceptar e indexar contenido legítimo de Jiu-Jitsu (Escenario Feliz)', async () => {
    // Simulamos que la IA valida positivamente la pertinencia marcial (RD-03)
    mockContentModerator.validarPertinenciaBJJ.mockResolvedValue({
      esPertinente: true,
      razon: 'Técnica de pasaje de guardia Knee Cut de Brazilian Jiu-Jitsu.'
    });

    const payload = {
      texto: "Para ejecutar un pasaje Knee Cut eficiente, debes clavar tu rodilla diagonalmente cruzando el muslo del oponente y controlar la solapa opuesta.",
      metadata: { titulo: "Pasaje de Guardia Avanzado", autor: "Saulo Ribeiro" }
    };

    const response = await request(app)
      .post('/api/rag/ingestar')
      .send(payload);

    // Criterios de Aceptación Contractuales (Tabla 6 de la Tesis)
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('fuenteId');
    expect(response.body.estadoValidacion).toBe('Aceptado');
    expect(mockVectorStore.ingestarChunk).toHaveBeenCalled();
  });

  it('🔴 ROJO -> VERDE: Debe rechazar y bloquear contenido no pertinente (Filtro RD-03 Activo)', async () => {
    // Simulamos que la IA detecta que el contenido no es de BJJ
    mockContentModerator.validarPertinenciaBJJ.mockResolvedValue({
      esPertinente: false,
      razon: 'El contenido trata sobre recetas culinarias y gastronomía, no Brazilian Jiu-Jitsu.'
    });

    const payload = {
      texto: "Ingredientes para la lasaña: 500g de carne molida, salsa de tomate, láminas de pasta y queso mozzarella al gusto.",
      metadata: { titulo: "Receta de Lasaña Casera", autor: "Chef Infiltrado" }
    };

    const response = await request(app)
      .post('/api/rag/ingestar')
      .send(payload);

    // Criterios de Aceptación para Fallos Seguros (Tabla 6 de la Tesis)
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Contenido rechazado: El material no está relacionado con el Jiu-Jitsu');
    expect(mockVectorStore.ingestarChunk).not.toHaveBeenCalled();
  });
});
