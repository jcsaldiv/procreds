import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getCe, updateCe, deleteCe } from '@/db/ce';
import { FormField } from '@/components/FormField';
import { DateField } from '@/components/DateField';

export default function EditCe() {
  const { ceId } = useLocalSearchParams<{ ceId: string }>();
  const router = useRouter();
  const [course, setCourse] = useState('');
  const [org, setOrg] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [hours, setHours] = useState('');
  const [category, setCategory] = useState('');
  const [certNum, setCertNum] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!ceId) return;
    const c = getCe(ceId);
    if (!c) return;
    setCourse(c.course_name);
    setOrg(c.organization ?? '');
    setDate(c.date_completed);
    setHours(String(c.hours_earned));
    setCategory(c.category ?? '');
    setCertNum(c.certificate_number ?? '');
    setNotes(c.notes ?? '');
  }, [ceId]);

  const save = () => {
    if (!ceId) return;
    const h = parseFloat(hours);
    if (!course.trim() || !date || isNaN(h)) return Alert.alert('Invalid input');
    updateCe(ceId, {
      course_name: course.trim(), organization: org || null, date_completed: date,
      hours_earned: h, category: category || null, certificate_number: certNum || null, notes: notes || null,
    });
    router.back();
  };

  const onDelete = () => {
    Alert.alert('Delete CE entry?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { if (ceId) deleteCe(ceId); router.back(); } },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">Edit CE</Text>
      <FormField label="Course Name *" value={course} onChangeText={setCourse} />
      <FormField label="Organization" value={org} onChangeText={setOrg} />
      <DateField label="Date Completed *" value={date} onChange={setDate} />
      <FormField label="Hours *" value={hours} onChangeText={setHours} keyboardType="numeric" />
      <FormField label="Category" value={category} onChangeText={setCategory} />
      <FormField label="Certificate #" value={certNum} onChangeText={setCertNum} />
      <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />
      <Pressable onPress={save} className="bg-blue-600 py-3 rounded-lg items-center mt-2">
        <Text className="text-white font-semibold">Save</Text>
      </Pressable>
      <Pressable onPress={onDelete} className="bg-red-600 py-3 rounded-lg items-center mt-2">
        <Text className="text-white font-semibold">Delete</Text>
      </Pressable>
    </ScrollView>
  );
}
