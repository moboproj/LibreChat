import type { Connection } from 'mongoose';
import logger from '~/config/winston';

/**
 * Indexes that were superseded by compound tenant-scoped indexes.
 * Each entry maps a collection name to the old index names that must be dropped
 * before multi-tenancy can function (old unique indexes enforce global uniqueness,
 * blocking same-value-different-tenant writes).
 *
 * These are only the indexes whose uniqueness constraints conflict with multi-tenancy.
 * Non-unique indexes that were extended with tenantId are harmless (queries still work,
 * just with slightly less optimal plans) and are not included here.
 */
const SUPERSEDED_INDEXES: Record<string, string[]> = {
  users: [
    'email_1',
    'googleId_1',
    'facebookId_1',
    'openidId_1',
    'openidId_1_tenantId_1',
    'samlId_1',
    'ldapId_1',
    'githubId_1',
    'discordId_1',
    'appleId_1',
  ],
  roles: ['name_1'],
  agents: ['id_1'],
  conversations: ['conversationId_1', 'conversationId_1_user_1'],
  messages: ['messageId_1', 'messageId_1_user_1'],
  presets: ['presetId_1'],
  agentcategories: ['value_1'],
  accessroles: ['accessRoleId_1'],
  conversationtags: ['tag_1_user_1'],
  mcpservers: ['serverName_1'],
  files: ['filename_1_conversationId_1_context_1'],
  groups: ['idOnTheSource_1_source_1'],
  skillsyncstatuses: ['provider_1_sourceId_1'],
};

interface MigrationResult {
  dropped: string[];
  skipped: string[];
  errors: string[];
}

/**
 * Drops superseded unique indexes that block multi-tenant operation.
 * Idempotent — skips indexes that don't exist. Safe to run on fresh databases.
 *
 * Call this before enabling multi-tenant middleware on an existing deployment.
 * On a fresh database (no pre-existing data), this is a no-op.
 */
export async function dropSupersededTenantIndexes(
  connection: Connection,
): Promise<MigrationResult> {
  const result: MigrationResult = { dropped: [], skipped: [], errors: [] };

  for (const [collectionName, indexNames] of Object.entries(SUPERSEDED_INDEXES)) {
    const collection = connection.db!.collection(collectionName);

    let existingIndexes: Array<{ name?: string }>;
    try {
      existingIndexes = await collection.indexes();
    } catch {
      result.skipped.push(
        ...indexNames.map((idx) => `${collectionName}.${idx} (collection does not exist)`),
      );
      continue;
    }

    const existingNames = new Set(existingIndexes.map((idx) => idx.name));

    for (const indexName of indexNames) {
      if (!existingNames.has(indexName)) {
        result.skipped.push(`${collectionName}.${indexName}`);
        continue;
      }

      try {
        await collection.dropIndex(indexName);
        result.dropped.push(`${collectionName}.${indexName}`);
        logger.info(`[TenantMigration] Dropped superseded index: ${collectionName}.${indexName}`);
      } catch (err) {
        const msg = `${collectionName}.${indexName}: ${(err as Error).message}`;
        result.errors.push(msg);
        logger.error(`[TenantMigration] Failed to drop index: ${msg}`);
      }
    }
  }

  if (result.dropped.length > 0) {
    logger.info(
      `[TenantMigration] Migration complete. Dropped ${result.dropped.length} superseded indexes.`,
    );
  } else {
    logger.info(
      '[TenantMigration] No superseded indexes found — database is already migrated or fresh.',
    );
  }

  return result;
}

export async function dropUniqueUserEmailIndexes(connection: Connection): Promise<string[]> {
  const collection = connection.db?.collection('users');
  if (!collection) {
    return [];
  }

  let existingIndexes: Array<{ name?: string; key?: Record<string, number>; unique?: boolean }>;
  try {
    existingIndexes = await collection.indexes();
  } catch {
    return [];
  }

  const dropped: string[] = [];
  for (const index of existingIndexes) {
    const keys = Object.keys(index.key ?? {});
    const isEmailIndex =
      index.unique === true &&
      index.key?.email === 1 &&
      (keys.length === 1 || (keys.length === 2 && index.key?.tenantId === 1));
    if (!isEmailIndex || !index.name) {
      continue;
    }

    await collection.dropIndex(index.name);
    dropped.push(index.name);
    logger.info(`[UserEmailIndex] Dropped unique email index: ${index.name}`);
  }

  return dropped;
}

/** Exported for testing — the raw index map */
export { SUPERSEDED_INDEXES };
