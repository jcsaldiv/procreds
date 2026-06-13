import { getDb } from './client';
import { newId } from '../lib/id';

export type InsurancePolicy = {
  id: string;
  profile_id: string;
  insurance_type: string;
  carrier: string | null;
  policy_number: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  coverage_limit: string | null;
  premium_amount: string | null;
  auto_renew: boolean;
  notes: string | null;
  document_uri: string | null;
  created_at: number;
  updated_at: number;
};

type NewInsurance = Omit<InsurancePolicy, 'id' | 'created_at' | 'updated_at'>;

export function createInsurance(input: NewInsurance): InsurancePolicy {
  const now = Date.now();
  const row: InsurancePolicy = { ...input, id: newId(), created_at: now, updated_at: now };
  getDb().runSync(
    `INSERT INTO insurance_policies
      (id, profile_id, insurance_type, carrier, policy_number, effective_date, expiration_date,
       coverage_limit, premium_amount, auto_renew, notes, document_uri, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id, row.profile_id, row.insurance_type, row.carrier, row.policy_number,
    row.effective_date, row.expiration_date, row.coverage_limit, row.premium_amount,
    row.auto_renew ? 1 : 0, row.notes, row.document_uri, row.created_at, row.updated_at
  );
  return row;
}

export function listInsuranceForProfile(profileId: string): InsurancePolicy[] {
  const rows = getDb().getAllSync<Record<string, any>>(
    'SELECT * FROM insurance_policies WHERE profile_id = ? ORDER BY expiration_date ASC',
    profileId
  );
  return rows.map(dbRowToPolicy);
}

export function getInsurance(id: string): InsurancePolicy | null {
  const row = getDb().getFirstSync<Record<string, any>>(
    'SELECT * FROM insurance_policies WHERE id = ?', id
  );
  return row ? dbRowToPolicy(row) : null;
}

export function updateInsurance(id: string, patch: Partial<NewInsurance>): InsurancePolicy | null {
  const cur = getInsurance(id);
  if (!cur) return null;
  const m = { ...cur, ...patch, updated_at: Date.now() };
  getDb().runSync(
    `UPDATE insurance_policies SET profile_id = ?, insurance_type = ?, carrier = ?, policy_number = ?, effective_date = ?, expiration_date = ?, coverage_limit = ?, premium_amount = ?, auto_renew = ?, notes = ?, document_uri = ?, updated_at = ? WHERE id = ?`,
    m.profile_id, m.insurance_type, m.carrier, m.policy_number,
    m.effective_date, m.expiration_date, m.coverage_limit, m.premium_amount,
    m.auto_renew ? 1 : 0, m.notes, m.document_uri, m.updated_at, id
  );
  return m;
}

export function deleteInsurance(id: string): void {
  getDb().runSync('DELETE FROM insurance_policies WHERE id = ?', id);
}

function dbRowToPolicy(row: Record<string, any>): InsurancePolicy {
  return {
    ...row,
    auto_renew: row.auto_renew === 1 || row.auto_renew === true,
  } as InsurancePolicy;
}
