import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { scanDocument, type ScanResult, type ScanType } from '@/lib/ai-scan';

type Props = {
  type: ScanType;
  onResult: (result: ScanResult, imageUri: string) => void;
  onError?: (code: 'NO_KEY' | 'SCAN_FAILED' | 'CANCELLED') => void;
};

export function ScanButton({ type, onResult, onError }: Props) {
  const [scanning, setScanning] = useState(false);

  const pick = () => {
    Alert.alert('Scan Document', 'Choose source', [
      { text: 'Take Photo', onPress: () => launch('camera') },
      { text: 'Photo Library', onPress: () => launch('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const launch = async (source: 'camera' | 'library') => {
    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera access is needed to scan documents.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Photo library access is needed to scan documents.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    }

    if (result.canceled) {
      onError?.('CANCELLED');
      return;
    }

    const uri = result.assets[0].uri;
    setScanning(true);
    try {
      const fields = await scanDocument(uri, type);
      onResult(fields, uri);
    } catch (e) {
      if (e === 'NO_KEY') {
        Alert.alert('AI not configured', 'Add your API key in Settings → AI Scanning.');
        onError?.('NO_KEY');
      } else {
        Alert.alert('Scan failed', 'Could not extract fields. Fill them in manually.');
        onError?.('SCAN_FAILED');
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <Pressable
      onPress={pick}
      disabled={scanning}
      className="flex-row items-center justify-center border border-blue-600 rounded-lg py-2 px-4 mb-4"
    >
      {scanning ? (
        <ActivityIndicator size="small" color="#2563EB" />
      ) : (
        <Text className="text-blue-600 font-semibold">📷 Scan Document</Text>
      )}
    </Pressable>
  );
}
