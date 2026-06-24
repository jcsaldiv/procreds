import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
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
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (id) setPolicy(getInsurance(id));
      setLoading(false);
    }, [id])
  );

  if (loading) return <LoadingState />;
  if (!policy) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-900">
        <View className="p-4">
          <Header title="Policy not found" onBack={() => router.back()} />
        </View>
        <EmptyState body="It may have been deleted." />
      </View>
    );
  }

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
    <ScrollView className="flex-1 bg-white dark:bg-slate-900 p-4">
      <Header title={policy.insurance_type} onBack={() => router.back()} right={<StatusBadge status={status} />} className="mb-2" />

      {policy.carrier ? <Text className="text-slate-600 dark:text-slate-400">{policy.carrier}</Text> : null}
      {policy.policy_number ? <Text className="text-slate-500 dark:text-slate-400 mt-1">Policy #{policy.policy_number}</Text> : null}
      {policy.effective_date ? <Text className="text-slate-700 dark:text-slate-300 mt-2">Effective: {policy.effective_date}</Text> : null}
      {policy.expiration_date ? <Text className="text-slate-700 dark:text-slate-300">Expires: {policy.expiration_date}</Text> : null}
      {policy.coverage_limit ? <Text className="text-slate-700 dark:text-slate-300 mt-1">Coverage: ${policy.coverage_limit}</Text> : null}
      {policy.premium_amount ? <Text className="text-slate-700 dark:text-slate-300">Premium: ${policy.premium_amount}/yr</Text> : null}
      {policy.auto_renew ? <Text className="text-green-600 mt-1">Auto-renew: On</Text> : null}
      {policy.notes ? <Text className="text-slate-700 dark:text-slate-300 mt-3">{policy.notes}</Text> : null}

      {policy.document_uri ? (
        <Pressable onPress={() => Linking.openURL(policy.document_uri!)} className="mt-3 flex-row items-center gap-1">
          <Ionicons name="document-outline" size={16} color="#2563eb" />
          <Text className="text-blue-600">View Document</Text>
        </Pressable>
      ) : null}

      <View className="flex-row gap-3 mt-6">
        <Button onPress={() => router.push(`/insurance/${policy.id}/edit`)} label="Edit" variant="secondary" size="md" flex />
        <Button onPress={onDelete} label="Delete" variant="destructive" size="md" flex />
      </View>
    </ScrollView>
  );
}
