import { Pressable, Text, View } from 'react-native';
import type { CeCourse } from '../db/ce';

export function CeRow({ item, onPress }: { item: CeCourse; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="p-3 border-b border-gray-200 flex-row justify-between">
      <View className="flex-1">
        <Text className="font-semibold">{item.course_name}</Text>
        <Text className="text-xs text-gray-500">
          {item.organization ?? '—'} · {item.date_completed}
        </Text>
      </View>
      <Text className="font-semibold text-blue-600">{item.hours_earned} hr</Text>
    </Pressable>
  );
}
