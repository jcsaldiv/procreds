import { Pressable, Text, View } from 'react-native';

type Props = {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  className?: string;
};

export function Header({ title, onBack, right, className }: Props) {
  return (
    <View className={className}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} className="mb-3 self-start">
          <Text className="text-blue-600 text-base">← Back</Text>
        </Pressable>
      ) : null}
      <View className="flex-row items-start justify-between">
        <Text className="text-2xl font-bold flex-1 pr-2 text-slate-900 dark:text-white" numberOfLines={2}>
          {title}
        </Text>
        {right ?? null}
      </View>
    </View>
  );
}
