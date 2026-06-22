import express from 'express';
import { SessionController } from '../controllers/sessionController';

const router = express.Router();
const controller = new SessionController();

router.post('/analyze', controller.analyzeVideo);
router.get('/history/:userId', controller.getHistory);
router.delete('/analysis/:id', controller.deleteAnalysis);

export default router;
