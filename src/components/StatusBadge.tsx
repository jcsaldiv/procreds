import { Text, View } from 'react-native';
import type { CredentialStatus } from '../domain/status';
import { STATUS_COLORS, STATUS_LABELS } from '../constants/colors';

export function StatusBadge({ status }: { status: CredentialStatus }) {
  return (
    <View style={{ backgroundColor: STATUS_COLORS[status] }} className="px-2 py-1 rounded-full">
      <Text className="text-white text-xs font-semibold">{STATUS_LABELS[status]}</Text>
    </View>
  );
}
