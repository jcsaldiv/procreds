import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { useRouter } from 'expo-router';
import { getLifetimePackage, purchasePackageAndCheck, restoreAndCheck } from '@/purchases/revenuecat';

const FEATURES = [
  'Unlimited credentials across 3 profiles',
  'CE hour tracking & logging',
  'Insurance policy tracking',
  '90 / 60 / 30 / 7-day renewal reminders',
  'PDF export to share with employers',
  'AI document scanning',
];

export default function Paywall() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pkg, setPkg] = useState<any>(null);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    getLifetimePackage()
      .then(setPkg)
      .catch(() => setPkg(null))
      .finally(() => setLoading(false));
  }, []);

  const buy = async () => {
    if (!pkg) return;
    setBuying(true);
    try {
      const ok = await purchasePackageAndCheck(pkg);
      if (ok) {
        Alert.alert('Welcome to Pro!', 'All features are now unlocked.');
        router.back();
      }
    } catch (e: any) {
      if (!e?.userCancelled) Alert.alert('Purchase failed', String(e?.message ?? e));
    } finally {
      setBuying(false);
    }
  };

  const restore = async () => {
    const ok = await restoreAndCheck();
    Alert.alert(ok ? 'Pro restored!' : 'No purchase found', ok ? 'All features are unlocked.' : 'No previous purchase was found for this Apple ID.');
    if (ok) router.back();
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-slate-900" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View className="bg-blue-600 px-6 pt-12 pb-8">
        <Text className="text-4xl font-bold text-white">ProCreds Pro</Text>
        <Text className="text-blue-100 mt-2 text-base">One payment. Yours forever.</Text>
      </View>

      {/* Features */}
      <View className="px-6 pt-6 pb-4">
        <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-4">Everything in Pro</Text>
        {FEATURES.map((f) => (
          <View key={f} className="flex-row items-start mb-3">
            <Ionicons name="checkmark-circle" size={18} color="#2563eb" style={{ marginRight: 12, marginTop: 2 }} />
            <Text className="text-slate-800 dark:text-slate-200 text-base flex-1">{f}</Text>
          </View>
        ))}
      </View>

      {/* Price & CTA */}
      <View className="mx-6 mt-2 rounded-2xl border border-blue-600 bg-blue-50 dark:bg-blue-950 p-5">
        {loading ? (
          <ActivityIndicator color="#2563eb" />
        ) : pkg ? (
          <>
            <View className="flex-row items-baseline gap-2 mb-1">
              <Text className="text-4xl font-bold text-blue-600">{pkg.product.priceString}</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm">one-time</Text>
            </View>
            <Text className="text-slate-500 dark:text-slate-400 text-xs mb-4">No subscription. No renewals. Pay once, use forever.</Text>
            <Button onPress={buy} label="Get Lifetime Access" loading={buying} disabled={buying} />
          </>
        ) : (
          <Text className="text-slate-500 dark:text-slate-400 text-sm text-center">Pricing unavailable. Try again later.</Text>
        )}
      </View>

      <Pressable onPress={restore} className="mt-5 items-center">
        <Text className="text-blue-600 text-sm">Restore Purchase</Text>
      </Pressable>
      <Pressable onPress={() => router.back()} className="mt-3 items-center">
        <Text className="text-slate-400 dark:text-slate-500 text-sm">Maybe later</Text>
      </Pressable>
    </ScrollView>
  );
}
