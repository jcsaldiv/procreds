import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useActiveProfile } from '@/state/activeProfile';
import { listCredentialsForProfile } from '@/db/credentials';
import { listInsuranceForProfile } from '@/db/insurance';
import { calculateStatus } from '@/domain/status';
import { SummaryCard } from '@/components/SummaryCard';
import { ProfilePicker } from '@/components/ProfilePicker';
import { STATUS_COLORS } from '@/constants/colors';
import { usePro } from '@/purchases/usePro';

export default function Dashboard() {
  const { activeProfileId, hydrate } = useActiveProfile();
  const isPro = usePro();
  const [counts, setCounts] = useState({ total: 0, soon: 0, expiring: 0, expired: 0 });
  const [insuranceCounts, setInsuranceCounts] = useState({ active: 0, expiring: 0 });

  useEffect(() => { hydrate(); }, []);

  useEffect(() => {
    if (!activeProfileId) return;

    const creds = listCredentialsForProfile(activeProfileId);
    const c = { total: creds.length, soon: 0, expiring: 0, expired: 0 };
    creds.forEach((r) => {
      const s = calculateStatus(r.expiration_date);
      if (s === 'expiring-soon') c.soon++;
      else if (s === 'expiring') c.expiring++;
      else if (s === 'expired') c.expired++;
    });
    setCounts(c);

    if (isPro) {
      const policies = listInsuranceForProfile(activeProfileId);
      const ic = { active: 0, expiring: 0 };
      policies.forEach((p) => {
        const s = calculateStatus(p.expiration_date);
        if (s === 'active' || s === 'no-expiration') ic.active++;
        else if (s === 'expiring-soon' || s === 'expiring') ic.expiring++;
      });
      setInsuranceCounts(ic);
    }
  }, [activeProfileId, isPro]);

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4"><ProfilePicker /></View>
      <Text className="text-2xl font-bold px-4">Overview</Text>

      <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 mt-3 mb-1">
        Credentials
      </Text>
      <View className="flex-row flex-wrap p-2">
        <SummaryCard label="Total" value={counts.total} color="#3B82F6" />
        <SummaryCard label="Expiring Soon" value={counts.soon} color={STATUS_COLORS['expiring-soon']} />
        <SummaryCard label="Expiring" value={counts.expiring} color={STATUS_COLORS['expiring']} />
        <SummaryCard label="Expired" value={counts.expired} color={STATUS_COLORS['expired']} />
      </View>

      {isPro && (insuranceCounts.active + insuranceCounts.expiring) > 0 ? (
        <>
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 mt-2 mb-1">
            Insurance
          </Text>
          <View className="flex-row flex-wrap p-2">
            <SummaryCard label="Active" value={insuranceCounts.active} color="#3B82F6" />
            <SummaryCard label="Expiring" value={insuranceCounts.expiring} color={STATUS_COLORS['expiring-soon']} />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
