# ProCreds — Phase 7: Polish & Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename app to ProCreds, add first-launch onboarding with profile creation, build out the settings screen, configure privacy/backup opt-out, and set up EAS for App Store + Play Store submission.

**Architecture:** Onboarding is a single-file two-step flow (slides → profile creation) gated in app/index.tsx via a settings flag. Settings screen replaces the existing stub with four sections using React Native's Appearance API for theming and expo-notifications for notification toggling. All native config (backup opt-out, permissions) is handled in app.json without ejecting.

**Tech Stack:** Expo SDK 54, Expo Router v6, NativeWind v4, expo-sqlite (settings via existing getSetting/setSetting), expo-notifications, expo-file-system, expo-build-properties, EAS CLI

---

## Task 1 — Rename app to ProCreds

**Why:** Switch identity from "Credential Tracker" to ProCreds at the manifest level so subsequent builds carry the correct name, slug, scheme, and bundle identifiers.

- [ ] Open `app.json` and replace contents with the rename + privacy + plugin updates below. NOTE: this single edit also covers Task 4 (privacy keys) and the `expo-build-properties` plugin config that Task 5 depends on. Keep it as one write to avoid churn.

```json
{
  "expo": {
    "name": "ProCreds",
    "slug": "procreds",
    "version": "1.0.0",
    "scheme": "procreds",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.procreds.app",
      "infoPlist": {
        "UIFileSharingEnabled": false,
        "LSSupportsOpeningDocumentsInPlace": false,
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "android": {
      "package": "com.procreds.app",
      "allowBackup": false,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    },
    "plugins": [
      "expo-router",
      "expo-sqlite",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#3B82F6"
        }
      ],
      "@react-native-community/datetimepicker",
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 35,
            "targetSdkVersion": 35,
            "minSdkVersion": 24
          },
          "ios": {
            "deploymentTarget": "15.1"
          }
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] Verify the file parses as JSON and the rename took:

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker"
node -e "const j=require('./app.json'); console.log(j.expo.name, j.expo.slug, j.expo.scheme, j.expo.ios.bundleIdentifier, j.expo.android.package);"
```

Expected output:

```
ProCreds procreds procreds com.procreds.app com.procreds.app
```

- [ ] Install `expo-build-properties` (required by the plugins array above):

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker"
npx expo install expo-build-properties
```

Expected: package added to `dependencies` in `package.json` with an SDK 54-compatible version (e.g. `~1.x.x`).

- [ ] Run typecheck to confirm nothing broke:

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker"
npm run typecheck
```

Expected: exits 0 with no output.

- [ ] Commit:

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker"
git add app.json package.json package-lock.json
git commit -m "Phase 7: rename app to ProCreds + privacy/backup flags + expo-build-properties"
```

---

## Task 2 — Onboarding gate in `app/index.tsx`

**Why:** First launch should land on the onboarding flow; subsequent launches go straight to the tabs. The flag lives in `app_settings` so we reuse the existing `getSetting`/`setSetting` API.

- [ ] Replace `app/index.tsx` with the gated redirect. Use `useEffect` so the gate decision happens after the migrations effect in `_layout.tsx` has run.

```tsx
import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { getSetting } from '@/db/settings';

type Target = '/(tabs)' | '/onboarding';

export default function Index() {
  const [target, setTarget] = useState<Target | null>(null);

  useEffect(() => {
    const done = getSetting('onboarding_complete');
    setTarget(done === 'true' ? '/(tabs)' : '/onboarding');
  }, []);

  if (target === null) return <View className="flex-1 bg-white" />;
  return <Redirect href={target} />;
}
```

- [ ] Typecheck:

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker"
npm run typecheck
```

Expected: exits 0.

- [ ] Commit:

```bash
git add app/index.tsx
git commit -m "Phase 7: gate root index on onboarding_complete setting"
```

---

## Task 3 — Onboarding screen (slides + profile creation)

**Why:** Single-file two-step flow. Step 1 is a horizontal `FlatList` with `pagingEnabled` (no new deps). Step 2 collects name + profession, calls `createProfile`, sets `onboarding_complete=true`, and replaces navigation to `/(tabs)`.

- [ ] Create `app/onboarding.tsx`:

