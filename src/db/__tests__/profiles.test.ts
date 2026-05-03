import { runMigrations } from '../migrations';
import { getDb, resetDbForTests } from '../client';
import { createProfile, listProfiles, getProfile, updateProfile, deleteProfile } from '../profiles';

beforeEach(() => {
  (require('expo-sqlite') as any).__reset?.();
  resetDbForTests();
  runMigrations(getDb());
});

test('create + list', () => {
  const p = createProfile({ name: 'JC', profession: 'EM Doc', color: '#3B82F6' });
  expect(p.id).toBeTruthy();
  expect(listProfiles()).toHaveLength(1);
});

test('update + get', () => {
  const p = createProfile({ name: 'JC' });
  updateProfile(p.id, { name: 'Juan' });
  expect(getProfile(p.id)?.name).toBe('Juan');
});

test('delete', () => {
  const p = createProfile({ name: 'JC' });
  deleteProfile(p.id);
  expect(listProfiles()).toHaveLength(0);
});
