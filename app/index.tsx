import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { getSetting } from '@/db/settings';

type Target = '/(tabs)' | '/onboarding';

export default function Index() {
  const [target, setTarget] = useState<Target | null>(null);

  useEffect(() => {
    const done = getSetting('onboarding_complete');
    setTarget(done === 'true' ? '/(tabs)' : '/onboarding');
  }, []);

  if (target === null) return <View className="flex-1 bg-white" />;
  return <Redirect href={target} />;
}
