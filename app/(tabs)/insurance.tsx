import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { useActiveProfile } from '@/state/activeProfile';
import { listInsuranceForProfile, type InsurancePolicy } from '@/db/insurance';
import { calculateStatus } from '@/domain/status';
import { InsuranceRow } from '@/components/InsuranceRow';
import { EmptyState } from '@/components/EmptyState';
import { usePro } from '@/purchases/usePro';

export default function InsuranceTab() {
  const router = useRouter();
  const isPro = usePro();
  const { activeProfileId } = useActiveProfile();
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [rows, setRows] = useState<InsurancePolicy[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (activeProfileId) setRows(listInsuranceForProfile(activeProfileId));
    }, [activeProfileId])
  );

  useEffect(() => {
    if (activeProfileId) setRows(listInsuranceForProfile(activeProfileId));
  }, [activeProfileId]);

  const filtered = filter
    ? rows.filter((r) => {
        const s = calculateStatus(r.expiration_date);
        if (filter === 'active') return s === 'active' || s === 'no-expiration';
        if (filter === 'expiring') return s === 'expiring-soon' || s === 'expiring';
        return true;
      })
    : rows;

  if (!isPro) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-white dark:bg-slate-900">
        <Text className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Insurance tracking is a Pro feature</Text>
        <Button onPress={() => router.push('/paywall')} label="Upgrade to Pro" size="md" className="mt-4" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-slate-900">
      <View className="flex-row justify-between items-center p-4">
        <View>
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">Insurance</Text>
          {filter ? (
            <Pressable onPress={() => router.setParams({ filter: '' })} hitSlop={12} className="mt-0.5 py-1">
              <Text className="text-xs text-blue-600 capitalize">{filter} ✕ clear filter</Text>
            </Pressable>
          ) : null}
        </View>
        <Button onPress={() => router.push('/insurance/new')} label="+ Add" size="md" />
      </View>
      {filtered.length === 0 ? (
        <EmptyState
          title={filter ? `No ${filter} policies` : 'No insurance policies yet'}
          body={filter ? 'Try clearing the filter.' : 'Tap + Add to track your first policy.'}
        />
      ) : (
        <FlatList data={filtered} keyExtractor={(r) => r.id} renderItem={({ item }) => (
          <InsuranceRow
            id={item.id}
            insuranceType={item.insurance_type}
            carrier={item.carrier}
            expirationDate={item.expiration_date}
            onPress={(id) => router.push(`/insurance/${id}`)}
          />
        )} />
      )}
    </View>
  );
}
