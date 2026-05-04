import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useActiveProfile } from '@/state/activeProfile';
import { listCredentialsForProfile, type Credential } from '@/db/credentials';
import { CredentialRow } from '@/components/CredentialRow';
import { EmptyState } from '@/components/EmptyState';
import { usePro } from '@/purchases/usePro';

export default function CredentialsList() {
  const router = useRouter();
  const isPro = usePro();
  const { activeProfileId } = useActiveProfile();
  const [rows, setRows] = useState<Credential[]>([]);
  const refresh = useCallback(() => {
    if (activeProfileId) setRows(listCredentialsForProfile(activeProfileId));
  }, [activeProfileId]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row justify-between items-center p-4">
        <Text className="text-2xl font-bold">Credentials</Text>
        <View className="flex-row gap-2">
          {isPro && (
            <Pressable
              onPress={() => router.push('/export')}
              className="border border-blue-600 px-3 py-2 rounded-lg"
            >
              <Text className="text-blue-600 font-semibold">Export</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => router.push('/credential/new')}
            className="bg-blue-600 px-4 py-2 rounded-lg"
          >
            <Text className="text-white font-semibold">+ Add</Text>
          </Pressable>
        </View>
      </View>
      {rows.length === 0 ? (
        <EmptyState
          title="No credentials yet"
          body="Tap + Add to track your first license or certification."
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <CredentialRow
              id={item.id}
              name={item.name}
              expirationDate={item.expiration_date}
              onPress={(id) => router.push(`/credential/${id}`)}
            />
          )}
        />
      )}
    </View>
  );
}
