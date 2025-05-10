import { Router, RequestHandler } from 'express';
import { mintTicket } from '../controllers/ticketController';

const router = Router();

router.post('/mint', mintTicket as RequestHandler);

export default router;