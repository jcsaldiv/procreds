import { useEffect } from 'react';
import { Appearance } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { runMigrations } from '@/db/migrations';
import { getDb } from '@/db/client';
import { initRevenueCat } from '@/purchases/revenuecat';
import { getSetting, setSetting } from '@/db/settings';
import '../global.css';

// Run synchronously at module load so the DB is ready before any route renders.
runMigrations(getDb());

function applyStoredTheme() {
  const t = getSetting('theme');
  if (t === 'light' || t === 'dark') {
    Appearance.setColorScheme(t);
  } else {
    Appearance.setColorScheme(null);
  }
}

// Records that the SQLite directory exists. Does NOT set iOS NSURLIsExcludedFromBackupKey
// (not available in managed Expo workflow). app.json sets allowBackup:false (Android)
// and UIFileSharingEnabled:false (iOS). Data is wiped on uninstall regardless.
async function recordSqliteDirExists() {
  if (getSetting('backup_excluded') === 'true') return;
  try {
    const sqliteDir = `${FileSystem.documentDirectory}SQLite`;
    const info = await FileSystem.getInfoAsync(sqliteDir);
    if (info.exists) {
      setSetting('backup_excluded', 'true');
    }
  } catch {
    // best-effort, ignore
  }
}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    applyStoredTheme();
    recordSqliteDirExists();
    initRevenueCat();
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const id = res.notification.request.content.data?.credentialId as string | undefined;
      if (id) router.push(`/credential/${id}`);
    });
    return () => sub.remove();
  }, [router]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
