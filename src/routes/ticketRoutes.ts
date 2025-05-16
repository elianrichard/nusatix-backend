import { Router, RequestHandler } from 'express';
import { prepareTicketForPurchase, finalizeTicketPurchase, getUserTickets } from '../controllers/ticketController';

const router = Router();

router.post('/prepare', prepareTicketForPurchase as RequestHandler);
router.post('/finalize', finalizeTicketPurchase as RequestHandler);
router.get('/users/:userWalletAddress', getUserTickets as RequestHandler);


export default router;