```tsx
import { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createProfile } from '@/db/profiles';
import { setSetting } from '@/db/settings';

type Slide = { key: string; title: string; body: string };

const SLIDES: Slide[] = [
  {
    key: 's1',
    title: 'Track your credentials',
    body: 'Keep every license, certification, and CE requirement in one place.',
  },
  {
    key: 's2',
    title: 'Get reminded before they expire',
    body: 'Smart notifications so a renewal never sneaks up on you.',
  },
  {
    key: 's3',
    title: 'Export a PDF to share with employers',
    body: 'One tap, a clean credential summary you can attach to any application.',
  },
  {
    key: 's4',
    title: 'Your data stays on your device',
    body: 'No cloud sync, no analytics, no sharing. Ever.',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Onboarding() {
  const router = useRouter();
  const listRef = useRef<FlatList<Slide>>(null);
  const [page, setPage] = useState(0);
  const [step, setStep] = useState<'slides' | 'profile'>('slides');
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [saving, setSaving] = useState(false);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / SCREEN_WIDTH);
    if (i !== page) setPage(i);
  };

  const goNext = () => {
    if (page < SLIDES.length - 1) {
      const next = page + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setPage(next);
    } else {
      setStep('profile');
    }
  };

  const finish = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter your name to create your profile.');
      return;
    }
    setSaving(true);
    try {
      createProfile({ name: trimmed, profession: profession.trim() || undefined });
      setSetting('onboarding_complete', 'true');
      router.replace('/(tabs)');
    } catch (err) {
      setSaving(false);
      Alert.alert('Could not create profile', String(err));
    }
  };

  if (step === 'profile') {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 px-6 pt-12">
          <Text className="text-3xl font-bold text-slate-900">Create your profile</Text>
          <Text className="mt-2 text-base text-slate-600">
            We use this to label your credentials. You can edit it later in Settings.
          </Text>

          <View className="mt-8">
            <Text className="text-sm font-semibold text-slate-700">Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              autoCapitalize="words"
              className="mt-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
            />
          </View>

          <View className="mt-5">
            <Text className="text-sm font-semibold text-slate-700">Profession (optional)</Text>
            <TextInput
              value={profession}
              onChangeText={setProfession}
              placeholder="e.g. Registered Nurse"
              autoCapitalize="words"
              className="mt-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
            />
          </View>
        </View>

        <View className="px-6 pb-8">
          <TouchableOpacity
            disabled={saving}
            onPress={finish}
            className={`rounded-xl py-4 ${saving ? 'bg-blue-300' : 'bg-blue-600'}`}
          >
            <Text className="text-center text-base font-semibold text-white">
              {saving ? 'Creating…' : 'Get started'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-3xl font-bold text-slate-900">{item.title}</Text>
            <Text className="mt-4 text-center text-base text-slate-600">{item.body}</Text>
          </View>
        )}
      />

      <View className="flex-row items-center justify-center pb-2">
        {SLIDES.map((s, i) => (
          <View
            key={s.key}
            className={`mx-1 h-2 w-2 rounded-full ${i === page ? 'bg-blue-600' : 'bg-slate-300'}`}
          />
        ))}
      </View>

      <View className="flex-row items-center justify-between px-6 pb-8 pt-4">
        <TouchableOpacity onPress={() => setStep('profile')}>
          <Text className="text-base text-slate-500">Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goNext} className="rounded-xl bg-blue-600 px-6 py-3">
          <Text className="text-base font-semibold text-white">
            {page === SLIDES.length - 1 ? 'Continue' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] Verify the route resolves under typed routes by typechecking:

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker"
npm run typecheck
```

Expected: exits 0. (Expo Router auto-generates `/onboarding` from the new file.)

- [ ] Commit:

```bash
git add app/onboarding.tsx
git commit -m "Phase 7: add onboarding flow (4 slides + profile creation)"
```

---

## Task 4 — Privacy / no-backup wiring in `_layout.tsx`

**Why:** `app.json` already contains `UIFileSharingEnabled: false`, `LSSupportsOpeningDocumentsInPlace: false`, and Android `allowBackup: false` from Task 1. The remaining piece is the iOS iCloud backup exclusion for the SQLite directory.

**Limitation note:** Expo managed workflow does not expose `NSURLIsExcludedFromBackupKey` via JS. We document that the SQLite database file lives in the app sandbox and is removed on uninstall, and that disabling iCloud backup at the file level requires a custom dev-client native module. We still record a one-time `backup_excluded='true'` flag for forward-compatibility so a future native helper can no-op safely. We also apply the saved theme on startup here to keep `_layout.tsx` as the single startup-effect site.

