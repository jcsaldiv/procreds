import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useActiveProfile } from '@/state/activeProfile';
import { listCredentialsForProfile } from '@/db/credentials';
import { calculateStatus } from '@/domain/status';
import { SummaryCard } from '@/components/SummaryCard';
import { ProfilePicker } from '@/components/ProfilePicker';
import { STATUS_COLORS } from '@/constants/colors';

export default function Dashboard() {
  const { activeProfileId, hydrate } = useActiveProfile();
  const [counts, setCounts] = useState({ total: 0, soon: 0, expiring: 0, expired: 0 });
  useEffect(() => { hydrate(); }, []);
  useEffect(() => {
    if (!activeProfileId) return;
    const rows = listCredentialsForProfile(activeProfileId);
    const c = { total: rows.length, soon: 0, expiring: 0, expired: 0 };
    rows.forEach((r) => {
      const s = calculateStatus(r.expiration_date);
      if (s === 'expiring-soon') c.soon++;
      else if (s === 'expiring') c.expiring++;
      else if (s === 'expired') c.expired++;
    });
    setCounts(c);
  }, [activeProfileId]);

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4"><ProfilePicker /></View>
      <Text className="text-2xl font-bold px-4">Overview</Text>
      <View className="flex-row flex-wrap p-2">
        <SummaryCard label="Total" value={counts.total} color="#3B82F6" />
        <SummaryCard label="Expiring Soon" value={counts.soon} color={STATUS_COLORS['expiring-soon']} />
        <SummaryCard label="Expiring" value={counts.expiring} color={STATUS_COLORS['expiring']} />
        <SummaryCard label="Expired" value={counts.expired} color={STATUS_COLORS['expired']} />
      </View>
    </ScrollView>
  );
}
