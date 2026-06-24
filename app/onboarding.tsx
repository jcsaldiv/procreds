import { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  useWindowDimensions,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createProfile } from '@/db/profiles';
import { setSetting } from '@/db/settings';
import { useActiveProfile } from '@/state/activeProfile';

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

export default function Onboarding() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [page, setPage] = useState(0);
  const [step, setStep] = useState<'slides' | 'profile'>('slides');
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [saving, setSaving] = useState(false);
  const { setActiveProfileId } = useActiveProfile();

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
      const profile = createProfile({ name: trimmed, profession: profession.trim() || undefined });
      setActiveProfileId(profile.id);
      setSetting('onboarding_complete', 'true');
      router.replace('/(tabs)');
    } catch (err) {
      setSaving(false);
      Alert.alert('Could not create profile', String(err));
    }
  };

  if (step === 'profile') {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="px-6 pt-12">
              <Text className="text-3xl font-bold text-slate-900 dark:text-white">Create your profile</Text>
              <Text className="mt-2 text-base text-slate-600 dark:text-slate-400">
                We use this to label your credentials. You can edit it later in Settings.
              </Text>

              <View className="mt-8">
                <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your full name"
                  placeholderTextColor={isDark ? '#64748b' : '#9ca3af'}
                  autoCapitalize="words"
                  returnKeyType="next"
                  className="mt-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-base text-slate-900 dark:text-white"
                />
              </View>

              <View className="mt-5">
                <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">Profession (optional)</Text>
                <TextInput
                  value={profession}
                  onChangeText={setProfession}
                  placeholder="e.g. Registered Nurse"
                  placeholderTextColor={isDark ? '#64748b' : '#9ca3af'}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={finish}
                  className="mt-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-base text-slate-900 dark:text-white"
                />
              </View>
            </View>

            <View className="px-6 pb-8 pt-6">
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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
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
            <Text className="text-center text-3xl font-bold text-slate-900 dark:text-white">{item.title}</Text>
            <Text className="mt-4 text-center text-base text-slate-600 dark:text-slate-400">{item.body}</Text>
          </View>
        )}
      />

      <View className="flex-row items-center justify-center pb-2">
        {SLIDES.map((s, i) => (
          <View
            key={s.key}
            className={`mx-1 h-2 w-2 rounded-full ${i === page ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
          />
        ))}
      </View>

      <View className="flex-row items-center justify-between px-6 pb-8 pt-4">
        <TouchableOpacity onPress={() => setStep('profile')}>
          <Text className="text-base text-slate-500 dark:text-slate-400">Skip</Text>
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