- [ ] Replace `app/_layout.tsx`:

```tsx
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { runMigrations } from '@/db/migrations';
import { getDb } from '@/db/client';
import { initRevenueCat } from '@/purchases/revenuecat';
import { getSetting, setSetting } from '@/db/settings';
import '../global.css';

function applyStoredTheme() {
  const t = getSetting('theme');
  if (t === 'light' || t === 'dark') {
    Appearance.setColorScheme(t);
  } else {
    // 'system' or unset — let the OS drive it
    Appearance.setColorScheme(null);
  }
}

async function markBackupExclusionOnce() {
  if (getSetting('backup_excluded') === 'true') return;
  try {
    const sqliteDir = `${FileSystem.documentDirectory}SQLite`;
    const info = await FileSystem.getInfoAsync(sqliteDir);
    if (info.exists) {
      // NOTE: expo-file-system in managed workflow cannot set NSURLIsExcludedFromBackupKey
      // directly. The SQLite file lives in the app sandbox and is wiped on uninstall.
      // app.json sets allowBackup:false (Android) and UIFileSharingEnabled:false (iOS).
      // Recording the flag so a future native helper can detect prior runs.
      setSetting('backup_excluded', 'true');
    }
  } catch {
    // best-effort, ignore
  }
}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    runMigrations(getDb());
    applyStoredTheme();
    markBackupExclusionOnce();
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
```

- [ ] Install `expo-file-system` if it isn't already:

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker"
node -e "try{require.resolve('expo-file-system');console.log('present')}catch{console.log('missing')}"
```

If output is `missing`, run:

```bash
npx expo install expo-file-system
```

Expected: present, or installed.

- [ ] Typecheck:

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] Commit:

```bash
git add app/_layout.tsx package.json package-lock.json
git commit -m "Phase 7: apply stored theme on startup + record backup-exclusion flag"
```

---

## Task 5 — Profile edit screen

**Why:** Settings → Profiles → Edit needs a destination. Mirrors the onboarding profile form but uses `updateProfile`.

- [ ] Create `app/profile/[id]/edit.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfile, updateProfile } from '@/db/profiles';

export default function EditProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    const p = getProfile(id);
    if (!p) {
      Alert.alert('Profile not found');
      router.back();
      return;
    }
    setName(p.name);
    setProfession(p.profession ?? '');
    setLoaded(true);
  }, [id, router]);

  const save = () => {
    if (!id) return;
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required');
      return;
    }
    updateProfile(id, { name: trimmed, profession: profession.trim() || null });
    router.back();
  };

  if (!loaded) return <SafeAreaView className="flex-1 bg-white" />;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-base text-blue-600">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-slate-900">Edit profile</Text>
        <TouchableOpacity onPress={save}>
          <Text className="text-base font-semibold text-blue-600">Save</Text>
        </TouchableOpacity>
      </View>

      <View className="px-6 pt-6">
        <Text className="text-sm font-semibold text-slate-700">Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your full name"
          autoCapitalize="words"
          className="mt-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
        />

        <Text className="mt-5 text-sm font-semibold text-slate-700">Profession</Text>
        <TextInput
          value={profession}
          onChangeText={setProfession}
          placeholder="e.g. Registered Nurse"
          autoCapitalize="words"
          className="mt-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
        />
      </View>
    </SafeAreaView>
  );
}
```

- [ ] Typecheck:

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker"
npm run typecheck
```

Expected: exits 0.

- [ ] Commit:

```bash
git add app/profile/[id]/edit.tsx
git commit -m "Phase 7: add profile edit screen"
```

---

## Task 6 — Pure helper: reset & erase data functions (TDD)

**Why:** The Settings screen's destructive buttons need testable wipe logic. Writing the data-layer helpers first lets us unit-test them; the screen then only handles confirmation UX.

