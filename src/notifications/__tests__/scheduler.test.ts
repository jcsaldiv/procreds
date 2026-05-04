import * as Notifications from 'expo-notifications';
import { scheduleForCredential, cancelForCredential } from '../scheduler';
import { addDays, formatISO } from 'date-fns';

beforeEach(() => jest.clearAllMocks());

test('free tier schedules 30+7 day reminders', async () => {
  const exp = formatISO(addDays(new Date(), 200), { representation: 'date' });
  await scheduleForCredential({ id: 'c1', name: 'RN', expiration_date: exp } as any, false);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
});

test('pro schedules 4 reminders', async () => {
  const exp = formatISO(addDays(new Date(), 200), { representation: 'date' });
  await scheduleForCredential({ id: 'c1', name: 'RN', expiration_date: exp } as any, true);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(4);
});

test('skips reminders that have already passed', async () => {
  const exp = formatISO(addDays(new Date(), 5), { representation: 'date' });
  await scheduleForCredential({ id: 'c1', name: 'RN', expiration_date: exp } as any, true);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
});

test('no schedule when no expiration', async () => {
  await scheduleForCredential({ id: 'c1', name: 'RN', expiration_date: null } as any, true);
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('cancelForCredential cancels matching scheduled', async () => {
  (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValueOnce([
    { identifier: 'n1', content: { data: { credentialId: 'c1' } } },
    { identifier: 'n2', content: { data: { credentialId: 'c2' } } },
  ]);
  await cancelForCredential('c1');
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('n1');
  expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('n2');
});
