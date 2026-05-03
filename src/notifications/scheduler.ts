import type { Credential } from '../db/credentials';
export async function scheduleForCredential(_cred: Credential, _isPro: boolean): Promise<void> {}
export async function cancelForCredential(_credentialId: string): Promise<void> {}
export async function rescheduleForCredential(_cred: Credential, _isPro: boolean): Promise<void> {}
