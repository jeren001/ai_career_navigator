import { Router } from 'express';
import { optionalAuthentication, requireAuthentication } from '../services/auth.js';
import { catalogLanguage, discoverResources, learningResource } from '../services/challenge-catalog.js';
import { skillsBody, skillsError } from '../services/user-skills.js';

export default function createLearningRouter(database) {
  const router = Router();
  router.get('/resources', (request, response) => response.json(discoverResources(request.query)));

  router.use('/progress', optionalAuthentication(database), requireAuthentication, (request, response, next) => {
    response.set('Cache-Control', 'private, no-store');
    next();
  });
  router.get('/progress', async (request, response, next) => {
    try {
      const { userId } = request.auth;
      const { language: override, status = 'all' } = request.query;
      if (!['all', 'bookmarked', 'completed'].includes(status)) throw skillsError(400, 'Invalid learning status');
      const { rows } = await database.query(
        `SELECT l.resource_id, l.bookmarked_at, l.completed_at, u.preferred_language FROM users u
         LEFT JOIN learning_resource_progress l ON l.user_id = u.id
           AND (($2 <> 'completed' AND l.bookmarked_at IS NOT NULL)
             OR ($2 <> 'bookmarked' AND l.completed_at IS NOT NULL))
         WHERE u.id = $1
         ORDER BY GREATEST(l.bookmarked_at, l.completed_at) DESC NULLS LAST, l.resource_id`,
        [userId, status],
      );
      const language = catalogLanguage(override === undefined ? rows[0]?.preferred_language : override);
      const progress = rows.filter(({ resource_id }) => resource_id !== null)
        .map(({ preferred_language, ...item }) => ({
          ...item, resource: learningResource(item.resource_id, language) ?? null,
        }));
      response.json({ language, progress });
    } catch (error) {
      next(error);
    }
  });
  router.patch('/progress/:resourceId', async (request, response, next) => {
    try {
      const { resourceId } = request.params;
      const { bookmarked, completed } = skillsBody(request.body, ['bookmarked', 'completed']);
      if ([bookmarked, completed].every((value) => value === undefined) ||
          [bookmarked, completed].some((value) => value !== undefined && typeof value !== 'boolean')) {
        throw skillsError(400, 'Supply bookmarked or completed as a boolean');
      }
      if (!learningResource(resourceId, 'en')) throw skillsError(404, 'Learning resource not found');
      const { rows: [progress] } = await database.query(
        `INSERT INTO learning_resource_progress AS l (user_id, resource_id, bookmarked_at, completed_at)
         VALUES ($1, $2, CASE WHEN $3 THEN clock_timestamp() END, CASE WHEN $4 THEN clock_timestamp() END)
         ON CONFLICT (user_id, resource_id) DO UPDATE SET
           bookmarked_at = CASE WHEN $3 THEN COALESCE(l.bookmarked_at, EXCLUDED.bookmarked_at)
                                WHEN NOT $3 THEN NULL ELSE l.bookmarked_at END,
           completed_at = CASE WHEN $4 THEN COALESCE(l.completed_at, EXCLUDED.completed_at)
                               WHEN NOT $4 THEN NULL ELSE l.completed_at END
         RETURNING resource_id, bookmarked_at, completed_at`,
        [request.auth.userId, resourceId, bookmarked ?? null, completed ?? null],
      );
      response.json({ progress });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
