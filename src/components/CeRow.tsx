import { Pressable, Text, View } from 'react-native';
import type { CeCourse } from '../db/ce';
export function CeRow({ item, onPress }: { item: CeCourse; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="p-4 border-b border-gray-200">
      <Text className="font-semibold">{item.course_name}</Text>
      <Text className="text-sm text-gray-500">{item.hours_earned}h · {item.date_completed}</Text>
    </Pressable>
  );
}
