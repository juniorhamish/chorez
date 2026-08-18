import { Client } from '@neondatabase/serverless';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Applies pending SQL migrations from `migrations/*.sql` to whichever Neon branch
// `DATABASE_URL_UNPOOLED` points at (production or a Vercel preview branch).
//
// A `schema_migrations` ledger table tracks which migration filenames have already been applied.
// On a branch that already has domain tables (e.g. `households`) but no ledger rows yet, this
// bootstraps by recording all currently-existing migration files as already-applied without
// re-executing them. This lets us add tracking without requiring every historical migration to be
// idempotent, while still being safe to run unconditionally on every build.

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');
const BOOTSTRAP_CHECK_TABLE = 'households';

async function ensureLedgerTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function ledgerIsEmpty(client: Client): Promise<boolean> {
  const result = await client.query('SELECT count(*)::int AS count FROM schema_migrations');
  return result.rows[0].count === 0;
}

async function domainTablesExist(client: Client): Promise<boolean> {
  const result = await client.query(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [BOOTSTRAP_CHECK_TABLE],
  );
  return result.rows[0].exists === true;
}

function listMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((filename) => filename.endsWith('.sql'))
    .sort();
}

async function getAppliedFilenames(client: Client): Promise<Set<string>> {
  const result = await client.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map((row: { filename: string }) => row.filename));
}

async function bootstrapBaseline(client: Client, filenames: string[]): Promise<void> {
  console.log('schema_migrations is empty but domain tables already exist; bootstrapping baseline.');
  for (const filename of filenames) {
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [
      filename,
    ]);
    console.log(`  bootstrapped ${filename}`);
  }
}

async function applyMigration(client: Client, filename: string): Promise<void> {
  const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    console.log(`  applied ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function runMigrations(client: Client): Promise<void> {
  await ensureLedgerTable(client);

  const filenames = listMigrationFiles();

  if (await ledgerIsEmpty(client)) {
    if (await domainTablesExist(client)) {
      await bootstrapBaseline(client, filenames);
    }
  }

  const applied = await getAppliedFilenames(client);
  const pending = filenames.filter((filename) => !applied.has(filename));

  if (pending.length === 0) {
    console.log('No pending migrations.');
    return;
  }

  console.log(`Applying ${pending.length} pending migration(s)...`);
  for (const filename of pending) {
    await applyMigration(client, filename);
  }
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL_UNPOOLED (or DATABASE_URL) is not set');
  }

  const client = new Client(connectionString);
  await client.connect();
  try {
    await runMigrations(client);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}
