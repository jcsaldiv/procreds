import { Text, TextInput, View } from 'react-native';
export function FormField(props: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: 'default' | 'url' | 'numeric';
}) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1">{props.label}</Text>
      <TextInput
        className="border border-gray-300 rounded-lg px-3 py-2 text-base"
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        multiline={props.multiline}
        keyboardType={props.keyboardType ?? 'default'}
        autoCapitalize="none"
      />
    </View>
  );
}
