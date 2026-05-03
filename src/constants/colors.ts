import type { CredentialStatus } from '../domain/status';
export const STATUS_COLORS: Record<CredentialStatus, string> = {
  active: '#22C55E',
  'expiring-soon': '#EAB308',
  expiring: '#F97316',
  expired: '#EF4444',
  'no-expiration': '#6B7280',
};
export const STATUS_LABELS: Record<CredentialStatus, string> = {
  active: 'Active',
  'expiring-soon': 'Expiring Soon',
  expiring: 'Expiring',
  expired: 'Expired',
  'no-expiration': 'No Expiration',
};
