import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getOfferings, purchasePackageAndCheck, restoreAndCheck } from '@/purchases/revenuecat';

export default function Paywall() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);

  useEffect(() => {
    getOfferings()
      .then((o) => setPackages(o?.current?.availablePackages ?? []))
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, []);

  const buy = async (pkg: any) => {
    try {
      const ok = await purchasePackageAndCheck(pkg);
      if (ok) { Alert.alert('Welcome to Pro!'); router.back(); }
    } catch (e: any) {
      if (!e?.userCancelled) Alert.alert('Purchase failed', String(e?.message ?? e));
    }
  };

  const restore = async () => {
    const ok = await restoreAndCheck();
    Alert.alert(ok ? 'Pro restored' : 'No active purchases found');
    if (ok) router.back();
  };

  return (
    <ScrollView className="flex-1 bg-white p-6">
      <Text className="text-3xl font-bold mb-2">Upgrade to Pro</Text>
      <Text className="text-gray-600 mb-6">Unlimited credentials, 3 profiles, full CE tracking, and 90/60/30/7-day reminders.</Text>

      {loading ? <ActivityIndicator /> : null}
      {!loading && packages.length === 0 ? (
        <Text className="text-gray-500">Pricing is currently unavailable. Try again later.</Text>
      ) : null}

      {packages.map((pkg) => (
        <Pressable
          key={pkg.identifier}
          onPress={() => buy(pkg)}
          className="border border-blue-600 rounded-xl p-4 mb-3"
        >
          <Text className="text-base font-semibold">{pkg.product.title ?? pkg.product.identifier}</Text>
          <Text className="text-sm text-gray-600">{pkg.product.description}</Text>
          <Text className="text-lg font-bold text-blue-600 mt-2">{pkg.product.priceString}</Text>
        </Pressable>
      ))}

      <Pressable onPress={restore} className="mt-4 items-center">
        <Text className="text-blue-600">Restore Purchases</Text>
      </Pressable>
      <Pressable onPress={() => router.back()} className="mt-2 items-center">
        <Text className="text-gray-500">Maybe later</Text>
      </Pressable>
    </ScrollView>
  );
}
