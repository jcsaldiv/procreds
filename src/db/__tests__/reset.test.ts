import { getDb } from '../client';
import { runMigrations } from '../migrations';
import { createProfile, listProfiles } from '../profiles';
import { setSetting, getSetting } from '../settings';
import { resetCredentialData, eraseEverything } from '../reset';

describe('reset helpers', () => {
  beforeEach(() => {
    runMigrations(getDb());
  });

  it('resetCredentialData clears credentials/ce but keeps profiles and settings', () => {
    const p = createProfile({ name: 'Test User' });
    setSetting('theme', 'dark');
    const db = getDb();
    db.runSync(
      'INSERT INTO credentials (id, profile_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      'c1', p.id, 'License', Date.now(), Date.now()
    );

    resetCredentialData();

    const creds = db.getAllSync<{ id: string }>('SELECT id FROM credentials');
    expect(creds.length).toBe(0);
    expect(listProfiles().length).toBe(1);
    expect(getSetting('theme')).toBe('dark');
  });

  it('eraseEverything wipes all tables including profiles and settings', () => {
    createProfile({ name: 'Test User' });
    setSetting('theme', 'dark');

    eraseEverything();

    expect(listProfiles().length).toBe(0);
    expect(getSetting('theme')).toBeNull();
    expect(getSetting('onboarding_complete')).toBeNull();
  });
});
