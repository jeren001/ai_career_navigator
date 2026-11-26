import { Router } from 'express';
import { optionalAuthentication, requireAuthentication } from '../services/auth.js';
import { profileUpdateSql, publicProfile, validateProfileUpdate } from '../services/profile.js';

export default function createProfileRouter(database) {
  const router = Router();
  router.use(optionalAuthentication(database), requireAuthentication);

  router.get('/', async (request, response, next) => {
    try {
      const result = await database.query(
        `SELECT id, email, display_name, country, preferred_language, age_group, education,
                work_experience, interests, skills, career_goals, is_guest, created_at
         FROM users WHERE id = $1`,
        [request.auth.userId],
      );
      if (!result.rows.length) return response.status(404).json({ error: 'User not found' });
      return response.json({ profile: publicProfile(result.rows[0]) });
    } catch (error) {
      return next(error);
    }
  });

  router.patch('/', async (request, response, next) => {
    try {
      const update = profileUpdateSql(request.auth.userId, validateProfileUpdate(request.body));
      const result = await database.query(update.text, update.values);
      if (!result.rows.length) return response.status(404).json({ error: 'User not found' });
      return response.json({ profile: publicProfile(result.rows[0]) });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
