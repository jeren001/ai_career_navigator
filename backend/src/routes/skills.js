import { Router } from 'express';
import { optionalAuthentication, requireAuthentication } from '../services/auth.js';
import { compareUserSkills } from '../services/skill-comparison.js';
import { createUserSkill, deleteUserSkill, listUserSkills, skillsError, updateUserSkill } from '../services/user-skills.js';

function skillId(value) {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || id > 2_147_483_647) throw skillsError(400, 'Skill ID must be a positive integer');
  return id;
}

export default function createSkillsRouter(database) {
  const router = Router();
  router.use(optionalAuthentication(database), requireAuthentication);

  router.get('/', async (request, response, next) => {
    try {
      return response.json({ skills: await listUserSkills(database, request.auth.userId) });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/', async (request, response, next) => {
    try {
      const skill = await createUserSkill(database, request.auth.userId, request.body);
      return response.status(201).json({ skill });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/compare', async (request, response, next) => {
    try {
      return response.json(await compareUserSkills(database, request.auth.userId, request.body));
    } catch (error) {
      return next(error);
    }
  });

  router.patch('/:id', async (request, response, next) => {
    try {
      const skill = await updateUserSkill(database, request.auth.userId, skillId(request.params.id), request.body);
      return response.json({ skill });
    } catch (error) {
      return next(error);
    }
  });

  router.delete('/:id', async (request, response, next) => {
    try {
      await deleteUserSkill(database, request.auth.userId, skillId(request.params.id));
      return response.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  router.use((error, request, response, next) => {
    if (error.code === '42P01' || error.code === '42703') {
      return response.status(503).json({ error: 'Skills database schema is out of date' });
    }
    return next(error);
  });

  return router;
}
