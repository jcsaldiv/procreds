import { Text, View } from 'react-native';
export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="text-lg font-semibold text-gray-700">{title}</Text>
      {body ? <Text className="text-sm text-gray-500 mt-2 text-center">{body}</Text> : null}
    </View>
  );
}
