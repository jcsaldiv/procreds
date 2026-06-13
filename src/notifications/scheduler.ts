import * as Notifications from 'expo-notifications';
import { parseISO, subDays } from 'date-fns';
import type { Credential } from '../db/credentials';
import type { InsurancePolicy } from '@/db/insurance';
import { FREE_LIMITS, PRO_LIMITS } from '../constants/limits';

function reminderDays(isPro: boolean): readonly number[] {
  return isPro ? PRO_LIMITS.REMINDER_DAYS : FREE_LIMITS.REMINDER_DAYS;
}

export async function scheduleForCredential(c: Pick<Credential, 'id' | 'name' | 'expiration_date'>, isPro: boolean): Promise<void> {
  if (!c.expiration_date) return;
  const exp = parseISO(c.expiration_date);
  const now = new Date();
  let scheduled = 0;
  for (const d of reminderDays(isPro)) {
    const fireAt = subDays(exp, d);
    if (fireAt.getTime() <= now.getTime()) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${c.name} renewal reminder`,
        body: d === 0 ? 'Expires today.' : `Expires in ${d} days.`,
        data: { credentialId: c.id },
      },
      trigger: { type: 'date', date: fireAt } as any,
    });
    scheduled++;
  }
  // If no reminders were scheduled but the credential hasn't expired yet,
  // schedule a same-day reminder on the expiration date.
  if (scheduled === 0 && exp.getTime() > now.getTime()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${c.name} renewal reminder`,
        body: 'Expires today.',
        data: { credentialId: c.id },
      },
      trigger: { type: 'date', date: exp } as any,
    });
  }
}

export async function cancelForCredential(credentialId: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if ((n as any)?.content?.data?.credentialId === credentialId) {
      await Notifications.cancelScheduledNotificationAsync((n as any).identifier);
    }
  }
}

export async function rescheduleForCredential(c: Pick<Credential, 'id' | 'name' | 'expiration_date'>, isPro: boolean): Promise<void> {
  await cancelForCredential(c.id);
  await scheduleForCredential(c, isPro);
}

export async function scheduleForInsurance(policy: InsurancePolicy, isPro: boolean): Promise<void> {
  if (!isPro) return;
  if (!policy.expiration_date) return;
  await cancelForInsurance(policy.id);
  const exp = parseISO(policy.expiration_date);
  const now = new Date();
  const label = `${policy.insurance_type}${policy.carrier ? ' (' + policy.carrier + ')' : ''}`;
  let scheduled = 0;
  for (const d of reminderDays(isPro)) {
    const fireAt = subDays(exp, d);
    if (fireAt.getTime() <= now.getTime()) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Insurance Expiring',
        body: `${label} expires in ${d} days`,
        data: { insuranceId: `ins_${policy.id}` },
      },
      trigger: { type: 'date', date: fireAt } as any,
    });
    scheduled++;
  }
  if (scheduled === 0 && exp.getTime() > now.getTime()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Insurance Expiring',
        body: `${label} expires today`,
        data: { insuranceId: `ins_${policy.id}` },
      },
      trigger: { type: 'date', date: exp } as any,
    });
  }
}

export async function cancelForInsurance(policyId: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if ((n as any)?.content?.data?.insuranceId === `ins_${policyId}`) {
      await Notifications.cancelScheduledNotificationAsync((n as any).identifier);
    }
  }
}

export async function rescheduleForInsurance(policy: InsurancePolicy, isPro: boolean): Promise<void> {
  await cancelForInsurance(policy.id);
  await scheduleForInsurance(policy, isPro);
}
