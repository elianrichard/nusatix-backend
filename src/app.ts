import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import adminEventRoutes from './routes/adminEventRoutes'; 
import adminShowRoutes from './routes/adminShowRoutes';
import ticketRoutes from './routes/ticketRoutes';

import { testConnection } from './db';

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled Error:", err.name, err.message);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ 
    message: 'An unexpected error occurred on the server.',
    error: err.message,
  });
});

// Routes
app.use('/api/admin/events', adminEventRoutes);
app.use('/api/admin/shows', adminShowRoutes);
app.use('/api/tickets', ticketRoutes);

const startServer = async () => {
  try {
    await testConnection();
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start the server:', error);
    process.exit(1);
  }
};

startServer();

export default app; 