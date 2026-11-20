import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export async function runMigrations() {
  const migratorPool = new pg.Pool({ connectionString: env.MIGRATOR_DATABASE_URL });
  const client = await migratorPool.connect();
  const executed = [];

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      GRANT SELECT ON schema_migrations TO app_rw;
    `);

    const { rows } = await client.query('SELECT version FROM schema_migrations ORDER BY version ASC');
    const applied = new Set(rows.map((r) => r.version));

    const files = (await fs.readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        executed.push(file);
        logger.info({ migration: file }, 'Applied database migration');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
    return executed;
  } finally {
    client.release();
    await migratorPool.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runMigrations()
    .then((applied) => {
      logger.info({ count: applied.length, applied }, 'Migrations complete');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Migration failed');
      process.exit(1);
    });
}