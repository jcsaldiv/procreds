import { format, parseISO } from 'date-fns';
export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd');
export const fromISO = (s: string) => parseISO(s);
