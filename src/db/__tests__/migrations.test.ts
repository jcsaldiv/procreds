import { runMigrations, CURRENT_VERSION } from '../migrations';
import { getDb, resetDbForTests } from '../client';

describe('migrations', () => {
  beforeEach(() => {
    (require('expo-sqlite') as any).__reset?.();
    resetDbForTests();
  });

  it('runs to CURRENT_VERSION on a fresh db', () => {
    const db = getDb();
    runMigrations(db);
    const row = db.getFirstSync<{ version: number }>('SELECT version FROM schema_version LIMIT 1');
    expect(row?.version).toBe(CURRENT_VERSION);
  });

  it('is idempotent — running twice does not change version or throw', () => {
    const db = getDb();
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
    const row = db.getFirstSync<{ version: number }>('SELECT version FROM schema_version LIMIT 1');
    expect(row?.version).toBe(CURRENT_VERSION);
  });
});
