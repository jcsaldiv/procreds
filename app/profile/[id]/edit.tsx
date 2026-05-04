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
