import { getDb } from './client';
import * as Notifications from 'expo-notifications';

export function resetCredentialData(): void {
  const db = getDb();
  db.runSync('DELETE FROM ce_courses');
  db.runSync('DELETE FROM credentials');
  Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

export function eraseEverything(): void {
  const db = getDb();
  db.runSync('DELETE FROM ce_courses');
  db.runSync('DELETE FROM credentials');
  db.runSync('DELETE FROM profiles');
  db.runSync('DELETE FROM app_settings');
  Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}
