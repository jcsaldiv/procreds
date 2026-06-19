import { Pressable, Text, View } from 'react-native';
import { calculateStatus } from '../domain/status';
import { StatusBadge } from './StatusBadge';

export function CredentialRow(props: {
  id: string; name: string; expirationDate: string | null; onPress: (id: string) => void;
}) {
  const status = calculateStatus(props.expirationDate);
  return (
    <Pressable onPress={() => props.onPress(props.id)} className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900 dark:text-white">{props.name}</Text>
        <Text className="text-xs text-gray-500 dark:text-slate-400">
          {props.expirationDate ? `Expires ${props.expirationDate}` : 'No expiration'}
        </Text>
      </View>
      <StatusBadge status={status} />
    </Pressable>
  );
}
