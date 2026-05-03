import { runMigrations } from '../../db/migrations';
import { getDb, resetDbForTests } from '../../db/client';
import { useActiveProfile } from '../activeProfile';

beforeEach(() => {
  (require('expo-sqlite') as any).__reset?.();
  resetDbForTests();
  runMigrations(getDb());
});

test('set and read', () => {
  useActiveProfile.getState().setActiveProfileId('abc');
  expect(useActiveProfile.getState().activeProfileId).toBe('abc');
});
