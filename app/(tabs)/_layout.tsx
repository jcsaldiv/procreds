import { Tabs } from 'expo-router';
export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="credentials" options={{ title: 'Credentials' }} />
      <Tabs.Screen name="ce" options={{ title: 'CE' }} />
      <Tabs.Screen name="insurance" options={{ title: 'Insurance' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
