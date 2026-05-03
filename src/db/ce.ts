import { getDb } from './client';
import { newId } from '../lib/id';

export type CeCourse = {
  id: string;
  profile_id: string;
  credential_id: string | null;
  course_name: string;
  organization: string | null;
  date_completed: string;
  hours_earned: number;
  category: string | null;
  certificate_number: string | null;
  notes: string | null;
  created_at: number;
};

type NewCe = Omit<CeCourse, 'id' | 'created_at'>;

export function createCe(input: NewCe): CeCourse {
  const row: CeCourse = { ...input, id: newId(), created_at: Date.now() };
  getDb().runSync(
    `INSERT INTO ce_courses (id, profile_id, credential_id, course_name, organization, date_completed, hours_earned, category, certificate_number, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id, row.profile_id, row.credential_id, row.course_name, row.organization,
    row.date_completed, row.hours_earned, row.category, row.certificate_number, row.notes, row.created_at
  );
  return row;
}

export function listCeForProfile(profileId: string): CeCourse[] {
  return getDb().getAllSync<CeCourse>(
    'SELECT * FROM ce_courses WHERE profile_id = ? ORDER BY date_completed DESC', profileId
  );
}

export function listCeForCredential(credentialId: string): CeCourse[] {
  return getDb().getAllSync<CeCourse>(
    'SELECT * FROM ce_courses WHERE credential_id = ? ORDER BY date_completed DESC', credentialId
  );
}

export function getCe(id: string): CeCourse | null {
  return getDb().getFirstSync<CeCourse>('SELECT * FROM ce_courses WHERE id = ?', id);
}

export function updateCe(id: string, patch: Partial<NewCe>): CeCourse | null {
  const cur = getCe(id);
  if (!cur) return null;
  const m = { ...cur, ...patch };
  getDb().runSync(
    `UPDATE ce_courses SET profile_id = ?, credential_id = ?, course_name = ?, organization = ?, date_completed = ?, hours_earned = ?, category = ?, certificate_number = ?, notes = ? WHERE id = ?`,
    m.profile_id, m.credential_id, m.course_name, m.organization, m.date_completed,
    m.hours_earned, m.category, m.certificate_number, m.notes, id
  );
  return m;
}

export function deleteCe(id: string): void {
  getDb().runSync('DELETE FROM ce_courses WHERE id = ?', id);
}
