import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS } from './schema';

export const DATABASE_NAME = 'bp-journey.db';

/** Applies pending migrations. Used as `SQLiteProvider onInit`. */
export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY NOT NULL,
    applied_at_utc TEXT NOT NULL
  );`);
  const row = await db.getFirstAsync<{ version: number | null }>(
    'SELECT MAX(version) AS version FROM schema_migrations',
  );
  const current = row?.version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await db.withTransactionAsync(async () => {
      for (const statement of migration.statements) {
        await db.execAsync(statement);
      }
      await db.runAsync(
        'INSERT INTO schema_migrations (version, applied_at_utc) VALUES (?, ?)',
        migration.version,
        new Date().toISOString(),
      );
    });
  }
}
