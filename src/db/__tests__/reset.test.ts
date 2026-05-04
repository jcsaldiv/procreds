import { getDb, resetDbForTests } from '../client';
import { runMigrations } from '../migrations';
import { createProfile, listProfiles } from '../profiles';
import { setSetting, getSetting } from '../settings';
import { resetCredentialData, eraseEverything } from '../reset';

describe('reset helpers', () => {
  beforeEach(() => {
    (require('expo-sqlite') as any).__reset?.();
    resetDbForTests();
    runMigrations(getDb());
  });

  it('resetCredentialData clears credentials and ce_courses but keeps profiles and settings', () => {
    const p = createProfile({ name: 'Test User' });
    setSetting('theme', 'dark');
    const db = getDb();
    db.runSync(
      'INSERT INTO credentials (id, profile_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      'c1', p.id, 'License', Date.now(), Date.now()
    );
    db.runSync(
      'INSERT INTO ce_courses (id, profile_id, course_name, date_completed, hours_earned, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      'ce1', p.id, 'CPR Training', '2025-01-01', 2, Date.now()
    );

    resetCredentialData();

    const creds = db.getAllSync<{ id: string }>('SELECT id FROM credentials');
    const courses = db.getAllSync<{ id: string }>('SELECT id FROM ce_courses');
    expect(creds.length).toBe(0);
    expect(courses.length).toBe(0);
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
