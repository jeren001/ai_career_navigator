import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from './pool.js';

const migrationsPath = join(dirname(fileURLToPath(import.meta.url)), '../../database/migrations');

export async function runMigrations(database = pool) {
  await database.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const files = (await readdir(migrationsPath)).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const applied = await database.query('SELECT 1 FROM schema_migrations WHERE version = $1', [file]);
    if (applied.rows.length) continue;
    const sql = await readFile(join(migrationsPath, file), 'utf8');
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runMigrations()
    .then(() => pool.end())
    .catch(async (error) => {
      console.error('Database migration failed:', error.message);
      await pool.end();
      process.exitCode = 1;
    });
}
