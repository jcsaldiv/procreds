import { Pressable, Text } from 'react-native';
export function SummaryCard({
  label, value, color, onPress,
}: {
  label: string; value: number; color: string; onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 m-2 p-5 rounded-2xl active:opacity-70"
      style={{ backgroundColor: color + '22' }}
    >
      <Text className="text-5xl font-bold" style={{ color }}>{value}</Text>
      <Text className="text-sm font-medium text-gray-700 mt-2">{label}</Text>
    </Pressable>
  );
}
