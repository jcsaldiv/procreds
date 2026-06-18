import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { getInsurance, deleteInsurance, type InsurancePolicy } from '@/db/insurance';
import { cancelForInsurance } from '@/notifications/scheduler';
import { calculateStatus } from '@/domain/status';
import { StatusBadge } from '@/components/StatusBadge';
import { getSetting } from '@/db/settings';
import { authenticate } from '@/lib/biometrics';

export default function InsuranceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [policy, setPolicy] = useState<InsurancePolicy | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (id) setPolicy(getInsurance(id));
    }, [id])
  );

  if (!policy) return null;

  const status = calculateStatus(policy.expiration_date);

  const onDelete = async () => {
    const bioEnabled = getSetting('biometrics_enabled') === 'true';
    if (bioEnabled) {
      const ok = await authenticate('Confirm delete insurance policy');
      if (!ok) {
        Alert.alert('Authentication required');
        return;
      }
    }
    Alert.alert('Delete policy?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await cancelForInsurance(policy.id);
          if (policy.document_uri) {
            try { await FileSystem.deleteAsync(policy.document_uri, { idempotent: true }); } catch {}
          }
          deleteInsurance(policy.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-2xl font-bold flex-1 pr-2">{policy.insurance_type}</Text>
        <StatusBadge status={status} />
      </View>

      {policy.carrier ? <Text className="text-gray-600">{policy.carrier}</Text> : null}
      {policy.policy_number ? <Text className="text-gray-500 mt-1">Policy #{policy.policy_number}</Text> : null}
      {policy.effective_date ? <Text className="text-gray-700 mt-2">Effective: {policy.effective_date}</Text> : null}
      {policy.expiration_date ? <Text className="text-gray-700">Expires: {policy.expiration_date}</Text> : null}
      {policy.coverage_limit ? <Text className="text-gray-700 mt-1">Coverage: ${policy.coverage_limit}</Text> : null}
      {policy.premium_amount ? <Text className="text-gray-700">Premium: ${policy.premium_amount}/yr</Text> : null}
      {policy.auto_renew ? <Text className="text-green-600 mt-1">Auto-renew: On</Text> : null}
      {policy.notes ? <Text className="text-gray-700 mt-3">{policy.notes}</Text> : null}

      {policy.document_uri ? (
        <Pressable onPress={() => Linking.openURL(policy.document_uri!)} className="mt-3">
          <Text className="text-blue-600">📄 View Document</Text>
        </Pressable>
      ) : null}

      <View className="flex-row gap-3 mt-6">
        <Pressable
          onPress={() => router.push(`/insurance/${policy.id}/edit`)}
          className="flex-1 bg-gray-200 py-2 rounded-lg items-center"
        >
          <Text className="font-semibold">Edit</Text>
        </Pressable>
        <Pressable onPress={onDelete} className="flex-1 bg-red-600 py-2 rounded-lg items-center">
          <Text className="text-white font-semibold">Delete</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
