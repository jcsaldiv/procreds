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
      className="flex-row items-center justify-between p-4 border-b border-gray-200"
    >
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900">{props.insuranceType}</Text>
        {props.carrier ? (
          <Text className="text-xs text-gray-500">{props.carrier}</Text>
        ) : null}
        <Text className="text-xs text-gray-400">
          {props.expirationDate ? `Expires ${props.expirationDate}` : 'No expiration'}
        </Text>
      </View>
      <StatusBadge status={status} />
    </Pressable>
  );
}
