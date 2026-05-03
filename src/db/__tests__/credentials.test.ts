import { runMigrations } from '../migrations';
import { getDb, resetDbForTests } from '../client';
import { createProfile } from '../profiles';
import { createCredential, listCredentialsForProfile, getCredential, updateCredential, deleteCredential } from '../credentials';

beforeEach(() => {
  (require('expo-sqlite') as any).__reset?.();
  resetDbForTests();
  runMigrations(getDb());
});

test('CRUD a credential', () => {
  const p = createProfile({ name: 'JC' });
  const c = createCredential({
    profile_id: p.id,
    name: 'RN License',
    issuing_body: 'BON TX',
    credential_number: '12345',
    issue_date: '2025-01-01',
    expiration_date: '2027-01-01',
    renewal_url: 'https://example.com',
    notes: null,
  });
  expect(c.id).toBeTruthy();
  expect(listCredentialsForProfile(p.id)).toHaveLength(1);
  updateCredential(c.id, { name: 'RN' });
  expect(getCredential(c.id)?.name).toBe('RN');
  deleteCredential(c.id);
  expect(listCredentialsForProfile(p.id)).toHaveLength(0);
});
