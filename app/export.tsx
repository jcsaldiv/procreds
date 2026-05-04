import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { listProfiles, getProfile, type Profile } from '@/db/profiles';
import { listCredentialsForProfile } from '@/db/credentials';
import { usePro } from '@/purchases/usePro';
import { shareCredentialReport } from '@/lib/export';

export default function ExportScreen() {
  const router = useRouter();
  const isPro = usePro();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const all = listProfiles();
    setProfiles(all);
    if (all.length > 0) setSelectedId(all[0].id);
  }, []);

  useEffect(() => {
    if (!isPro) router.replace('/paywall');
  }, [isPro, router]);

  const handleExport = async () => {
    if (!selectedId) return;
    const profile = getProfile(selectedId);
    if (!profile) return;
    const credentials = listCredentialsForProfile(selectedId);
    setExporting(true);
    try {
      await shareCredentialReport(profile, credentials);
    } catch (e: any) {
      if (!e?.message?.includes('cancel')) {
        Alert.alert('Export failed', String(e?.message ?? e));
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white p-6">
      <Text className="text-2xl font-bold mb-2">Export Credentials</Text>
      <Text className="text-gray-600 mb-6">
        Select a profile and export a PDF you can share with employers or attach to applications.
      </Text>

      <Text className="text-base font-semibold mb-2">Select Profile</Text>
      {profiles.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => setSelectedId(p.id)}
          className={`p-3 rounded-lg border mb-2 ${
            selectedId === p.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
          }`}
        >
          <Text className={`font-medium ${selectedId === p.id ? 'text-blue-600' : 'text-gray-800'}`}>
            {p.name}
          </Text>
          {p.profession ? (
            <Text className="text-xs text-gray-500">{p.profession}</Text>
          ) : null}
        </Pressable>
      ))}

      <Pressable
        onPress={handleExport}
        disabled={!selectedId || exporting}
        className={`bg-blue-600 py-3 rounded-lg items-center mt-4 ${(!selectedId || exporting) ? 'opacity-50' : ''}`}
      >
        {exporting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold">Export PDF</Text>
        )}
      </Pressable>

      <Pressable onPress={() => router.back()} className="mt-3 items-center">
        <Text className="text-gray-500">Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}
