import { useState } from 'react';
import { Platform, Pressable, Text, View, useColorScheme } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { toISODate, fromISO } from '../lib/dates';

const displayDate = (iso: string) => format(fromISO(iso), 'MM-dd-yyyy');

export function DateField(props: { label: string; value: string | null; onChange: (iso: string | null) => void }) {
  const [show, setShow] = useState(false);
  const isDark = useColorScheme() === 'dark';
  const date = props.value ? fromISO(props.value) : new Date();
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{props.label}</Text>
      <Pressable onPress={() => setShow(true)} className="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-3 bg-white dark:bg-slate-800">
        <Text className="text-base text-gray-900 dark:text-white">{props.value ? displayDate(props.value) : 'Tap to select'}</Text>
      </Pressable>
      {props.value ? (
        <Pressable onPress={() => props.onChange(null)} className="mt-1">
          <Text className="text-xs text-blue-600">Clear date</Text>
        </Pressable>
      ) : null}
      {show && (
        <>
          {Platform.OS === 'ios' && (
            <Pressable onPress={() => setShow(false)} className="items-end mt-1 mb-1">
              <Text className="text-blue-600 font-semibold text-sm">Done</Text>
            </Pressable>
          )}
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            themeVariant={isDark ? 'dark' : 'light'}
            onChange={(_, d) => {
              if (Platform.OS !== 'ios') setShow(false);
              if (d) props.onChange(toISODate(d));
            }}
          />
        </>
      )}
    </View>
  );
}
