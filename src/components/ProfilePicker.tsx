import { useEffect, useState } from 'react';
import { Pressable, Text, View, Modal, FlatList } from 'react-native';
import { listProfiles, type Profile } from '../db/profiles';
import { useActiveProfile } from '../state/activeProfile';

export function ProfilePicker() {
  const { activeProfileId, setActiveProfileId } = useActiveProfile();
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  useEffect(() => { setProfiles(listProfiles()); }, [open]);
  const active = profiles.find((p) => p.id === activeProfileId);
  return (
    <View>
      <Pressable onPress={() => setOpen(true)} className="px-3 py-2 bg-gray-100 rounded-lg">
        <Text className="text-sm font-medium">{active?.name ?? 'Select profile'}</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 p-4">
          <Text className="text-xl font-bold mb-4">Profiles</Text>
          <FlatList
            data={profiles}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <Pressable
                className="p-4 border-b border-gray-200"
                onPress={() => { setActiveProfileId(item.id); setOpen(false); }}
              >
                <Text className="text-base">{item.name}</Text>
              </Pressable>
            )}
          />
          <Pressable onPress={() => setOpen(false)} className="p-4">
            <Text className="text-blue-600">Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
