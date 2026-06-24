import { ActivityIndicator, View } from 'react-native';

export function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-slate-900">
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}
