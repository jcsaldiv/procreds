import { differenceInDays, parseISO } from 'date-fns';
export type CredentialStatus = 'active' | 'expiring-soon' | 'expiring' | 'expired' | 'no-expiration';

export function calculateStatus(expirationDate: string | null): CredentialStatus {
  if (!expirationDate) return 'no-expiration';
  const days = differenceInDays(parseISO(expirationDate), new Date());
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  if (days <= 90) return 'expiring-soon';
  return 'active';
}