- [ ] First, peek at the current schema to confirm table names. Run:

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker"
grep -n "CREATE TABLE" src/db/migrations.ts
```

Expected: lists the tables (profiles, credentials, ce_courses or similar, app_settings). The reset/erase functions below assume `credentials`, `ce_courses`, `profiles`, `app_settings`. **If table names differ, adjust the SQL in `src/db/reset.ts` and the test before continuing.**

- [ ] Create the test first at `src/db/__tests__/reset.test.ts`:

```ts
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
      "INSERT INTO credentials (id, profile_id, name, expires_at) VALUES (?, ?, ?, ?)",
      'c1', p.id, 'License', Date.now()
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
```

> **Note for implementer:** if the existing `credentials` table has additional NOT NULL columns, extend the test INSERT accordingly. The point of the test is only to prove the row count drops to zero — adapt columns to schema.

- [ ] Run the test to confirm it fails (red):

```bash
npm test -- src/db/__tests__/reset.test.ts
```

Expected: fails with `Cannot find module '../reset'`.

- [ ] Now implement `src/db/reset.ts`:

```ts
import { getDb } from './client';
import * as Notifications from 'expo-notifications';

/**
 * Clears credential + CE data for ALL profiles. Keeps profiles and app_settings.
 * Also cancels every locally scheduled notification because they referenced
 * credentials that no longer exist.
 */
