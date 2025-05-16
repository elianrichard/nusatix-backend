import { Request, Response, NextFunction } from 'express';
import { Show, Ticket } from '../models';
import { uploadJsonToIpfs } from '../services/ipfsService';
import { convertSolToIdr } from '../services/currencyConverterService';

interface ShowMetadataTemplateInput {
  name: string;
  description: string;
  image_url: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

export const setupShowMetadataTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const showId = parseInt(req.params.showId, 10);
    if (isNaN(showId)) {
      return res.status(400).json({ message: 'Invalid Show ID format' });
    }

    const show = await Show.findByPk(showId);
    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }

    // TODO: validation
    const templateInput: ShowMetadataTemplateInput = req.body;

    const metadataJson = {
      name: templateInput.name,
      description: templateInput.description,
      image: templateInput.image_url, // using url for now
      attributes: templateInput.attributes || [],
    };

    const pinataMetadataName = `Show-${show.show_id}-MetadataTemplate-${Date.now()}.json`;
    const ipfsCid = await uploadJsonToIpfs(metadataJson, { name: pinataMetadataName });

    await show.update({ metadata_template_ipfs_cid: ipfsCid });

    res.status(200).json({
      message: 'Show metadata template uploaded to IPFS and linked successfully.',
      showId: show.show_id,
      metadataTemplateIpfsCid: ipfsCid,
      updatedShow: show,
    });

  } catch (error) {
    next(error);
  }
};

export const createShow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: validation
    const showData = req.body;
    const newShow = await Show.create(showData);
    res.status(201).json(newShow);
  } catch (error) {
    next(error);
  }
};

export const updateShowDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const showId = parseInt(req.params.showId, 10);
    if (isNaN(showId)) {
      return res.status(400).json({ message: 'Invalid Show ID' });
    }
    const show = await Show.findByPk(showId);
    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }
    // TODO: validation
    const updatedShow = await show.update(req.body);
    res.status(200).json(updatedShow);
  } catch (error) {
    next(error);
  }
};

export const getShowById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const showId = parseInt(req.params.showId, 10);
    const userWalletAddress = req.query.user_wallet_address as string | undefined;

    if (isNaN(showId)) {
      return res.status(400).json({ message: 'Invalid Show ID' });
    }
    const show = await Show.findByPk(showId, { include: ['event'] }); // Contoh eager loading event
    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }

    const showPlain = show.toJSON() as any; 
    showPlain.show_idr_price = await convertSolToIdr(showPlain.sol_price);

    if (userWalletAddress) {
      const ownedTicket = await Ticket.findOne({ 
        where: { show_id: showPlain.show_id, owner_wallet_address: userWalletAddress } 
      });
      showPlain.is_owned = !!ownedTicket;
    } else {
      showPlain.is_owned = false;
    }

    if (showPlain.event) {
      showPlain.event.event_idr_price = await convertSolToIdr(showPlain.event.default_sol_price);
    }
  
    res.status(200).json(showPlain);
  } catch (error) {
    next(error);
  }
};

export const getAllShows = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId, active } = req.query;
    const userWalletAddress = req.query.user_wallet_address as string | undefined;

    const whereClause: any = {};
    if (eventId) {
      whereClause.event_id = parseInt(eventId as string, 10);
    }
    if (active === 'true') {
      whereClause.is_active = true;
    } else if (active === 'false') {
      whereClause.is_active = false;
    }

    const shows = await Show.findAll({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: ['event'],
      order: [['show_date', 'ASC'], ['show_start_time', 'ASC']]
    });

    let ownedShowIds = new Set<number>();
    if (userWalletAddress && shows.length > 0) {
      const showIds = shows.map(s => s.show_id);
      const ownedTickets = await Ticket.findAll({
        where: {
          owner_wallet_address: userWalletAddress,
          show_id: showIds
        },
        attributes: ['show_id']
      });
      ownedTickets.forEach(ticket => ownedShowIds.add(ticket.show_id));
    }

    const showsWithDetails = await Promise.all(
      shows.map(async (show) => {
        const showPlain = show.toJSON() as any; 
        showPlain.show_idr_price = await convertSolToIdr(showPlain.sol_price);
        showPlain.is_owned = userWalletAddress ? ownedShowIds.has(showPlain.show_id) : false;

        if (showPlain.event) {
            showPlain.event.event_idr_price = await convertSolToIdr(showPlain.event.default_sol_price);
        }
        return showPlain;
      })
    );
    
    res.status(200).json(showsWithDetails);
  } catch (error) {
    next(error);
  }
};