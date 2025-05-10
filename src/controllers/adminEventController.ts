import { Request, Response, NextFunction } from 'express';
import { Event, Show } from '../models';
import { EventCreationAttributes } from '../models/eventModel';

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
    res.status(200).json(events);
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
      res.status(200).json(event);
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