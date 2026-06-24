import type { CredentialStatus } from '../domain/status';
export const STATUS_COLORS: Record<CredentialStatus, string> = {
  active: '#15803D',
  'expiring-soon': '#B45309',
  expiring: '#C2410C',
  expired: '#B91C1C',
  'no-expiration': '#374151',
};
export const STATUS_LABELS: Record<CredentialStatus, string> = {
  active: 'Active',
  'expiring-soon': 'Expiring Soon',
  expiring: 'Expiring',
  expired: 'Expired',
  'no-expiration': 'No Expiration',
};
