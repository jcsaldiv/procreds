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
