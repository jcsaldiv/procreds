import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { useActiveProfile } from '@/state/activeProfile';
import { createInsurance } from '@/db/insurance';
import { FormField } from '@/components/FormField';
import { DateField } from '@/components/DateField';
import { ScanButton } from '@/components/ScanButton';
import { scheduleForInsurance } from '@/notifications/scheduler';
import { usePro } from '@/purchases/usePro';
import type { InsuranceScanResult } from '@/lib/ai-scan';

const INSURANCE_TYPES = ['Malpractice', 'General Liability', 'Health/Benefits', 'Other'];

export default function NewInsurance() {
  const router = useRouter();
  const isPro = usePro();
  const { activeProfileId } = useActiveProfile();

  const [insuranceType, setInsuranceType] = useState('');
  const [carrier, setCarrier] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [coverageLimit, setCoverageLimit] = useState('');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [notes, setNotes] = useState('');
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

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
    if (!activeProfileId) return;
    if (!insuranceType) return Alert.alert('Insurance type is required');

    const policy = createInsurance({
      profile_id: activeProfileId,
      insurance_type: insuranceType,
      carrier: carrier || null,
      policy_number: policyNumber || null,
      effective_date: effectiveDate,
      expiration_date: expirationDate,
      coverage_limit: coverageLimit || null,
      premium_amount: premiumAmount || null,
      auto_renew: autoRenew,
      notes: notes || null,
      document_uri: null,
    });

    if (pendingImageUri) {
      await new Promise<void>((resolve) => {
        Alert.alert(
          'Attach document?',
          'Save the scanned image with this policy?',
          [
            {
              text: 'Yes',
              onPress: async () => {
                try {
                  const dir = `${FileSystem.documentDirectory}insurance/${policy.id}/`;
                  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
                  const dest = `${dir}doc.jpg`;
                  await FileSystem.copyAsync({ from: pendingImageUri, to: dest });
                  const { updateInsurance } = require('@/db/insurance');
                  updateInsurance(policy.id, { document_uri: dest });
                } catch {
                  // best-effort
                }
                resolve();
              },
            },
            { text: 'No', onPress: () => resolve() },
          ]
        );
      });
    }

    await scheduleForInsurance(policy, isPro);
    router.back();
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">New Insurance Policy</Text>

      <ScanButton
        type="insurance"
        onResult={(result, uri) => applyScannedFields(result as InsuranceScanResult, uri)}
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">Insurance Type *</Text>
      <View className="border border-gray-300 rounded-lg mb-3 overflow-hidden">
        {INSURANCE_TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setInsuranceType(t)}
            className={`p-3 border-b border-gray-100 ${insuranceType === t ? 'bg-blue-50' : ''}`}
          >
            <Text className={insuranceType === t ? 'text-blue-600 font-semibold' : 'text-gray-800'}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <FormField label="Carrier / Insurer" value={carrier} onChangeText={setCarrier} placeholder="e.g. The Doctors Company" />
      <FormField label="Policy Number" value={policyNumber} onChangeText={setPolicyNumber} />
      <DateField label="Effective Date" value={effectiveDate} onChange={setEffectiveDate} />
      <DateField label="Expiration Date" value={expirationDate} onChange={setExpirationDate} />
      <FormField label="Coverage Limit" value={coverageLimit} onChangeText={setCoverageLimit} placeholder="e.g. 1000000" keyboardType="numeric" />
      <FormField label="Annual Premium" value={premiumAmount} onChangeText={setPremiumAmount} placeholder="e.g. 1200" keyboardType="numeric" />

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-medium text-gray-700">Auto Renew</Text>
        <Switch value={autoRenew} onValueChange={setAutoRenew} />
      </View>

      <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />

      {pendingImageUri ? (
        <Text className="text-xs text-blue-600 mb-2">📎 Document scanned — will prompt to attach on save</Text>
      ) : null}

      <Pressable onPress={save} className="bg-blue-600 py-3 rounded-lg items-center mt-2">
        <Text className="text-white font-semibold text-base">Save Policy</Text>
      </Pressable>
    </ScrollView>
  );
}
