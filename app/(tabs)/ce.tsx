import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useActiveProfile } from '@/state/activeProfile';
import { listCeForProfile, type CeCourse } from '@/db/ce';
import { sumCeHours } from '@/domain/ce-summary';
import { CeRow } from '@/components/CeRow';
import { EmptyState } from '@/components/EmptyState';
import { usePro } from '@/purchases/usePro';

export default function CeTab() {
  const router = useRouter();
  const isPro = usePro();
  const { activeProfileId } = useActiveProfile();
  const [rows, setRows] = useState<CeCourse[]>([]);
  useFocusEffect(useCallback(() => {
    if (activeProfileId) setRows(listCeForProfile(activeProfileId));
  }, [activeProfileId]));

  if (!isPro) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-white">
        <Text className="text-xl font-bold mb-2">CE tracking is a Pro feature</Text>
        <Pressable onPress={() => router.push('/paywall')} className="bg-blue-600 px-4 py-2 rounded-lg mt-4">
          <Text className="text-white font-semibold">Upgrade to Pro</Text>
        </Pressable>
      </View>
    );
  }

  const total = sumCeHours(rows);
  return (
    <View className="flex-1 bg-white">
      <View className="p-4">
        <Text className="text-2xl font-bold">CE Hours</Text>
        <Text className="text-gray-600 mt-1">Total: {total} hrs</Text>
      </View>
      {rows.length === 0 ? (
        <EmptyState title="No CE logged yet" body="Open a credential and tap + Log CE." />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <CeRow item={item} onPress={() => item.credential_id && router.push(`/credential/${item.credential_id}/ce/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}
