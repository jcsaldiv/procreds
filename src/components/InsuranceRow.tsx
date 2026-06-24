import { Pressable, Text, View } from 'react-native';
import { calculateStatus } from '@/domain/status';
import { StatusBadge } from './StatusBadge';

export function InsuranceRow(props: {
  id: string;
  insuranceType: string;
  carrier: string | null;
  expirationDate: string | null;
  onPress: (id: string) => void;
}) {
  const status = calculateStatus(props.expirationDate);
  return (
    <Pressable
      onPress={() => props.onPress(props.id)}
      className="flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
    >
      <View className="flex-1">
        <Text className="text-base font-semibold text-slate-900 dark:text-white">{props.insuranceType}</Text>
        {props.carrier ? (
          <Text className="text-xs text-slate-500 dark:text-slate-400">{props.carrier}</Text>
        ) : null}
        <Text className="text-xs text-slate-400 dark:text-slate-500">
          {props.expirationDate ? `Expires ${props.expirationDate}` : 'No expiration'}
        </Text>
      </View>
      <StatusBadge status={status} />
    </Pressable>
  );
}
