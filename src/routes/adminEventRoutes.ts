import { Router, RequestHandler } from 'express';
import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} from '../controllers/adminEventController';

const router = Router();

router.post('/', createEvent);
router.get('/', getAllEvents);
router.get('/:eventId', getEventById as RequestHandler);
router.put('/:eventId', updateEvent as RequestHandler);
router.delete('/:eventId', deleteEvent as RequestHandler);

export default router;