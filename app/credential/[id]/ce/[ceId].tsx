import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { useTabletStyle } from '@/hooks/useIsTablet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getCe, updateCe, deleteCe } from '@/db/ce';
import { FormField } from '@/components/FormField';
import { DateField } from '@/components/DateField';

export default function EditCe() {
  const { ceId } = useLocalSearchParams<{ ceId: string }>();
  const router = useRouter();
  const tabletStyle = useTabletStyle();
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
    <ScrollView className="flex-1 bg-white dark:bg-slate-900 p-4" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={tabletStyle}>
      <Header title="Edit CE" onBack={() => router.back()} className="mb-4" />
      <FormField label="Course Name *" value={course} onChangeText={setCourse} />
      <FormField label="Organization" value={org} onChangeText={setOrg} />
      <DateField label="Date Completed *" value={date} onChange={setDate} />
      <FormField label="Hours *" value={hours} onChangeText={setHours} keyboardType="numeric" />
      <FormField label="Category" value={category} onChangeText={setCategory} />
      <FormField label="Certificate #" value={certNum} onChangeText={setCertNum} />
      <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />
      <Button onPress={save} label="Save" className="mt-2" />
      <Button onPress={onDelete} label="Delete" variant="destructive" className="mt-2" />
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
