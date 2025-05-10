import sequelize from '../db';

import Event from './eventModel';
import Show from './showModel';
import Ticket from './ticketModel';

Event.hasMany(Show, {
  foreignKey: 'event_id',
  as: 'shows',
});
Show.belongsTo(Event, {
  foreignKey: 'event_id',
  as: 'event',
});


Show.hasMany(Ticket, {
  foreignKey: 'show_id',
  as: 'tickets',
});
Ticket.belongsTo(Show, {
  foreignKey: 'show_id',
  as: 'show',
});

export { sequelize, Event, Show, Ticket };