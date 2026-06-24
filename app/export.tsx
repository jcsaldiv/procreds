import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { useTabletStyle } from '@/hooks/useIsTablet';
import { useRouter } from 'expo-router';
import { listProfiles, getProfile, type Profile } from '@/db/profiles';
import { listCredentialsForProfile } from '@/db/credentials';
import { usePro } from '@/purchases/usePro';
import { shareCredentialReport } from '@/lib/export';
import { getSetting } from '@/db/settings';
import { authenticate } from '@/lib/biometrics';

export default function ExportScreen() {
  const router = useRouter();
  const isPro = usePro();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const tabletStyle = useTabletStyle();

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
    const bioEnabled = getSetting('biometrics_enabled') === 'true';
    if (bioEnabled) {
      const ok = await authenticate('Confirm data export');
      if (!ok) { Alert.alert('Authentication required'); return; }
    }
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

  if (profiles.length === 0) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-900">
        <Pressable onPress={() => router.back()} className="p-6 pb-0">
          <Text className="text-blue-600 text-base">← Back</Text>
        </Pressable>
        <EmptyState
          title="No profiles yet"
          body="Create a profile in Settings before exporting."
        />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-slate-900 p-6">
      <View style={tabletStyle}>
      <Text className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Export Credentials</Text>
      <Text className="text-slate-600 dark:text-slate-400 mb-6">
        Select a profile and export a PDF you can share with employers or attach to applications.
      </Text>

      <Text className="text-base font-semibold mb-2 text-slate-900 dark:text-white">Select Profile</Text>
      {profiles.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => setSelectedId(p.id)}
          className={`p-3 rounded-lg border mb-2 ${
            selectedId === p.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-950' : 'border-slate-200 dark:border-slate-700'
          }`}
        >
          <Text className={`font-medium ${selectedId === p.id ? 'text-blue-600' : 'text-slate-800 dark:text-slate-100'}`}>
            {p.name}
          </Text>
          {p.profession ? (
            <Text className="text-xs text-slate-500 dark:text-slate-400">{p.profession}</Text>
          ) : null}
        </Pressable>
      ))}

      <Button
        onPress={handleExport}
        label="Export PDF"
        loading={exporting}
        disabled={!selectedId || exporting}
        className="mt-4"
      />

      <Pressable onPress={() => router.back()} className="mt-3 items-center">
        <Text className="text-slate-500 dark:text-slate-400">Cancel</Text>
      </Pressable>
      </View>
    </ScrollView>
  );
}
