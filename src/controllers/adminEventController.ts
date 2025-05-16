import { Request, Response, NextFunction } from 'express';
import { Event, Show } from '../models';
import { EventCreationAttributes, EventAttributes } from '../models/eventModel';
import { convertSolToIdr } from '../services/currencyConverterService';

export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: validation
    const eventData: EventCreationAttributes = req.body;
    const newEvent = await Event.create(eventData);
    res.status(201).json(newEvent);
  } catch (error) {
    next(error);
  }
};

export const getAllEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const onlyActive = req.query.active === 'true';
    const options = {
      order: [['created_at', 'DESC'] as [string, 'ASC' | 'DESC']],
      where: onlyActive ? { is_active: true } : undefined,
    };
    const events = await Event.findAll(options);
    const eventsWithIdrPrice = await Promise.all(
      events.map(async (event) => {
        const eventPlain = event.toJSON() as EventAttributes & { event_idr_price?: number | null }; // Ambil plain object
        const idrPrice = await convertSolToIdr(eventPlain.default_sol_price);
        eventPlain.event_idr_price = idrPrice;
        return eventPlain;
      })
    );
    res.status(200).json(eventsWithIdrPrice);
  } catch (error) {
    next(error);
  }
};

export const getEventById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid Event ID format' });
    }

    const event = await Event.findByPk(eventId, {
      include: [{ model: Show, as: 'shows' }]
    });

    if (event) {
      const eventPlain = event.toJSON() as EventAttributes & { 
        event_idr_price?: number | null; 
        shows?: any[];
        shows_with_idr_price?: any[];
      };
      eventPlain.event_idr_price = await convertSolToIdr(eventPlain.default_sol_price);

      if (eventPlain.shows && Array.isArray(eventPlain.shows)) {
        eventPlain.shows_with_idr_price = await Promise.all(
          (eventPlain.shows as any[]).map(async (showItem: any) => {
            const showIdrPrice = await convertSolToIdr(showItem.sol_price);
            return { ...showItem, show_idr_price: showIdrPrice };
          })
        );
      }
      res.status(200).json(eventPlain);
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid Event ID format' });
    }

    // TODO: validation
    const updateData = req.body;
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const { event_id, created_at, updated_at, ...allowedUpdateData } = updateData;

    const updatedEvent = await event.update(allowedUpdateData);
    res.status(200).json(updatedEvent);
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid Event ID format' });
    }

    const result = await Event.destroy({ where: { event_id: eventId } });

    if (result > 0) {
      res.status(200).json({ message: 'Event deleted successfully (along with its shows due to CASCADE)' });
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    next(error);
  }
};