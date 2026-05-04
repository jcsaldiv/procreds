import type { CeCourse } from '../db/ce';

export function sumCeHours(rows: Pick<CeCourse, 'hours_earned'>[]): number {
  return rows.reduce((acc, r) => acc + (r.hours_earned ?? 0), 0);
}
