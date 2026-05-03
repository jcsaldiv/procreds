import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { toISODate, fromISO } from '../lib/dates';

export function DateField(props: { label: string; value: string | null; onChange: (iso: string | null) => void }) {
  const [show, setShow] = useState(false);
  const date = props.value ? fromISO(props.value) : new Date();
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1">{props.label}</Text>
      <Pressable onPress={() => setShow(true)} className="border border-gray-300 rounded-lg px-3 py-3">
        <Text className="text-base">{props.value ?? 'Tap to select'}</Text>
      </Pressable>
      {props.value ? (
        <Pressable onPress={() => props.onChange(null)} className="mt-1">
          <Text className="text-xs text-blue-600">Clear date</Text>
        </Pressable>
      ) : null}
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_, d) => {
            setShow(Platform.OS === 'ios');
            if (d) props.onChange(toISODate(d));
          }}
        />
      )}
    </View>
  );
}
