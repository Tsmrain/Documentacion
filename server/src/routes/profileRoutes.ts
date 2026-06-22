import express from 'express';
import { SessionController } from '../controllers/sessionController';

const router = express.Router();
const controller = new SessionController();

router.get('/:id', controller.getUser);
router.post('/:id', controller.updateUserProfile);

export default router;
