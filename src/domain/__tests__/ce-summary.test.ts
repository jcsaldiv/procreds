import { sumCeHours } from '../ce-summary';

test('sums numeric hours', () => {
  expect(sumCeHours([{ hours_earned: 2 }, { hours_earned: 3.5 }] as any)).toBe(5.5);
});

test('zero on empty', () => expect(sumCeHours([])).toBe(0));
