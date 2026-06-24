import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Appearance,
  TextInput,
  Pressable,
  useColorScheme,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useFocusEffect } from 'expo-router';
import { getSetting, setSetting } from '@/db/settings';
import { listProfiles, type Profile } from '@/db/profiles';
import { resetCredentialData, eraseEverything } from '@/db/reset';
import { isBiometricAvailable, authenticate } from '@/lib/biometrics';

type ThemeMode = 'light' | 'dark' | 'system';

type ProviderId = 'claude' | 'chatgpt' | 'grok' | 'ollama' | 'custom';

type Provider = {
  id: ProviderId;
  name: string;
  baseUrl: string;
  defaultModel: string;
};

const PROVIDERS: Provider[] = [
  { id: 'claude',   name: 'Claude',   baseUrl: 'https://api.anthropic.com/v1', defaultModel: 'claude-sonnet-4-6' },
  { id: 'chatgpt',  name: 'ChatGPT',  baseUrl: 'https://api.openai.com/v1',    defaultModel: 'gpt-4o' },
  { id: 'grok',     name: 'Grok',     baseUrl: 'https://api.x.ai/v1',          defaultModel: 'grok-2-vision-1212' },
  { id: 'ollama',   name: 'Ollama',   baseUrl: 'http://localhost:11434/v1',     defaultModel: 'llava' },
  { id: 'custom',   name: 'Custom',   baseUrl: '',                              defaultModel: '' },
];

function applyTheme(mode: ThemeMode) {
  Appearance.setColorScheme(mode === 'system' ? null : mode);
}

