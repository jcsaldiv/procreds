import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { getCredential, deleteCredential, type Credential } from '@/db/credentials';
import { listCeForCredential, type CeCourse } from '@/db/ce';
import { calculateStatus } from '@/domain/status';
import { StatusBadge } from '@/components/StatusBadge';
import { CeRow } from '@/components/CeRow';
import { usePro } from '@/purchases/usePro';
import { cancelForCredential } from '@/notifications/scheduler';

export default function CredentialDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isPro = usePro();
  const [cred, setCred] = useState<Credential | null>(null);
  const [ces, setCes] = useState<CeCourse[]>([]);

  const refresh = useCallback(() => {
    if (!id) return;
    setCred(getCredential(id));
    setCes(listCeForCredential(id));
  }, [id]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (!cred) return null;
  const status = calculateStatus(cred.expiration_date);

  const onDelete = () => {
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
    <ScrollView className="flex-1 bg-white p-4">
      <View className="flex-row justify-between items-start">
        <Text className="text-2xl font-bold flex-1 pr-2">{cred.name}</Text>
        <StatusBadge status={status} />
      </View>
      {cred.issuing_body ? <Text className="text-gray-600 mt-1">{cred.issuing_body}</Text> : null}
      {cred.credential_number ? <Text className="text-gray-500 mt-1">#{cred.credential_number}</Text> : null}
      {cred.issue_date ? <Text className="text-gray-700 mt-2">Issued: {cred.issue_date}</Text> : null}
      {cred.expiration_date ? <Text className="text-gray-700">Expires: {cred.expiration_date}</Text> : null}
      {cred.renewal_url ? (
        <Pressable onPress={() => Linking.openURL(cred.renewal_url!)} className="mt-2">
          <Text className="text-blue-600">Open renewal site</Text>
        </Pressable>
      ) : null}
      {cred.notes ? <Text className="text-gray-700 mt-3">{cred.notes}</Text> : null}

      <View className="flex-row gap-3 mt-4">
        <Pressable onPress={() => router.push(`/credential/${cred.id}/edit`)} className="flex-1 bg-gray-200 py-2 rounded-lg items-center">
          <Text className="font-semibold">Edit</Text>
        </Pressable>
        <Pressable onPress={onDelete} className="flex-1 bg-red-600 py-2 rounded-lg items-center">
          <Text className="text-white font-semibold">Delete</Text>
        </Pressable>
      </View>

      <View className="mt-6 flex-row justify-between items-center">
        <Text className="text-xl font-bold">CE Hours</Text>
        {isPro ? (
          <Pressable onPress={() => router.push(`/credential/${cred.id}/ce/new`)} className="bg-blue-600 px-3 py-1 rounded-lg">
            <Text className="text-white font-semibold">+ Log CE</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push('/paywall')}>
            <Text className="text-blue-600">Unlock CE (Pro)</Text>
          </Pressable>
        )}
      </View>
      {ces.map((c) => (
        <CeRow key={c.id} item={c} onPress={() => router.push(`/credential/${cred.id}/ce/${c.id}`)} />
      ))}
      {ces.length === 0 ? <Text className="text-gray-500 mt-2">No CE logged yet.</Text> : null}
    </ScrollView>
  );
}
