import { getDb } from './client';
import { newId } from '../lib/id';

export type Profile = {
  id: string;
  name: string;
  profession: string | null;
  color: string;
  created_at: number;
};

export function createProfile(input: { name: string; profession?: string; color?: string }): Profile {
  const row: Profile = {
    id: newId(),
    name: input.name,
    profession: input.profession ?? null,
    color: input.color ?? '#3B82F6',
    created_at: Date.now(),
  };
  getDb().runSync(
    'INSERT INTO profiles (id, name, profession, color, created_at) VALUES (?, ?, ?, ?, ?)',
    row.id, row.name, row.profession, row.color, row.created_at
  );
  return row;
}

export function listProfiles(): Profile[] {
  return getDb().getAllSync<Profile>('SELECT * FROM profiles ORDER BY created_at ASC');
}

export function getProfile(id: string): Profile | null {
  return getDb().getFirstSync<Profile>('SELECT * FROM profiles WHERE id = ?', id);
}

export function updateProfile(id: string, patch: Partial<Pick<Profile, 'name' | 'profession' | 'color'>>): void {
  const cur = getProfile(id);
  if (!cur) return;
  const merged = { ...cur, ...patch };
  getDb().runSync(
    'UPDATE profiles SET name = ?, profession = ?, color = ? WHERE id = ?',
    merged.name, merged.profession, merged.color, id
  );
}

export function deleteProfile(id: string): void {
  getDb().runSync('DELETE FROM profiles WHERE id = ?', id);
}
