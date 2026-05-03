import { runMigrations } from '../migrations';
import { getDb, resetDbForTests } from '../client';
import { createProfile } from '../profiles';
import { createCredential } from '../credentials';
import { createCe, listCeForProfile, listCeForCredential, updateCe, deleteCe } from '../ce';

beforeEach(() => {
  (require('expo-sqlite') as any).__reset?.();
  resetDbForTests();
  runMigrations(getDb());
});

test('CE CRUD', () => {
  const p = createProfile({ name: 'JC' });
  const c = createCredential({
    profile_id: p.id, name: 'RN', issuing_body: null, credential_number: null,
    issue_date: null, expiration_date: null, renewal_url: null, notes: null,
  });
  const ce = createCe({
    profile_id: p.id, credential_id: c.id, course_name: 'BLS',
    organization: 'AHA', date_completed: '2026-04-01', hours_earned: 4,
    category: 'Required', certificate_number: null, notes: null,
  });
  expect(listCeForProfile(p.id)).toHaveLength(1);
  expect(listCeForCredential(c.id)).toHaveLength(1);
  updateCe(ce.id, { hours_earned: 5 });
  deleteCe(ce.id);
  expect(listCeForProfile(p.id)).toHaveLength(0);
});
