import { Router } from 'express';

export default function createCareersRouter(database) {
  const router = Router();

  router.get('/', async (request, response, next) => {
    const {
      category,
      cluster,
      niche_pivot_friendly: nichePivotFriendly,
    } = request.query;

    for (const [name, value] of [['category', category], ['cluster', cluster]]) {
      if (value !== undefined && (typeof value !== 'string' || !value.trim() || value.includes('\0'))) {
        return response.status(400).json({ error: `${name} must be a non-empty string` });
      }
    }

    if (category !== undefined && cluster !== undefined) {
      return response.status(400).json({ error: 'Use either category or cluster, not both' });
    }

    if (nichePivotFriendly !== undefined && !['true', 'false'].includes(nichePivotFriendly)) {
      return response.status(400).json({ error: 'niche_pivot_friendly must be true or false' });
    }

    const values = [];
    const filters = ['is_active = TRUE'];

    if (category !== undefined) {
      values.push(category.trim());
      filters.push(`market_pulse->>'career_field' = $${values.length}`);
    }

    if (cluster !== undefined) {
      values.push(cluster.trim());
      filters.push(`cluster = $${values.length}`);
    }

    if (nichePivotFriendly !== undefined) {
      values.push(nichePivotFriendly === 'true');
      filters.push(`niche_pivot_friendly = $${values.length}`);
    }

    const query = `SELECT * FROM career_roles WHERE ${filters.join(' AND ')} ORDER BY id`;

    try {
      const result = await database.query(query, values);
      return response.json(result.rows);
    } catch (error) {
      return next(error);
    }
  });

  router.get('/:id', async (request, response, next) => {
    const { id } = request.params;

    if (!/^[1-9]\d*$/.test(id) || Number(id) > 2_147_483_647) {
      return response.status(400).json({ error: 'Career id must be a positive integer' });
    }

    try {
      const result = await database.query(
        'SELECT * FROM career_roles WHERE is_active = TRUE AND id = $1',
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
