import { Router } from 'express';
import { optionalAuthentication, requireAnyIdentity, requireAuthentication } from '../services/auth.js';
import { getCareerMatch, refreshCareerMatch } from '../services/career-match.js';

export default function createCareerMatchRouter(database) {
  const router = Router();
  router.use(optionalAuthentication(database), requireAnyIdentity);

  router.get('/', async (request, response, next) => {
    try {
      return response.json(await getCareerMatch(database, request.auth.userId));
    } catch (error) {
      return next(error);
    }
  });

  router.post('/refresh', requireAuthentication, async (request, response, next) => {
    try {
      const body = request.body === undefined ? {} : request.body;
      return response.json(await refreshCareerMatch(database, request.auth.userId, body));
    } catch (error) {
      return next(error);
    }
  });

  router.use((error, request, response, next) => {
    if (error.code === '42P01' || error.code === '42703') {
      return response.status(503).json({ error: 'Career Match database schema is out of date' });
    }
    return next(error);
  });

  return router;
}