export default function Settings() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Security
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

  // AI Scanning
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>('chatgpt');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiKey, setAiKey] = useState('');

  const loadProfiles = useCallback(() => {
    setProfiles(listProfiles());
  }, []);

  useEffect(() => {
    const t = (getSetting('theme') as ThemeMode | null) ?? 'system';
    setTheme(t);
    const n = getSetting('notifications_enabled');
    setNotifEnabled(n === null ? true : n === 'true');
    loadProfiles();

    isBiometricAvailable().then((avail) => {
      setBioAvailable(avail);
      setBioEnabled(getSetting('biometrics_enabled') === 'true');
    });

    const savedProvider = (getSetting('ai_provider') as ProviderId | null) ?? 'chatgpt';
    setSelectedProvider(savedProvider);
    setAiBaseUrl(getSetting('ai_base_url') ?? '');
    setAiModel(getSetting('ai_model') ?? '');
    SecureStore.getItemAsync('ai_api_key').then((k) => setAiKey(k ?? ''));
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

  const selectProvider = (p: Provider) => {
    setSelectedProvider(p.id);
    setSetting('ai_provider', p.id);
    if (p.id !== 'custom') {
      setAiBaseUrl(p.baseUrl);
      setAiModel(p.defaultModel);
      setSetting('ai_base_url', p.baseUrl);
      setSetting('ai_model', p.defaultModel);
    }
  };

  const confirmReset = async () => {
    const bioOn = getSetting('biometrics_enabled') === 'true';
    if (bioOn) {
      const ok = await authenticate('Confirm reset data');
      if (!ok) { Alert.alert('Authentication required'); return; }
    }
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

  const confirmErase = async () => {
    const bioOn = getSetting('biometrics_enabled') === 'true';
    if (bioOn) {
      const ok = await authenticate('Confirm erase everything');
      if (!ok) { Alert.alert('Authentication required'); return; }
    }
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
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-5 pt-6 pb-4">
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">Settings</Text>
        </View>

        {/* Appearance */}
        <Section title="Appearance">
          <View className="flex-row rounded-xl bg-slate-200 dark:bg-slate-700 p-1">
            {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => changeTheme(m)}
                className={`flex-1 rounded-lg py-2 ${theme === m ? 'bg-white dark:bg-slate-900' : ''}`}
              >
                <Text
                  className={`text-center text-sm capitalize ${
                    theme === m ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
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
            <Text className="text-base text-slate-900 dark:text-white">Renewal reminders</Text>
            <Switch value={notifEnabled} onValueChange={toggleNotifications} />
          </View>
        </Section>

        {/* Security */}
        {bioAvailable ? (
          <Section title="Security">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-base text-slate-900 dark:text-white">Require Face ID / Biometrics</Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Lock app on launch and before destructive actions
                </Text>
              </View>
              <Switch
                value={bioEnabled}
                onValueChange={(next) => {
                  setBioEnabled(next);
                  setSetting('biometrics_enabled', next ? 'true' : 'false');
                }}
              />
            </View>
          </Section>
        ) : null}

        {/* AI Scanning */}
        <Section title="AI Scanning">
          <Text className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Scan a document with your camera and let AI pre-fill the form. Choose your provider and enter your API key.
          </Text>

          {/* Provider picker */}
          <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Provider</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {PROVIDERS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => selectProvider(p)}
                className={`px-3 py-2 rounded-lg border ${
                  selectedProvider === p.id
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    selectedProvider === p.id ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {p.name}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Base URL — editable for custom, read-only display for presets */}
          <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Base URL</Text>
          <TextInput
            value={aiBaseUrl}
            onChangeText={setAiBaseUrl}
            onBlur={() => setSetting('ai_base_url', aiBaseUrl)}
            placeholder="https://api.openai.com/v1"
            placeholderTextColor={isDark ? '#64748b' : '#9ca3af'}
            autoCapitalize="none"
            autoCorrect={false}
            editable={selectedProvider === 'custom'}
            className={`border rounded-lg px-3 py-2 text-sm mb-3 ${
              selectedProvider === 'custom'
                ? 'border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-800'
                : 'border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900'
            }`}
          />

          {/* Model */}
          <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Model</Text>
          <TextInput
            value={aiModel}
            onChangeText={setAiModel}
            onBlur={() => setSetting('ai_model', aiModel)}
            placeholder="e.g. gpt-4o, claude-sonnet-4-6, llava"
            placeholderTextColor={isDark ? '#64748b' : '#9ca3af'}
            autoCapitalize="none"
            autoCorrect={false}
            className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 mb-3"
          />

          {/* API Key */}
          <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            API Key{selectedProvider === 'ollama' ? ' (not needed for Ollama)' : ''}
          </Text>
          <TextInput
            value={aiKey}
            onChangeText={setAiKey}
            onBlur={() => SecureStore.setItemAsync('ai_api_key', aiKey)}
            placeholder={selectedProvider === 'ollama' ? 'Leave blank' : 'sk-... or your API key'}
            placeholderTextColor={isDark ? '#64748b' : '#9ca3af'}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800"
          />
        </Section>

        {/* Profiles */}
        <Section title="Profiles">
          {profiles.length === 0 ? (
            <Text className="text-sm text-slate-500 dark:text-slate-400">No profiles yet.</Text>
          ) : (
            profiles.map((p) => (
              <View
                key={p.id}
                className="flex-row items-center justify-between border-b border-slate-100 dark:border-slate-700 py-3 last:border-b-0"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-base font-semibold text-slate-900 dark:text-white">{p.name}</Text>
                  {p.profession ? (
                    <Text className="text-sm text-slate-500 dark:text-slate-400">{p.profession}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => router.push(`/profile/${p.id}/edit`)}
                  className="rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-2"
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
            className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-4 py-3"
          >
            <Text className="text-base font-semibold text-amber-700 dark:text-amber-300">Reset data</Text>
            <Text className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
              Clears all credentials and CE. Keeps profiles and settings.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={confirmErase}
            className="mt-3 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3"
          >
            <Text className="text-base font-semibold text-red-700 dark:text-red-300">Erase everything</Text>
            <Text className="mt-0.5 text-xs text-red-600 dark:text-red-400">
              Deletes all data and resets the app to first-launch.
            </Text>
          </TouchableOpacity>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mx-5 mt-3 rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm">
      <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </Text>
      {children}
    </View>
  );
}
