export const FREE_LIMITS = {
  MAX_PROFILES: 1,
  MAX_CREDENTIALS: 3,
  REMINDER_DAYS: [30, 7],
  CE_ENABLED: false,
} as const;

export const PRO_LIMITS = {
  MAX_PROFILES: 3,
  MAX_CREDENTIALS: Infinity,
  REMINDER_DAYS: [90, 60, 30, 7],
  CE_ENABLED: true,
} as const;
