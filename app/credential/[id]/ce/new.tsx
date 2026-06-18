import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useActiveProfile } from '@/state/activeProfile';
import { createCe } from '@/db/ce';
import { FormField } from '@/components/FormField';
import { DateField } from '@/components/DateField';
import { ScanButton } from '@/components/ScanButton';
import { usePro } from '@/purchases/usePro';
import type { CeScanResult } from '@/lib/ai-scan';

export default function NewCe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activeProfileId } = useActiveProfile();
  const isPro = usePro();
  const [course, setCourse] = useState('');
  const [org, setOrg] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [hours, setHours] = useState('');
  const [category, setCategory] = useState('');
  const [certNum, setCertNum] = useState('');
  const [notes, setNotes] = useState('');

  const applyScannedFields = (result: CeScanResult) => {
    if (result.courseName) setCourse(result.courseName);
    if (result.organization) setOrg(result.organization);
    if (result.dateCompleted) setDate(result.dateCompleted);
    if (result.hoursEarned != null) setHours(String(result.hoursEarned));
    if (result.category) setCategory(result.category);
    if (result.certificateNumber) setCertNum(result.certificateNumber);
  };

  const save = () => {
    if (!isPro) return router.replace('/paywall');
    if (!activeProfileId || !id) return;
    if (!course.trim() || !date || !hours) return Alert.alert('Course, date, and hours are required');
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0) return Alert.alert('Hours must be a positive number');
    createCe({
      profile_id: activeProfileId,
      credential_id: id,
      course_name: course.trim(),
      organization: org || null,
      date_completed: date,
      hours_earned: h,
      category: category || null,
      certificate_number: certNum || null,
      notes: notes || null,
    });
    router.back();
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">Log CE</Text>
      <ScanButton
        type="ce"
        onResult={(result) => applyScannedFields(result as CeScanResult)}
      />
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
    </ScrollView>
  );
}
