import { Router, RequestHandler } from 'express';
import { 
    createShow, 
    setupShowMetadataTemplate,
    updateShowDetails,
    getShowById,
    getAllShows
} from '../controllers/adminShowController';

const router = Router();

router.post('/', createShow); 
router.get('/', getAllShows);
router.get('/:showId', getShowById as RequestHandler );
router.put('/:showId', updateShowDetails as RequestHandler);
router.post('/:showId/metadata-template', setupShowMetadataTemplate as RequestHandler);

export default router;