import { runMigrations } from '../migrations';
import { getDb, resetDbForTests } from '../client';
import { createProfile } from '../profiles';
import {
  createInsurance,
  listInsuranceForProfile,
  getInsurance,
  updateInsurance,
  deleteInsurance,
  type InsurancePolicy,
} from '../insurance';

beforeEach(() => {
  (require('expo-sqlite') as any).__reset?.();
  resetDbForTests();
  runMigrations(getDb());
});

test('CRUD an insurance policy', () => {
  const p = createProfile({ name: 'JC' });
  const policy = createInsurance({
    profile_id: p.id,
    insurance_type: 'Malpractice',
    carrier: 'The Doctors Company',
    policy_number: 'POL-123',
    effective_date: '2026-01-01',
    expiration_date: '2027-01-01',
    coverage_limit: '1000000',
    premium_amount: '1200',
    auto_renew: false,
    notes: null,
    document_uri: null,
  });

  expect(policy.id).toBeTruthy();
  expect(policy.insurance_type).toBe('Malpractice');

  const list = listInsuranceForProfile(p.id);
  expect(list).toHaveLength(1);
  expect(list[0].carrier).toBe('The Doctors Company');

  updateInsurance(policy.id, { carrier: 'NSO' });
  expect(getInsurance(policy.id)?.carrier).toBe('NSO');

  deleteInsurance(policy.id);
  expect(listInsuranceForProfile(p.id)).toHaveLength(0);
});

test('document_uri is nullable', () => {
  const p = createProfile({ name: 'JC' });
  const policy = createInsurance({
    profile_id: p.id,
    insurance_type: 'General Liability',
    carrier: null,
    policy_number: null,
    effective_date: null,
    expiration_date: null,
    coverage_limit: null,
    premium_amount: null,
    auto_renew: false,
    notes: null,
    document_uri: null,
  });
  expect(getInsurance(policy.id)?.document_uri).toBeNull();
});
