import { Pressable, Text, View } from 'react-native';
import type { CeCourse } from '../db/ce';

export function CeRow({ item, onPress }: { item: CeCourse; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="p-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-row justify-between">
      <View className="flex-1">
        <Text className="font-semibold text-slate-900 dark:text-white">{item.course_name}</Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400">
          {item.organization ?? '—'} · {item.date_completed}
        </Text>
      </View>
      <Text className="font-semibold text-blue-600">{item.hours_earned} hr</Text>
    </Pressable>
  );
}
