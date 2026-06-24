import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { useTabletStyle } from '@/hooks/useIsTablet';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { getCredential, deleteCredential, type Credential } from '@/db/credentials';
import { listCeForCredential, type CeCourse } from '@/db/ce';
import { calculateStatus } from '@/domain/status';
import { format, parseISO } from 'date-fns';
const fmtDate = (iso: string) => format(parseISO(iso), 'MM-dd-yyyy');
import { StatusBadge } from '@/components/StatusBadge';
import { CeRow } from '@/components/CeRow';
import { usePro } from '@/purchases/usePro';
import { cancelForCredential } from '@/notifications/scheduler';
import { getSetting } from '@/db/settings';
import { authenticate } from '@/lib/biometrics';

export default function CredentialDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isPro = usePro();
  const tabletStyle = useTabletStyle();
  const [cred, setCred] = useState<Credential | null>(null);
  const [ces, setCes] = useState<CeCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!id) return;
    setCred(getCredential(id));
    setCes(listCeForCredential(id));
    setLoading(false);
  }, [id]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (loading) return <LoadingState />;
  if (!cred) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-900">
        <Pressable onPress={() => router.back()} className="p-4">
          <Text className="text-blue-600 text-base">← Back</Text>
        </Pressable>
        <EmptyState title="Credential not found" body="It may have been deleted." />
      </View>
    );
  }
  const status = calculateStatus(cred.expiration_date);

  const onDelete = async () => {
    const bioEnabled = getSetting('biometrics_enabled') === 'true';
    if (bioEnabled) {
      const ok = await authenticate('Confirm delete credential');
      if (!ok) { Alert.alert('Authentication required'); return; }
    }
    Alert.alert('Delete credential?', 'This will also remove its CE entries from this credential.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await cancelForCredential(cred.id);
        deleteCredential(cred.id);
        router.back();
      }},
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-slate-900 p-4">
      <View style={tabletStyle}>
      <Header title={cred.name} onBack={() => router.back()} right={<StatusBadge status={status} />} className="mb-2" />
      {cred.issuing_body ? <Text className="text-slate-600 dark:text-slate-400 mt-1">{cred.issuing_body}</Text> : null}
      {cred.credential_number ? <Text className="text-slate-500 dark:text-slate-400 mt-1">#{cred.credential_number}</Text> : null}
      {cred.issue_date ? <Text className="text-slate-700 dark:text-slate-300 mt-2">Issued: {fmtDate(cred.issue_date)}</Text> : null}
      {cred.expiration_date ? <Text className="text-slate-700 dark:text-slate-300">Expires: {fmtDate(cred.expiration_date)}</Text> : null}
      {cred.renewal_url ? (
        <Pressable
          onPress={() => {
            const url = cred.renewal_url!;
            Linking.openURL(url.startsWith('http') ? url : `https://${url}`);
          }}
          className="mt-2"
        >
          <Text className="text-blue-600">Open renewal site</Text>
        </Pressable>
      ) : null}
      {cred.notes ? <Text className="text-slate-700 dark:text-slate-300 mt-3">{cred.notes}</Text> : null}

      <View className="flex-row gap-3 mt-4">
        <Button onPress={() => router.push(`/credential/${cred.id}/edit`)} label="Edit" variant="secondary" size="md" flex />
        <Button onPress={onDelete} label="Delete" variant="destructive" size="md" flex />
      </View>

      <View className="mt-6 flex-row justify-between items-center">
        <Text className="text-xl font-bold text-slate-900 dark:text-white">CE Hours</Text>
        {isPro ? (
          <Button onPress={() => router.push(`/credential/${cred.id}/ce/new`)} label="+ Log CE" size="sm" />
        ) : (
          <Pressable onPress={() => router.push('/paywall')}>
            <Text className="text-blue-600">Unlock CE (Pro)</Text>
          </Pressable>
        )}
      </View>
      {ces.map((c) => (
        <CeRow key={c.id} item={c} onPress={() => router.push(`/credential/${cred.id}/ce/${c.id}`)} />
      ))}
      {ces.length === 0 ? <Text className="text-slate-500 dark:text-slate-500 mt-2">No CE logged yet.</Text> : null}
      </View>
    </ScrollView>
  );
}
