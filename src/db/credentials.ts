import { getDb } from './client';
import { newId } from '../lib/id';

export type Credential = {
  id: string;
  profile_id: string;
  name: string;
  issuing_body: string | null;
  credential_number: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  renewal_url: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
};

type NewCredential = Omit<Credential, 'id' | 'created_at' | 'updated_at'>;

export function createCredential(input: NewCredential): Credential {
  const now = Date.now();
  const row: Credential = { ...input, id: newId(), created_at: now, updated_at: now };
  getDb().runSync(
    `INSERT INTO credentials (id, profile_id, name, issuing_body, credential_number, issue_date, expiration_date, renewal_url, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id, row.profile_id, row.name, row.issuing_body, row.credential_number,
    row.issue_date, row.expiration_date, row.renewal_url, row.notes, row.created_at, row.updated_at
  );
  return row;
}

export function listCredentialsForProfile(profileId: string): Credential[] {
  return getDb().getAllSync<Credential>(
    'SELECT * FROM credentials WHERE profile_id = ? ORDER BY expiration_date ASC',
    profileId
  );
}

export function getCredential(id: string): Credential | null {
  return getDb().getFirstSync<Credential>('SELECT * FROM credentials WHERE id = ?', id);
}

export function updateCredential(id: string, patch: Partial<NewCredential>): Credential | null {
  const cur = getCredential(id);
  if (!cur) return null;
  const m = { ...cur, ...patch, updated_at: Date.now() };
  getDb().runSync(
    `UPDATE credentials SET profile_id = ?, name = ?, issuing_body = ?, credential_number = ?, issue_date = ?, expiration_date = ?, renewal_url = ?, notes = ?, updated_at = ? WHERE id = ?`,
    m.profile_id, m.name, m.issuing_body, m.credential_number, m.issue_date, m.expiration_date, m.renewal_url, m.notes, m.updated_at, id
  );
  return m;
}

export function deleteCredential(id: string): void {
  getDb().runSync('DELETE FROM credentials WHERE id = ?', id);
}

export function countCredentialsForProfile(profileId: string): number {
  const rows = getDb().getAllSync<{ id: string }>('SELECT id FROM credentials WHERE profile_id = ?', profileId);
  return rows.length;
}
