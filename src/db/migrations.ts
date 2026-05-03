import type { SQLiteDatabase } from 'expo-sqlite';

export const CURRENT_VERSION = 1;

const V1 = `
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    profession TEXT,
    color TEXT DEFAULT '#3B82F6',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    name TEXT NOT NULL,
    issuing_body TEXT,
    credential_number TEXT,
    issue_date TEXT,
    expiration_date TEXT,
    renewal_url TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS ce_courses (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    credential_id TEXT,
    course_name TEXT NOT NULL,
    organization TEXT,
    date_completed TEXT NOT NULL,
    hours_earned REAL NOT NULL,
    category TEXT,
    certificate_number TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
  );
`;

export function runMigrations(db: SQLiteDatabase): void {
  db.execSync('PRAGMA foreign_keys = ON;');
  db.execSync('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);');
  const row = db.getFirstSync<{ version: number }>('SELECT version FROM schema_version LIMIT 1');
  const current = row?.version ?? 0;
  if (current < 1) {
    db.withTransactionSync(() => {
      db.execSync(V1);
      db.runSync('DELETE FROM schema_version');
      db.runSync('INSERT INTO schema_version (version) VALUES (?)', 1);
    });
  }
}
