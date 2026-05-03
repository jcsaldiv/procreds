import { Text, View } from 'react-native';
export function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View className="flex-1 m-2 p-4 rounded-xl" style={{ backgroundColor: color + '22' }}>
      <Text className="text-3xl font-bold" style={{ color }}>{value}</Text>
      <Text className="text-sm text-gray-700 mt-1">{label}</Text>
    </View>
  );
}
