import { readFileSync } from 'fs';
import { join } from 'path';
import { loadEnvConfig } from '@next/env';
import { Client } from '@neondatabase/serverless';
import { runMigrations } from './run-migrations';

/**
 * Syncs the development database with the production database.
 * 
 * 1. Resets the target branch (e.g. 'dev') to the state of its parent branch (e.g. 'main')
 *    using the Neon "Reset from parent" API. This preserves the connection string.
 * 2. Re-applies any pending migrations from the local codebase to the newly-synced branch.
 * 
 * Requires:
 * - NEON_API_KEY: Neon API key
 * - DATABASE_URL: Connection string for the target branch
 * - .neon file or NEON_PROJECT_ID and NEON_BRANCH environment variables
 */
export async function syncDb() {
  const NEON_API_KEY = process.env.NEON_API_KEY;
  if (!NEON_API_KEY) {
    console.error('Error: NEON_API_KEY environment variable is required.');
    console.error('You can create an API key at https://console.neon.tech/app/settings/api-keys');
    process.exit(1);
    return;
  }

  let projectId = process.env.NEON_PROJECT_ID;
  let branchName = process.env.NEON_BRANCH;

  if (!projectId || !branchName) {
    const neonConfigPath = join(process.cwd(), '.neon');
    try {
      const config = JSON.parse(readFileSync(neonConfigPath, 'utf8'));
      projectId = projectId || config.projectId;
      branchName = branchName || config.branch;
    } catch {
      if (!projectId || !branchName) {
        console.error('Error: Could not determine Neon project or branch.');
        console.error('Please ensure a .neon file exists or set NEON_PROJECT_ID and NEON_BRANCH.');
        process.exit(1);
        return;
      }
    }
  }

  console.log(`\n🔄 Syncing database branch "${branchName}" in project "${projectId}"...`);

  // 1. Get branch and parent ID via API
  const branchesResponse = await fetch(`https://console.neon.tech/api/v2/projects/${projectId}/branches`, {
    headers: {
      'Authorization': `Bearer ${NEON_API_KEY}`,
      'Accept': 'application/json',
    },
  });

  if (!branchesResponse.ok) {
    const errorBody = await branchesResponse.text();
    console.error(`Error: Failed to fetch branches: ${branchesResponse.statusText}`);
    console.error(errorBody);
    process.exit(1);
    return;
  }

  const { branches } = await branchesResponse.json();
  const targetBranch = branches.find(
    (b: { id: string; name: string; parent_id?: string }) => b.name === branchName || b.id === branchName,
  );

  if (!targetBranch) {
    console.error(`Error: Could not find branch "${branchName}" in Neon project ${projectId}`);
    process.exit(1);
    return;
  }

  if (!targetBranch.parent_id) {
    console.error(`Error: Branch "${branchName}" has no parent. Syncing only works on child branches.`);
    process.exit(1);
    return;
  }

  const branchId = targetBranch.id;
  const parentId = targetBranch.parent_id;

  console.log(`📍 Found branch ${branchId}, resetting from parent ${parentId}...`);

  // 2. Trigger restore
  const restoreResponse = await fetch(`https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/restore`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NEON_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      source_branch_id: parentId,
    }),
  });

  if (!restoreResponse.ok) {
    const errorBody = await restoreResponse.text();
    console.error(`Error: Failed to restore branch: ${restoreResponse.statusText}`);
    console.error(errorBody);
    process.exit(1);
    return;
  }

  // 3. Wait for operation to complete
  process.stdout.write('⏳ Waiting for branch to be ready...');
  let attempts = 0;
  while (attempts < 60) {
    const statusResponse = await fetch(`https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}`, {
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
        'Accept': 'application/json',
      },
    });
    const { branch } = await statusResponse.json();
    if (branch.current_state === 'ready') {
      process.stdout.write(' ✅\n');
      break;
    }
    process.stdout.write('.');
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }

  if (attempts >= 60) {
    console.error('\nError: Timeout waiting for branch to become ready.');
    process.exit(1);
    return;
  }

  // 4. Run migrations
  console.log('🚀 Re-applying migrations to handle schema mismatches...');
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL_UNPOOLED or DATABASE_URL is not set.');
    process.exit(1);
    return;
  }

  const client = new Client(connectionString);
  try {
    await client.connect();
    await runMigrations(client);
    console.log('\n✨ Database sync and migrations completed successfully!');
  } catch (error) {
    console.error('\nError: Migration failed after sync:');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  // Load NEON_API_KEY, NEON_PROJECT_ID, NEON_BRANCH, DATABASE_URL, etc. from .env.local
  // (and other Next.js-style env files) the same way `next dev`/`next build` do.
  loadEnvConfig(process.cwd());

  syncDb().catch((error) => {
    console.error('\nFatal Error:', error);
    process.exit(1);
  });
}