export function resetCredentialData(): void {
  const db = getDb();
  db.runSync('DELETE FROM ce_courses');
  db.runSync('DELETE FROM credentials');
  // Best-effort: don't await here so the function stays sync for tests.
  Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

/**
 * Wipes every user-data table including profiles and settings, effectively
 * returning the app to first-launch state.
 */
export function eraseEverything(): void {
  const db = getDb();
  db.runSync('DELETE FROM ce_courses');
  db.runSync('DELETE FROM credentials');
  db.runSync('DELETE FROM profiles');
  db.runSync('DELETE FROM app_settings');
  Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}
```

- [ ] If `expo-notifications` is not already mocked in `jest.setup.ts`, add a mock so the test doesn't try to hit native code. Check first:

```bash
grep -n "expo-notifications" jest.setup.ts __mocks__/* 2>/dev/null
```

If no mock exists, append to `jest.setup.ts`:

```ts
jest.mock('expo-notifications', () => ({
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => 'mock-id'),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: () => {} })),
}));
```

- [ ] Run the test again (green):

```bash
npm test -- src/db/__tests__/reset.test.ts
```

Expected: both tests pass.

- [ ] Run full test suite to confirm no regressions:

```bash
npm test
```

Expected: all tests pass.

- [ ] Commit:

```bash
git add src/db/reset.ts src/db/__tests__/reset.test.ts jest.setup.ts
git commit -m "Phase 7: add resetCredentialData + eraseEverything helpers (TDD)"
```

---

## Task 7 — Settings screen (replace stub)

**Why:** Wire the four sections (Appearance, Notifications, Profiles, Data) using helpers built so far.

- [ ] Replace `app/(tabs)/settings.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Appearance,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSetting, setSetting } from '@/db/settings';
import { listProfiles, type Profile } from '@/db/profiles';
import { resetCredentialData, eraseEverything } from '@/db/reset';

type ThemeMode = 'light' | 'dark' | 'system';

function applyTheme(mode: ThemeMode) {
  Appearance.setColorScheme(mode === 'system' ? null : mode);
}

export default function Settings() {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const loadProfiles = useCallback(() => {
    setProfiles(listProfiles());
  }, []);

  useEffect(() => {
    const t = (getSetting('theme') as ThemeMode | null) ?? 'system';
    setTheme(t);
    const n = getSetting('notifications_enabled');
    setNotifEnabled(n === null ? true : n === 'true');
    loadProfiles();
  }, [loadProfiles]);

  useFocusEffect(
    useCallback(() => {
      loadProfiles();
    }, [loadProfiles])
  );

  const changeTheme = (mode: ThemeMode) => {
    setTheme(mode);
    setSetting('theme', mode);
    applyTheme(mode);
  };

  const toggleNotifications = async (next: boolean) => {
    setNotifEnabled(next);
    setSetting('notifications_enabled', next ? 'true' : 'false');
    if (!next) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } else {
      const cur = await Notifications.getPermissionsAsync();
      if (cur.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        if (req.status !== 'granted') {
          Alert.alert(
            'Permission denied',
            'Enable notifications for ProCreds in your device settings to receive renewal reminders.'
          );
        }
      }
    }
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset data?',
      'This deletes every credential and CE course for all profiles. Profiles and settings are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetCredentialData();
            Alert.alert('Done', 'Credential and CE data has been cleared.');
          },
        },
      ]
    );
  };

  const confirmErase = () => {
    Alert.alert(
      'Erase everything?',
      'This deletes ALL profiles, credentials, CE courses, and settings. The app restarts to onboarding. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase',
          style: 'destructive',
          onPress: () => {
            eraseEverything();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-5 pt-6 pb-4">
          <Text className="text-3xl font-bold text-slate-900">Settings</Text>
        </View>

        {/* Appearance */}
        <Section title="Appearance">
          <View className="flex-row rounded-xl bg-slate-200 p-1">
            {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => changeTheme(m)}
                className={`flex-1 rounded-lg py-2 ${theme === m ? 'bg-white' : ''}`}
              >
                <Text
                  className={`text-center text-sm capitalize ${
                    theme === m ? 'font-semibold text-slate-900' : 'text-slate-600'
                  }`}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <View className="flex-row items-center justify-between">
            <Text className="text-base text-slate-900">Renewal reminders</Text>
            <Switch value={notifEnabled} onValueChange={toggleNotifications} />
          </View>
        </Section>

        {/* Profiles */}
        <Section title="Profiles">
          {profiles.length === 0 ? (
            <Text className="text-sm text-slate-500">No profiles yet.</Text>
          ) : (
            profiles.map((p) => (
              <View
                key={p.id}
                className="flex-row items-center justify-between border-b border-slate-100 py-3 last:border-b-0"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-base font-semibold text-slate-900">{p.name}</Text>
                  {p.profession ? (
                    <Text className="text-sm text-slate-500">{p.profession}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => router.push(`/profile/${p.id}/edit`)}
                  className="rounded-lg bg-slate-100 px-3 py-2"
                >
                  <Text className="text-sm font-semibold text-blue-600">Edit</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </Section>

        {/* Data */}
        <Section title="Data">
          <TouchableOpacity
            onPress={confirmReset}
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3"
          >
            <Text className="text-base font-semibold text-amber-700">Reset data</Text>
            <Text className="mt-0.5 text-xs text-amber-600">
              Clears all credentials and CE. Keeps profiles and settings.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={confirmErase}
            className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3"
          >
            <Text className="text-base font-semibold text-red-700">Erase everything</Text>
            <Text className="mt-0.5 text-xs text-red-600">
              Deletes all data and resets the app to first-launch.
            </Text>
          </TouchableOpacity>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mx-5 mt-3 rounded-2xl bg-white p-4 shadow-sm">
      <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </Text>
      {children}
    </View>
  );
}
```

- [ ] Typecheck:

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker"
npm run typecheck
```

Expected: exits 0.

- [ ] Run tests to make sure nothing regressed:

```bash
npm test
```

Expected: all tests pass.

- [ ] Commit:

```bash
git add app/\(tabs\)/settings.tsx
git commit -m "Phase 7: build full settings screen (Appearance/Notifications/Profiles/Data)"
```

---

## Task 8 — `eas.json` annotations + production submit fields

**Why:** Make the placeholders explicit and self-documenting so a future agent (or JC) knows exactly what to fill in. EAS allows JSON without comments only — so we keep the values as `REPLACE_ME` strings and document each in `SETUP.md`. We add a small marker comment field that EAS ignores: `"_comment"`.

- [ ] Replace `eas.json`:

```json
{
  "cli": { "version": ">= 7.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "_comment": "See SETUP.md section 'EAS Submit Fields' for where to find each value.",
      "ios": {
        "appleId": "REPLACE_ME_APPLE_ID_EMAIL",
        "ascAppId": "REPLACE_ME_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "REPLACE_ME_APPLE_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

- [ ] Verify it parses:

```bash
node -e "console.log(Object.keys(require('./eas.json')))"
```

Expected: `[ 'cli', 'build', 'submit' ]`.

- [ ] Commit:

```bash
git add eas.json
git commit -m "Phase 7: annotate eas.json submit placeholders"
```

---

## Task 9 — `SETUP.md` with EAS instructions

**Why:** A single source of truth for getting from a fresh clone to a TestFlight + Play Console upload.

- [ ] Create `SETUP.md` in the project root (`/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker/SETUP.md`):

```markdown
# ProCreds — EAS Setup Guide

This document walks a new contributor (or future Claude) from a clean clone to the first App Store + Play Store build.

## 1. Create / sign into an Expo account

1. Visit https://expo.dev and create a free account if you don't have one.
2. From the project root, run:

   ```bash
   npx eas-cli login
   ```

3. Confirm login:

   ```bash
   npx eas-cli whoami
   ```

## 2. Configure EAS for this project

Already configured — `eas.json` is checked in. If you ever need to regenerate or repair it:

```bash
npx eas-cli build:configure
```

## 3. Apple developer fields (for `eas.json` → `submit.production.ios`)

You need an active **Apple Developer Program** membership ($99/yr).

| Field | Where to find it |
|---|---|
| `appleId` | The email address of your Apple ID (the one enrolled in the Apple Developer Program). |
| `appleTeamId` | https://developer.apple.com/account → "Membership" → "Team ID" (10-character alphanumeric). |
| `ascAppId` | Create the app at https://appstoreconnect.apple.com → "My Apps" → "+" → New App. After creation, the Apple ID for the listing appears in App Information → "Apple ID" (numeric). |

Bundle identifier is already `com.procreds.app` in `app.json` and must match the App Store Connect record exactly.

## 4. Google Play fields (for `eas.json` → `submit.production.android`)

1. Create a Play Console account ($25 one-time): https://play.google.com/console
2. Create a new app with package `com.procreds.app`.
3. Generate a service account JSON key:
   - Google Cloud Console → IAM → Service Accounts → Create.
   - Grant it `Service Account User` and link it to Play Console (Play Console → Setup → API access).
4. Save the JSON as `play-service-account.json` in the project root. **Do not commit it** — it should be in `.gitignore`.

## 5. First build

Run a production build for both platforms:

```bash
npx eas-cli build --profile production --platform all
```

EAS will prompt to register iOS credentials (push key, distribution cert) — accept the auto-managed flow.

## 6. First submit

```bash
npx eas-cli submit --profile production --platform ios
npx eas-cli submit --profile production --platform android
```

iOS goes to TestFlight; Android lands in the Internal track.

## 7. Add `play-service-account.json` to `.gitignore`

If it isn't already:

```bash
echo "play-service-account.json" >> .gitignore
```
```

- [ ] Ensure `play-service-account.json` is gitignored (the SETUP.md last step is a manual reminder, but do it now so it's enforced):

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker"
grep -q "play-service-account.json" .gitignore 2>/dev/null || echo "play-service-account.json" >> .gitignore
```

Expected: `.gitignore` contains the line afterward.

- [ ] Commit:

```bash
git add SETUP.md .gitignore
git commit -m "Phase 7: add SETUP.md EAS guide + gitignore play service account"
```

---

## Task 10 — Final verification

- [ ] Full typecheck:

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker"
npm run typecheck
```

Expected: exits 0.

- [ ] Full test run:

```bash
npm test
```

Expected: all suites pass, including the new `reset.test.ts`.

- [ ] Static config sanity check:

```bash
node -e "const j=require('./app.json'); const e=require('./eas.json'); if(j.expo.name!=='ProCreds')throw'name'; if(j.expo.slug!=='procreds')throw'slug'; if(j.expo.scheme!=='procreds')throw'scheme'; if(j.expo.ios.bundleIdentifier!=='com.procreds.app')throw'ios bundle'; if(j.expo.android.package!=='com.procreds.app')throw'android package'; if(j.expo.android.allowBackup!==false)throw'allowBackup'; if(j.expo.ios.infoPlist.UIFileSharingEnabled!==false)throw'fileSharing'; if(!e.submit.production.ios.appleId.startsWith('REPLACE_ME'))throw'iosAppleId'; console.log('ok');"
```

Expected: prints `ok`.

- [ ] Boot the app once on a simulator and walk through onboarding manually (this is a sanity check, not a hard gate — fine to skip in headless CI):

```bash
npx expo start --ios
```

Manual checks:
1. App launches into onboarding on first run.
2. Swiping advances slides; "Skip" jumps to profile creation.
3. Creating a profile lands in the tabs.
4. Settings → Appearance flips light/dark immediately.
5. Settings → Notifications toggle requests permission on enable, cancels all scheduled on disable.
6. Settings → Profiles → Edit opens the edit screen and saves.
7. Settings → Reset data confirms then clears credentials.
8. Settings → Erase everything confirms then returns to onboarding.
9. Killing and relaunching after onboarding lands directly in the tabs (no slides).

- [ ] If everything passes, this phase is complete. No final commit needed unless verification surfaced changes.

---

## Out of scope / future work

- True iOS iCloud-backup exclusion via `NSURLIsExcludedFromBackupKey` requires a custom dev-client native module. Tracked as future enhancement; not blocking submission.
- App Store screenshots, marketing copy, and privacy policy URL are produced outside this plan.
- Localization of onboarding strings.
