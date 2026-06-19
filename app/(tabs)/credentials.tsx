import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { useActiveProfile } from '@/state/activeProfile';
import { listCredentialsForProfile, type Credential } from '@/db/credentials';
import { calculateStatus } from '@/domain/status';
import { CredentialRow } from '@/components/CredentialRow';
import { EmptyState } from '@/components/EmptyState';
import { usePro } from '@/purchases/usePro';

const FILTER_LABELS: Record<string, string> = {
  'expiring-soon': 'Expiring Soon',
  'expiring': 'Expiring',
  'expired': 'Expired',
};

export default function CredentialsList() {
  const router = useRouter();
  const isPro = usePro();
  const { activeProfileId } = useActiveProfile();
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [rows, setRows] = useState<Credential[]>([]);

  const refresh = useCallback(() => {
    if (activeProfileId) setRows(listCredentialsForProfile(activeProfileId));
  }, [activeProfileId]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filtered = filter
    ? rows.filter((r) => {
        const s = calculateStatus(r.expiration_date);
        if (filter === 'expiring') return s === 'expiring' || s === 'expiring-soon';
        return s === filter;
      })
    : rows;

  return (
    <View className="flex-1 bg-white dark:bg-slate-900">
      <View className="flex-row justify-between items-center p-4">
        <View>
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">Credentials</Text>
          {filter ? (
            <Pressable onPress={() => router.setParams({ filter: '' })} className="flex-row items-center mt-0.5">
              <Text className="text-xs text-blue-600">
                {FILTER_LABELS[filter] ?? filter} ✕ clear filter
              </Text>
            </Pressable>
          ) : null}
        </View>
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
      {filtered.length === 0 ? (
        <EmptyState
          title={filter ? `No ${FILTER_LABELS[filter] ?? filter} credentials` : 'No credentials yet'}
          body={filter ? 'Try clearing the filter.' : 'Tap + Add to track your first license or certification.'}
        />
      ) : (
        <FlatList
          data={filtered}
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
