import { Text, TextInput, View, useColorScheme } from 'react-native';
export function FormField(props: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: 'default' | 'url' | 'numeric';
}) {
  const isDark = useColorScheme() === 'dark';
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{props.label}</Text>
      <TextInput
        className="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-base text-gray-900 dark:text-white bg-white dark:bg-slate-800"
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={isDark ? '#64748b' : '#9ca3af'}
        multiline={props.multiline}
        keyboardType={props.keyboardType ?? 'default'}
        autoCapitalize="none"
      />
    </View>
  );
}
