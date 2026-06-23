import express from 'express';
import { SessionController } from '../controllers/sessionController';

const router = express.Router();
const controller = new SessionController();

router.post('/analyze', controller.analyzeVideo);
router.post('/video-view', controller.registerVideoView);
router.get('/history/:userId', controller.getHistory);
router.get('/compare-technique/:tecnicaId/:userId', controller.compareTechnique);
router.delete('/analysis/:id', controller.deleteAnalysis);

export default router;
