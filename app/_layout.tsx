import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { runMigrations } from '@/db/migrations';
import { getDb } from '@/db/client';
import { initRevenueCat } from '@/purchases/revenuecat';
import '../global.css';

export default function RootLayout() {
  const router = useRouter();
  useEffect(() => {
    runMigrations(getDb());
    initRevenueCat();
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const id = res.notification.request.content.data?.credentialId as string | undefined;
      if (id) router.push(`/credential/${id}`);
    });
    return () => sub.remove();
  }, [router]);
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
