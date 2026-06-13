import type { SQLiteDatabase } from 'expo-sqlite';

export const CURRENT_VERSION = 2;

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
  CREATE INDEX IF NOT EXISTS idx_credentials_profile_id ON credentials(profile_id);
  CREATE INDEX IF NOT EXISTS idx_ce_profile_id ON ce_courses(profile_id);
  CREATE INDEX IF NOT EXISTS idx_ce_credential_id ON ce_courses(credential_id);
  CREATE INDEX IF NOT EXISTS idx_credentials_expiration ON credentials(expiration_date);
`;

const V2 = `
  CREATE TABLE IF NOT EXISTS insurance_policies (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    insurance_type TEXT NOT NULL,
    carrier TEXT,
    policy_number TEXT,
    effective_date TEXT,
    expiration_date TEXT,
    coverage_limit TEXT,
    premium_amount TEXT,
    auto_renew INTEGER DEFAULT 0,
    notes TEXT,
    document_uri TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_insurance_profile_id ON insurance_policies(profile_id);
  CREATE INDEX IF NOT EXISTS idx_insurance_expiration ON insurance_policies(expiration_date);
`;

export function runMigrations(db: SQLiteDatabase): void {
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

  if (current < 2) {
    db.withTransactionSync(() => {
      db.execSync(V2);
      db.runSync('DELETE FROM schema_version');
      db.runSync('INSERT INTO schema_version (version) VALUES (?)', 2);
    });
  }
}
