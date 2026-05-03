import { getDb } from './client';

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.runSync('DELETE FROM app_settings WHERE key = ?', key);
  db.runSync('INSERT INTO app_settings (key, value) VALUES (?, ?)', key, value);
}

export function getSetting(key: string): string | null {
  const row = getDb().getFirstSync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', key);
  return row?.value ?? null;
}
