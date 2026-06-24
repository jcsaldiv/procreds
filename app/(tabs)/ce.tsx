import { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useIsTablet, useTabletStyle } from '@/hooks/useIsTablet';
import { Button } from '@/components/Button';
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
  const tabletStyle = useTabletStyle();
  useFocusEffect(useCallback(() => {
    if (activeProfileId) setRows(listCeForProfile(activeProfileId));
  }, [activeProfileId]));

  if (!isPro) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-white dark:bg-slate-900">
        <Text className="text-xl font-bold mb-2 text-slate-900 dark:text-white">CE tracking is a Pro feature</Text>
        <Button onPress={() => router.push('/paywall')} label="Upgrade to Pro" size="md" className="mt-4" />
      </View>
    );
  }

  const total = sumCeHours(rows);
  return (
    <View className="flex-1 bg-white dark:bg-slate-900 items-center">
      <View className="flex-1 w-full" style={tabletStyle}>
      <View className="p-4">
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">CE Hours</Text>
        <Text className="text-slate-600 dark:text-slate-400 mt-1">Total: {total} hrs</Text>
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
    </View>
  );
}
