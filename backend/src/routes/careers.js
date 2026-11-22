import { Router } from 'express';

export default function createCareersRouter(database) {
  const router = Router();

  router.get('/', async (request, response, next) => {
    const { category } = request.query;

    if (category !== undefined && (typeof category !== 'string' || !category.trim())) {
      return response.status(400).json({ error: 'Category must be a non-empty string' });
    }

    const values = category === undefined ? [] : [category.trim()];
    const query = values.length
      ? 'SELECT * FROM career_roles WHERE category = $1'
      : 'SELECT * FROM career_roles';

    try {
      const result = await database.query(query, values);
      return response.json(result.rows);
    } catch (error) {
      return next(error);
    }
  });

  router.get('/:id', async (request, response, next) => {
    const { id } = request.params;

    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
      return response.status(400).json({ error: 'Career id must be a positive integer' });
    }

    try {
      const result = await database.query(
        'SELECT * FROM career_roles WHERE id = $1',
        [Number(id)],
      );

      if (result.rows.length === 0) {
        return response.status(404).json({ error: 'Career not found' });
      }

      return response.json(result.rows[0]);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
