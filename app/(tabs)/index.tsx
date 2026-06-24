import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTabletStyle } from '@/hooks/useIsTablet';
import { useRouter } from 'expo-router';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useActiveProfile } from '@/state/activeProfile';
import { listCredentialsForProfile, type Credential } from '@/db/credentials';
import { listInsuranceForProfile, type InsurancePolicy } from '@/db/insurance';
import { calculateStatus } from '@/domain/status';
import { SummaryCard } from '@/components/SummaryCard';
import { ProfilePicker } from '@/components/ProfilePicker';
import { STATUS_COLORS } from '@/constants/colors';
import { usePro } from '@/purchases/usePro';

type UpcomingItem = {
  id: string;
  name: string;
  expiration_date: string | null;
  status: string;
  type: 'credential' | 'insurance';
};

const STATUS_DOT: Record<string, string> = {
  'expiring-soon': STATUS_COLORS['expiring-soon'],
  'expiring': STATUS_COLORS['expiring'],
  'expired': STATUS_COLORS['expired'],
};

function daysLabel(iso: string | null) {
  if (!iso) return '';
  const days = differenceInDays(parseISO(iso), new Date());
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'expires today';
  return `${days}d left`;
}

export default function Dashboard() {
  const router = useRouter();
  const { activeProfileId, hydrate } = useActiveProfile();
  const isPro = usePro();
  const isDark = useColorScheme() === 'dark';
  const tabletStyle = useTabletStyle();
  const [counts, setCounts] = useState({ total: 0, expiring: 0, expired: 0 });
  const [insuranceCounts, setInsuranceCounts] = useState({ active: 0, expiring: 0 });
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);

  useEffect(() => { hydrate(); }, []);

  useEffect(() => {
    if (!activeProfileId) return;

    const creds = listCredentialsForProfile(activeProfileId);
    const c = { total: creds.length, expiring: 0, expired: 0 };
    const upcomingItems: UpcomingItem[] = [];

    creds.forEach((r) => {
      const s = calculateStatus(r.expiration_date);
      if (s === 'expiring-soon' || s === 'expiring') c.expiring++;
      else if (s === 'expired') c.expired++;
      if (s === 'expiring-soon' || s === 'expiring' || s === 'expired') {
        upcomingItems.push({ id: r.id, name: r.name, expiration_date: r.expiration_date, status: s, type: 'credential' });
      }
    });
    setCounts(c);

    if (isPro) {
      const policies = listInsuranceForProfile(activeProfileId);
      const ic = { active: 0, expiring: 0 };
      policies.forEach((p) => {
        const s = calculateStatus(p.expiration_date);
        if (s === 'active' || s === 'no-expiration') ic.active++;
        else if (s === 'expiring-soon' || s === 'expiring') ic.expiring++;
        if (s === 'expiring-soon' || s === 'expiring' || s === 'expired') {
          upcomingItems.push({ id: p.id, name: p.carrier ?? p.insurance_type, expiration_date: p.expiration_date, status: s, type: 'insurance' });
        }
      });
      setInsuranceCounts(ic);
    }

    upcomingItems.sort((a, b) => {
      if (!a.expiration_date) return 1;
      if (!b.expiration_date) return -1;
      return a.expiration_date.localeCompare(b.expiration_date);
    });
    setUpcoming(upcomingItems);
  }, [activeProfileId, isPro]);

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-950" contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={tabletStyle}>
      <View className="p-4 bg-white dark:bg-slate-900"><ProfilePicker /></View>

      <Text className="text-2xl font-bold px-4 pt-4 pb-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Overview</Text>

      <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-4 mt-3 mb-1">
        Credentials
      </Text>
      <View className="flex-row px-2">
        <SummaryCard label="Total" value={counts.total} color="#3B82F6" onPress={() => router.push('/(tabs)/credentials')} />
        <SummaryCard label="Expiring" value={counts.expiring} color={STATUS_COLORS['expiring-soon']} onPress={() => router.push({ pathname: '/(tabs)/credentials', params: { filter: 'expiring' } })} />
        <SummaryCard label="Expired" value={counts.expired} color={STATUS_COLORS['expired']} onPress={() => router.push({ pathname: '/(tabs)/credentials', params: { filter: 'expired' } })} />
      </View>

      {isPro && (insuranceCounts.active + insuranceCounts.expiring) > 0 ? (
        <>
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-4 mt-3 mb-1">
            Insurance
          </Text>
          <View className="flex-row flex-wrap px-2">
            <SummaryCard label="Active" value={insuranceCounts.active} color="#3B82F6" onPress={() => router.push({ pathname: '/(tabs)/insurance', params: { filter: 'active' } })} />
            <SummaryCard label="Expiring" value={insuranceCounts.expiring} color={STATUS_COLORS['expiring-soon']} onPress={() => router.push({ pathname: '/(tabs)/insurance', params: { filter: 'expiring' } })} />
          </View>
        </>
      ) : null}

      {upcoming.length > 0 ? (
        <View className="mx-4 mt-4 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-4 pt-4 pb-2">
            Needs Attention
          </Text>
          {upcoming.map((item, i) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(item.type === 'credential' ? `/credential/${item.id}` : `/insurance/${item.id}`)}
              className={`flex-row items-center px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800 ${i < upcoming.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
            >
              <View className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: STATUS_DOT[item.status] ?? '#94a3b8' }} />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-900 dark:text-white" numberOfLines={1}>{item.name}</Text>
                {item.expiration_date ? (
                  <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {format(parseISO(item.expiration_date), 'MM-dd-yyyy')} · {daysLabel(item.expiration_date)}
                  </Text>
                ) : null}
              </View>
              <Text className="text-slate-300 dark:text-slate-600 ml-2">›</Text>
            </Pressable>
          ))}
        </View>
      ) : counts.total > 0 ? (
        <View className="mx-4 mt-4 rounded-2xl bg-white dark:bg-slate-900 p-6 items-center shadow-sm">
          <Text className="text-green-600 font-semibold text-base">All credentials current</Text>
          <Text className="text-slate-500 dark:text-slate-400 text-sm mt-1">Nothing expiring soon.</Text>
        </View>
      ) : null}

      {/* Quick Actions */}
      <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-4 mt-4 mb-2">
        Quick Actions
      </Text>
      <View className="mx-4 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <Pressable
          onPress={() => router.push('/(tabs)/credentials')}
          className="flex-row items-center px-4 py-4 border-b border-slate-100 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-800"
        >
          <View className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mr-3">
            <Ionicons name="documents-outline" size={18} color={isDark ? '#94a3b8' : '#475569'} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-slate-900 dark:text-white">View All Credentials</Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{counts.total} credential{counts.total !== 1 ? 's' : ''} on file</Text>
          </View>
          <Text className="text-slate-300 dark:text-slate-600">›</Text>
        </Pressable>
        {isPro ? (
          <Pressable
            onPress={() => router.push('/export')}
            className="flex-row items-center px-4 py-4 active:bg-slate-50 dark:active:bg-slate-800"
          >
            <View className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 items-center justify-center mr-3">
              <Ionicons name="share-outline" size={18} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-900 dark:text-white">Export PDF</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Share your credential report</Text>
            </View>
            <Text className="text-slate-300 dark:text-slate-600">›</Text>
          </Pressable>
        ) : null}
      </View>
      </View>
    </ScrollView>
  );
}
