import { runMigrations } from '../migrations';
import { getDb, resetDbForTests } from '../client';
import { setSetting, getSetting } from '../settings';

beforeEach(() => {
  (require('expo-sqlite') as any).__reset?.();
  resetDbForTests();
  runMigrations(getDb());
});

test('set + get', () => {
  setSetting('active_profile_id', 'abc');
  expect(getSetting('active_profile_id')).toBe('abc');
});

test('overwrite', () => {
  setSetting('k', '1');
  setSetting('k', '2');
  expect(getSetting('k')).toBe('2');
});
