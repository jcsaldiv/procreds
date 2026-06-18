import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useActiveProfile } from '@/state/activeProfile';
import { createCredential, countCredentialsForProfile } from '@/db/credentials';
import { FormField } from '@/components/FormField';
import { DateField } from '@/components/DateField';
import { ScanButton } from '@/components/ScanButton';
import { usePro } from '@/purchases/usePro';
import { FREE_LIMITS } from '@/constants/limits';
import { scheduleForCredential } from '@/notifications/scheduler';
import type { CredentialScanResult } from '@/lib/ai-scan';

export default function NewCredential() {
  const router = useRouter();
  const { activeProfileId } = useActiveProfile();
  const isPro = usePro();
  const [name, setName] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [credNum, setCredNum] = useState('');
  const [issueDate, setIssueDate] = useState<string | null>(null);
  const [expDate, setExpDate] = useState<string | null>(null);
  const [renewalUrl, setRenewalUrl] = useState('');
  const [notes, setNotes] = useState('');

  const applyScannedFields = (result: CredentialScanResult) => {
    if (result.name) setName(result.name);
    if (result.issuingBody) setIssuingBody(result.issuingBody);
    if (result.credentialNumber) setCredNum(result.credentialNumber);
    if (result.issueDate) setIssueDate(result.issueDate);
    if (result.expirationDate) setExpDate(result.expirationDate);
    if (result.renewalUrl) setRenewalUrl(result.renewalUrl);
  };

  const save = async () => {
    if (!activeProfileId) return;
    if (!name.trim()) return Alert.alert('Name is required');
    if (!isPro && countCredentialsForProfile(activeProfileId) >= FREE_LIMITS.MAX_CREDENTIALS) {
      return router.push('/paywall');
    }
    const c = createCredential({
      profile_id: activeProfileId,
      name: name.trim(),
      issuing_body: issuingBody || null,
      credential_number: credNum || null,
      issue_date: issueDate,
      expiration_date: expDate,
      renewal_url: renewalUrl || null,
      notes: notes || null,
    });
    await scheduleForCredential(c, isPro);
    router.back();
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">New Credential</Text>
      <ScanButton
        type="credential"
        onResult={(result) => applyScannedFields(result as CredentialScanResult)}
      />
      <FormField label="Name *" value={name} onChangeText={setName} placeholder="e.g. RN License" />
      <FormField label="Issuing Body" value={issuingBody} onChangeText={setIssuingBody} />
      <FormField label="Credential Number" value={credNum} onChangeText={setCredNum} />
      <DateField label="Issue Date" value={issueDate} onChange={setIssueDate} />
      <DateField label="Expiration Date" value={expDate} onChange={setExpDate} />
      <FormField label="Renewal URL" value={renewalUrl} onChangeText={setRenewalUrl} keyboardType="url" />
      <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />
      <Pressable onPress={save} className="bg-blue-600 py-3 rounded-lg items-center mt-2">
        <Text className="text-white font-semibold text-base">Save</Text>
      </Pressable>
    </ScrollView>
  );
}
