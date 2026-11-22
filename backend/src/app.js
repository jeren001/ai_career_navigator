import cors from 'cors';
import express from 'express';
import pool from './db/pool.js';
import careersRouter from './routes/careers.js';
import healthRouter from './routes/health.js';

export function createApp(database = pool) {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use('/api', healthRouter);
  app.use('/api/careers', careersRouter(database));
  app.use((request, response) => {
    response.status(404).json({ error: 'Route not found' });
  });
  app.use((error, request, response, next) => {
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
    const message = status === 500 ? 'Internal server error' : error.message;

    response.status(status).json({ error: message });
  });

  return app;
}

export default createApp();
