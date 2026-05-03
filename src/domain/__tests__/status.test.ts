import { calculateStatus } from '../status';
import { addDays, formatISO } from 'date-fns';
const iso = (d: Date) => formatISO(d, { representation: 'date' });

test('no expiration', () => expect(calculateStatus(null)).toBe('no-expiration'));
test('expired', () => expect(calculateStatus(iso(addDays(new Date(), -1)))).toBe('expired'));
test('expiring (<=30)', () => expect(calculateStatus(iso(addDays(new Date(), 10)))).toBe('expiring'));
test('expiring-soon (<=90)', () => expect(calculateStatus(iso(addDays(new Date(), 60)))).toBe('expiring-soon'));
test('active', () => expect(calculateStatus(iso(addDays(new Date(), 200)))).toBe('active'));
