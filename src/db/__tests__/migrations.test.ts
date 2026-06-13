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
    expect(CURRENT_VERSION).toBe(2);
  });

  it('is idempotent — running twice does not change version or throw', () => {
    const db = getDb();
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
    const row = db.getFirstSync<{ version: number }>('SELECT version FROM schema_version LIMIT 1');
    expect(row?.version).toBe(CURRENT_VERSION);
  });

  it('creates insurance_policies table in V2', () => {
    const db = getDb();
    runMigrations(db);
    expect(() =>
      db.runSync(
        `INSERT INTO insurance_policies (id, profile_id, insurance_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        'test-id', 'prof-id', 'Malpractice', 1, 1
      )
    ).not.toThrow();
  });
});
