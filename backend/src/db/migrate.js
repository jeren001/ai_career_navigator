import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from './pool.js';

const migrationsPath = join(dirname(fileURLToPath(import.meta.url)), '../../database/migrations');

export async function runMigrations(database = pool) {
  const files = (await readdir(migrationsPath)).filter((file) => file.endsWith('.sql')).sort();
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    // Serialize schema changes and ledger reads across migration runners.
    await client.query('SELECT pg_advisory_xact_lock(712439, 1)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const { rows } = await client.query('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map(({ version }) => version));
    for (const file of files) {
      if (applied.has(file)) continue;
      await client.query(await readFile(join(migrationsPath, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
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
