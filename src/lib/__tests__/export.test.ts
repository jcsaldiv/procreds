import { buildCredentialReportHtml } from '../export';
import type { Profile } from '../../db/profiles';
import type { Credential } from '../../db/credentials';

const profile: Profile = {
  id: 'p1', name: 'Jane Smith', profession: 'Registered Nurse',
  color: '#3B82F6', created_at: 0,
};

const cred: Credential = {
  id: 'c1', profile_id: 'p1', name: 'RN License', issuing_body: 'Texas BON',
  credential_number: 'RN123456', issue_date: '2022-01-01', expiration_date: '2026-12-31',
  renewal_url: 'https://nursing.texas.gov', notes: 'Must renew by Jan',
  created_at: 0, updated_at: 0,
};

test('includes profile name', () => {
  const html = buildCredentialReportHtml(profile, [cred]);
  expect(html).toContain('Jane Smith');
});

test('includes profession when present', () => {
  const html = buildCredentialReportHtml(profile, [cred]);
  expect(html).toContain('Registered Nurse');
});

test('includes all credential fields', () => {
  const html = buildCredentialReportHtml(profile, [cred]);
  expect(html).toContain('RN License');
  expect(html).toContain('Texas BON');
  expect(html).toContain('RN123456');
  expect(html).toContain('2022-01-01');
  expect(html).toContain('2026-12-31');
  expect(html).toContain('Must renew by Jan');
  expect(html).toContain('https://nursing.texas.gov');
});

test('omits null fields from table rows', () => {
  const html = buildCredentialReportHtml(profile, [{ ...cred, notes: null, renewal_url: null }]);
  expect(html).not.toContain('Notes');
  expect(html).not.toContain('Renewal URL');
});

test('shows empty message when no credentials', () => {
  const html = buildCredentialReportHtml(profile, []);
  expect(html).toContain('No credentials on file.');
});

test('omits profession div when null', () => {
  const html = buildCredentialReportHtml({ ...profile, profession: null }, [cred]);
  expect(html).not.toContain('Registered Nurse');
});

test('shows Active status for a credential with a future expiration date', () => {
  const activeCred = { ...cred, expiration_date: '2030-01-01' };
  const html = buildCredentialReportHtml(profile, [activeCred]);
  expect(html).toContain('Active');
});

test('shows Expired status for a credential with a past expiration date', () => {
  const expiredCred = { ...cred, expiration_date: '2020-01-01' };
  const html = buildCredentialReportHtml(profile, [expiredCred]);
  expect(html).toContain('Expired');
});
