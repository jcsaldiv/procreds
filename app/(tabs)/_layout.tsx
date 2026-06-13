import { Tabs } from 'expo-router';
export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Dashboard', headerShown: false }} />
      <Tabs.Screen name="credentials" options={{ title: 'Credentials', headerShown: false }} />
      <Tabs.Screen name="ce" options={{ title: 'CE', headerShown: false }} />
      <Tabs.Screen name="insurance" options={{ title: 'Insurance', headerShown: false }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', headerShown: false }} />
    </Tabs>
  );
}
