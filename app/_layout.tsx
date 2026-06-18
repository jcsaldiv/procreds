import { useEffect, useRef, useState } from 'react';
import { AppState, Appearance, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { runMigrations } from '@/db/migrations';
import { getDb } from '@/db/client';
import { initRevenueCat } from '@/purchases/revenuecat';
import { getSetting, setSetting } from '@/db/settings';
import { isBiometricAvailable } from '@/lib/biometrics';
import LockScreen from './lock';
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
    if (info.exists) setSetting('backup_excluded', 'true');
  } catch {
    // best-effort, ignore
  }
}

export default function RootLayout() {
  const router = useRouter();
  const [locked, setLocked] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    applyStoredTheme();
    recordSqliteDirExists();
    initRevenueCat();

    (async () => {
      const bioEnabled = getSetting('biometrics_enabled') === 'true';
      if (bioEnabled && (await isBiometricAvailable())) {
        setLocked(true);
      }
    })();

    const notifSub = Notifications.addNotificationResponseReceivedListener((res) => {
      const credId = res.notification.request.content.data?.credentialId as string | undefined;
      const insId = res.notification.request.content.data?.insuranceId as string | undefined;
      if (credId) router.push(`/credential/${credId}`);
      else if (insId) router.push(`/insurance/${insId}`);
    });

    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active') {
        const bgAt = backgroundedAt.current;
        if (bgAt && Date.now() - bgAt >= 60_000) {
          const bioEnabled = getSetting('biometrics_enabled') === 'true';
          if (bioEnabled) {
            isBiometricAvailable().then((available) => {
              if (available) setLocked(true);
            });
          }
        }
        backgroundedAt.current = null;
      }
    });

    return () => {
      notifSub.remove();
      appStateSub.remove();
    };
  }, [router]);

  if (locked) {
    return (
      <SafeAreaProvider>
        <LockScreen onUnlock={() => setLocked(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
