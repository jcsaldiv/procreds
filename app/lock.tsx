import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticate } from '@/lib/biometrics';

type Props = {
  onUnlock: () => void;
};

export default function LockScreen({ onUnlock }: Props) {
  const [authenticating, setAuthenticating] = useState(false);

  const tryAuth = async () => {
    setAuthenticating(true);
    try {
      const ok = await authenticate('Unlock ProCreds');
      if (ok) {
        onUnlock();
      } else {
        Alert.alert('Authentication failed', 'Tap "Unlock" to try again.');
      }
    } finally {
      setAuthenticating(false);
    }
  };

  useEffect(() => {
    tryAuth();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900 items-center justify-center p-8">
      <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">ProCreds</Text>
      <Text className="text-gray-500 dark:text-slate-400 mb-12">Your credentials are locked.</Text>

      {authenticating ? (
        <ActivityIndicator size="large" color="#2563EB" />
      ) : (
        <Pressable
          onPress={tryAuth}
          className="bg-blue-600 px-8 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold text-base">🔒 Unlock</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}
