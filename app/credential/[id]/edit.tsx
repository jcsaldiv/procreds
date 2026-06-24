import { useEffect, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { useTabletStyle } from '@/hooks/useIsTablet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getCredential, updateCredential } from '@/db/credentials';
import { FormField } from '@/components/FormField';
import { DateField } from '@/components/DateField';
import { rescheduleForCredential } from '@/notifications/scheduler';
import { usePro } from '@/purchases/usePro';

export default function EditCredential() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isPro = usePro();
  const tabletStyle = useTabletStyle();
  const [name, setName] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [credNum, setCredNum] = useState('');
  const [issueDate, setIssueDate] = useState<string | null>(null);
  const [expDate, setExpDate] = useState<string | null>(null);
  const [renewalUrl, setRenewalUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!id) return;
    const c = getCredential(id);
    if (!c) return;
    setName(c.name);
    setIssuingBody(c.issuing_body ?? '');
    setCredNum(c.credential_number ?? '');
    setIssueDate(c.issue_date);
    setExpDate(c.expiration_date);
    setRenewalUrl(c.renewal_url ?? '');
    setNotes(c.notes ?? '');
  }, [id]);

  const save = async () => {
    if (!id) return;
    if (!name.trim()) return Alert.alert('Name is required');
    const updated = updateCredential(id, {
      name: name.trim(),
      issuing_body: issuingBody || null,
      credential_number: credNum || null,
      issue_date: issueDate,
      expiration_date: expDate,
      renewal_url: renewalUrl || null,
      notes: notes || null,
    });
    if (updated) await rescheduleForCredential(updated, isPro);
    router.back();
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-slate-900 p-4" contentContainerStyle={{ paddingBottom: 380 }}>
      <View style={tabletStyle}>
      <Header title="Edit Credential" onBack={() => router.back()} className="mb-4" />
      <FormField label="Name *" value={name} onChangeText={setName} />
      <FormField label="Issuing Body" value={issuingBody} onChangeText={setIssuingBody} />
      <FormField label="Credential Number" value={credNum} onChangeText={setCredNum} />
      <DateField label="Issue Date" value={issueDate} onChange={setIssueDate} />
      <DateField label="Expiration Date" value={expDate} onChange={setExpDate} />
      <FormField label="Renewal URL" value={renewalUrl} onChangeText={setRenewalUrl} keyboardType="url" />
      <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />
      <Button onPress={save} label="Save" className="mt-2" />
      </View>
    </ScrollView>
  );
}
