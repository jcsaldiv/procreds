import { runMigrations, CURRENT_VERSION } from '../migrations';
import { getDb } from '../client';

describe('migrations', () => {
  beforeEach(() => {
    (require('expo-sqlite') as any).__reset?.();
  });

  it('runs to CURRENT_VERSION on a fresh db', () => {
    const db = getDb();
    runMigrations(db);
    const row = db.getFirstSync<{ version: number }>('SELECT version FROM schema_version LIMIT 1');
    expect(row?.version).toBe(CURRENT_VERSION);
  });
});
