import express from 'express';
import { RagController } from '../controllers/ragController';

const router = express.Router();
const controller = new RagController();

router.post('/ingest', controller.ingest);
router.post('/validate', controller.validate);
router.get('/stats', controller.getStats);
router.get('/fuentes', controller.getFuentes);
router.get('/fuentes/pendientes', controller.getFuentesPendientes);
router.delete('/fuente/:id', controller.deleteFuente);

export default router;
