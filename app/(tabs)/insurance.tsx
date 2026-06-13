import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useActiveProfile } from '@/state/activeProfile';
import { listInsuranceForProfile, type InsurancePolicy } from '@/db/insurance';
import { InsuranceRow } from '@/components/InsuranceRow';
import { EmptyState } from '@/components/EmptyState';
import { usePro } from '@/purchases/usePro';

export default function InsuranceTab() {
  const router = useRouter();
  const isPro = usePro();
  const { activeProfileId } = useActiveProfile();
  const [rows, setRows] = useState<InsurancePolicy[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (activeProfileId) setRows(listInsuranceForProfile(activeProfileId));
    }, [activeProfileId])
  );

  useEffect(() => {
    if (activeProfileId) setRows(listInsuranceForProfile(activeProfileId));
  }, [activeProfileId]);

  const renderItem = useCallback(
    ({ item }: { item: InsurancePolicy }) => (
      <InsuranceRow
        id={item.id}
        insuranceType={item.insurance_type}
        carrier={item.carrier}
        expirationDate={item.expiration_date}
        onPress={(id) => router.push(`/insurance/${id}`)}
      />
    ),
    [router],
  );

  if (!isPro) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-white">
        <Text className="text-xl font-bold mb-2">Insurance tracking is a Pro feature</Text>
        <Pressable
          onPress={() => router.push('/paywall')}
          className="bg-blue-600 px-4 py-2 rounded-lg mt-4"
        >
          <Text className="text-white font-semibold">Upgrade to Pro</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row justify-between items-center p-4">
        <Text className="text-2xl font-bold">Insurance</Text>
        <Pressable
          onPress={() => router.push('/insurance/new')}
          className="bg-blue-600 px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-semibold">+ Add</Text>
        </Pressable>
      </View>
      {rows.length === 0 ? (
        <EmptyState
          title="No insurance policies yet"
          body="Tap + Add to track your first policy."
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}
