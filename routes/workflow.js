import { Router } from 'express';
import { approveWorkflow, createWorkflow, rejectWorkflow } from '../controllers/workflow';

const router = Router();

router.post('/', createWorkflow);
router.post('/:id/rephrase', rephraseWorkflowSteps);
router.post('/:id/approve', approveWorkflow);
router.post('/:id/reject', rejectWorkflow);

export default router;