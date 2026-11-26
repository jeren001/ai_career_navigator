import { Router } from 'express';
import { optionalAuthentication, requireAuthentication } from '../services/auth.js';
import { createRoadmap, listRoadmaps, readRoadmap, updateMilestone } from '../services/roadmaps.js';
import { skillsError } from '../services/user-skills.js';

export default function createRoadmapsRouter(database) {
  const router = Router();
  router.use(optionalAuthentication(database), requireAuthentication);

  function validateId(request, response, next, id) {
    if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)) {
      return next(skillsError(400, 'Roadmap and milestone IDs must be UUIDs'));
    }
    return next();
  }
  router.param('id', validateId);
  router.param('milestoneId', validateId);

  router.post('/', async (request, response, next) => {
    try {
      const body = request.body === undefined ? {} : request.body;
      const roadmap = await createRoadmap(database, request.auth.userId, body);
      if (roadmap.resume_guidance) response.set('Cache-Control', 'private, no-store');
      return response.status(201).json({ roadmap });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/', async (request, response, next) => {
    try {
      const offset = request.query.offset ?? '0';
      if (typeof offset !== 'string' || !/^\d+$/.test(offset) || Number(offset) > 2_147_483_647) {
        throw skillsError(400, 'offset must be a nonnegative integer');
      }
      return response.json(await listRoadmaps(database, request.auth.userId, Number(offset)));
    } catch (error) {
      return next(error);
    }
  });

  router.get('/:id', async (request, response, next) => {
    try {
      const roadmap = await readRoadmap(database, request.auth.userId, request.params.id);
      return response.json({ roadmap });
    } catch (error) {
      return next(error);
    }
  });

  router.patch('/:id/milestones/:milestoneId', async (request, response, next) => {
    try {
      const roadmap = await updateMilestone(database, request.auth.userId, request.params.id, request.params.milestoneId, request.body);
      return response.json({ roadmap });
    } catch (error) {
      return next(error);
    }
  });

  router.use((error, request, response, next) => {
    if (error.code === '42P01' || error.code === '42703') {
      return response.status(503).json({ error: 'My Roadmap database schema is out of date' });
    }
    return next(error);
  });
  return router;
}
