import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import pool from './db/pool.js';
import { openapi } from './docs/openapi.js';
import assessmentRouter from './routes/assessment.js';
import authRouter from './routes/auth.js';
import careerMatchRouter from './routes/career-match.js';
import careersRouter from './routes/careers.js';
import challengesRouter from './routes/challenges.js';
import healthRouter from './routes/health.js';
import interviewsRouter from './routes/interviews.js';
import profileRouter from './routes/profile.js';
import skillsRouter from './routes/skills.js';
import { discoverResources } from './services/challenge-catalog.js';

export function createApp(database = pool) {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.get('/api-docs/openapi.json', (request, response) => response.json(openapi));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi, {
    customSiteTitle: 'AI Career Navigator API',
    swaggerOptions: { docExpansion: 'list', validatorUrl: null },
  }));
  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter(database));
  app.use('/api/profile', profileRouter(database));
  app.use('/api/skills', skillsRouter(database));
  app.use('/api/challenges', challengesRouter(database));
  app.use('/api/interviews', interviewsRouter(database));
  app.use('/api/careers', careersRouter(database));
  app.use('/api/career-match', careerMatchRouter(database));
  app.get('/api/learning/resources', (request, response) => response.json(discoverResources(request.query)));
  app.use('/api/assessment', assessmentRouter(database));
  app.use('/api/quiz', assessmentRouter(database));
  app.use((request, response) => {
    response.status(404).json({ error: 'Route not found' });
  });
  app.use((error, request, response, next) => {
    const clientError = Number.isInteger(error.status) && error.status >= 400 && error.status < 500;
    const status = clientError || error.status === 503 ? error.status : 500;
    const message = status === 500 ? 'Internal server error' : error.message;

    response.status(status).json({ error: message });
  });

  return app;
}

export default createApp();
