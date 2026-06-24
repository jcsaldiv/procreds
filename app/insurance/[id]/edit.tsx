import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { useTabletStyle } from '@/hooks/useIsTablet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { getInsurance, updateInsurance } from '@/db/insurance';
import { FormField } from '@/components/FormField';
import { DateField } from '@/components/DateField';
import { ScanButton } from '@/components/ScanButton';
import { rescheduleForInsurance } from '@/notifications/scheduler';
import { usePro } from '@/purchases/usePro';
import type { InsuranceScanResult } from '@/lib/ai-scan';

const INSURANCE_TYPES = ['Malpractice', 'General Liability', 'Health/Benefits', 'Other'];

export default function EditInsurance() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tabletStyle = useTabletStyle();
  const isPro = usePro();

  const [insuranceType, setInsuranceType] = useState('');
  const [carrier, setCarrier] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [coverageLimit, setCoverageLimit] = useState('');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [notes, setNotes] = useState('');
  const [existingDocUri, setExistingDocUri] = useState<string | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const p = getInsurance(id);
    if (!p) return;
    setInsuranceType(p.insurance_type);
    setCarrier(p.carrier ?? '');
    setPolicyNumber(p.policy_number ?? '');
    setEffectiveDate(p.effective_date);
    setExpirationDate(p.expiration_date);
    setCoverageLimit(p.coverage_limit ?? '');
    setPremiumAmount(p.premium_amount ?? '');
    setAutoRenew(p.auto_renew);
    setNotes(p.notes ?? '');
    setExistingDocUri(p.document_uri);
  }, [id]);

  const applyScannedFields = (result: InsuranceScanResult, imageUri: string) => {
    if (result.insuranceType) setInsuranceType(result.insuranceType);
    if (result.carrier) setCarrier(result.carrier);
    if (result.policyNumber) setPolicyNumber(result.policyNumber);
    if (result.effectiveDate) setEffectiveDate(result.effectiveDate);
    if (result.expirationDate) setExpirationDate(result.expirationDate);
    if (result.coverageLimit) setCoverageLimit(result.coverageLimit);
    if (result.premiumAmount) setPremiumAmount(result.premiumAmount);
    setPendingImageUri(imageUri);
  };

  const save = async () => {
    if (!id) return;
    if (!insuranceType) return Alert.alert('Insurance type is required');

    let newDocUri = existingDocUri;

    if (pendingImageUri) {
      await new Promise<void>((resolve) => {
        Alert.alert(
          'Attach document?',
          'Replace the document with the newly scanned image?',
          [
            {
              text: 'Yes',
              onPress: async () => {
                try {
                  const dir = `${FileSystem.documentDirectory}insurance/${id}/`;
                  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
                  const dest = `${dir}doc.jpg`;
                  await FileSystem.copyAsync({ from: pendingImageUri, to: dest });
                  newDocUri = dest;
                } catch {}
                resolve();
              },
            },
            { text: 'No', onPress: () => resolve() },
          ]
        );
      });
    }

    const updated = updateInsurance(id, {
      insurance_type: insuranceType,
      carrier: carrier || null,
      policy_number: policyNumber || null,
      effective_date: effectiveDate,
      expiration_date: expirationDate,
      coverage_limit: coverageLimit || null,
      premium_amount: premiumAmount || null,
      auto_renew: autoRenew,
      notes: notes || null,
      document_uri: newDocUri,
    });

    if (updated) await rescheduleForInsurance(updated, isPro);
    router.back();
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-slate-900 p-4">
      <View style={tabletStyle}>
      <Header title="Edit Insurance Policy" onBack={() => router.back()} className="mb-4" />

      <ScanButton
        type="insurance"
        onResult={(result, uri) => applyScannedFields(result as InsuranceScanResult, uri)}
      />

      <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Insurance Type *</Text>
      <View className="border border-slate-300 dark:border-slate-600 rounded-lg mb-3 overflow-hidden">
        {INSURANCE_TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setInsuranceType(t)}
            className={`p-3 border-b border-slate-100 dark:border-slate-700 ${insuranceType === t ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
          >
            <Text className={insuranceType === t ? 'text-blue-600 font-semibold' : 'text-slate-800 dark:text-slate-100'}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <FormField label="Carrier / Insurer" value={carrier} onChangeText={setCarrier} />
      <FormField label="Policy Number" value={policyNumber} onChangeText={setPolicyNumber} />
      <DateField label="Effective Date" value={effectiveDate} onChange={setEffectiveDate} />
      <DateField label="Expiration Date" value={expirationDate} onChange={setExpirationDate} />
      <FormField label="Coverage Limit" value={coverageLimit} onChangeText={setCoverageLimit} keyboardType="numeric" />
      <FormField label="Annual Premium" value={premiumAmount} onChangeText={setPremiumAmount} keyboardType="numeric" />

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto Renew</Text>
        <Switch value={autoRenew} onValueChange={setAutoRenew} />
      </View>

      <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />

      {existingDocUri && !pendingImageUri ? (
        <View className="flex-row items-center gap-1 mb-2">
          <Ionicons name="attach-outline" size={14} color="#64748b" />
          <Text className="text-xs text-slate-500 dark:text-slate-400">Document attached</Text>
        </View>
      ) : null}
      {pendingImageUri ? (
        <View className="flex-row items-center gap-1 mb-2">
          <Ionicons name="attach-outline" size={14} color="#2563eb" />
          <Text className="text-xs text-blue-600">New document scanned — will prompt to attach on save</Text>
        </View>
      ) : null}

      <Button onPress={save} label="Save" className="mt-2" />
      </View>
    </ScrollView>
  );
}
