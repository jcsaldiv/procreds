# Portal Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Insurance section, AI document scanning, and biometric lock to the credential-tracker React Native / Expo app.

**Architecture:** Three independent feature sets land on top of the existing expo-sqlite + expo-router codebase. Insurance adds a V2 DB migration and a fifth tab. AI scanning is a shared `ScanButton` component backed by an OpenAI-compatible fetch call. Biometrics wraps `expo-local-authentication` and gates app launch + destructive actions.

**Tech Stack:** React Native 0.81, Expo 54, expo-router 6, expo-sqlite 16, NativeWind 4, expo-local-authentication, expo-secure-store, expo-image-picker, TypeScript, Jest

**Design spec:** `docs/superpowers/specs/2026-06-13-portal-parity-design.md`

---

## File Map

### New files
| File | Purpose |
|---|---|
| `src/db/insurance.ts` | CRUD for insurance_policies table |
| `src/db/__tests__/insurance.test.ts` | Insurance DB unit tests |
| `src/lib/ai-scan.ts` | OpenAI-compatible image→fields extraction |
| `src/lib/__tests__/ai-scan.test.ts` | AI scan unit tests |
| `src/lib/biometrics.ts` | expo-local-authentication helpers |
| `src/lib/__tests__/biometrics.test.ts` | Biometrics unit tests |
| `src/components/ScanButton.tsx` | Reusable scan-document button (camera/library→AI) |
| `src/components/InsuranceRow.tsx` | Insurance list row |
| `app/(tabs)/insurance.tsx` | Insurance tab (list) |
| `app/insurance/new.tsx` | New insurance policy form |
| `app/insurance/[id].tsx` | Insurance detail |
| `app/insurance/[id]/edit.tsx` | Insurance edit form |
| `app/lock.tsx` | Biometric lock screen |

### Modified files
| File | Change |
|---|---|
| `src/db/migrations.ts` | Add V2 migration (insurance_policies table), bump CURRENT_VERSION to 2 |
| `src/db/__tests__/migrations.test.ts` | Assert V2 schema |
| `src/notifications/scheduler.ts` | Add scheduleForInsurance, cancelForInsurance, rescheduleForInsurance |
| `app/(tabs)/_layout.tsx` | Add Insurance tab |
| `app/(tabs)/index.tsx` | Add insurance summary cards |
| `app/(tabs)/settings.tsx` | Add Security + AI Scanning sections |
| `app/_layout.tsx` | Add biometric launch lock + AppState listener |
| `app/credential/new.tsx` | Add ScanButton |
| `app/credential/[id]/ce/new.tsx` | Add ScanButton |

---

## Task 1: Install New Dependencies

**Files:** `package.json`

- [ ] **Step 1: Install packages**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx expo install expo-local-authentication expo-secure-store expo-image-picker
```

Expected: packages added to node_modules and package.json, no errors.

- [ ] **Step 2: Verify typecheck still passes**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add package.json package-lock.json && git commit -m "chore: install expo-local-authentication, expo-secure-store, expo-image-picker"
```

---

## Task 2: Migration V2 — insurance_policies Table

**Files:**
- Modify: `src/db/migrations.ts`
- Modify: `src/db/__tests__/migrations.test.ts`

- [ ] **Step 1: Update migration test to assert V2 schema**

Replace the contents of `src/db/__tests__/migrations.test.ts`:

```ts
import { runMigrations, CURRENT_VERSION } from '../migrations';
import { getDb, resetDbForTests } from '../client';

describe('migrations', () => {
  beforeEach(() => {
    (require('expo-sqlite') as any).__reset?.();
    resetDbForTests();
  });

  it('runs to CURRENT_VERSION on a fresh db', () => {
    const db = getDb();
    runMigrations(db);
    const row = db.getFirstSync<{ version: number }>('SELECT version FROM schema_version LIMIT 1');
    expect(row?.version).toBe(CURRENT_VERSION);
    expect(CURRENT_VERSION).toBe(2);
  });

  it('is idempotent — running twice does not change version or throw', () => {
    const db = getDb();
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
    const row = db.getFirstSync<{ version: number }>('SELECT version FROM schema_version LIMIT 1');
    expect(row?.version).toBe(CURRENT_VERSION);
  });

  it('creates insurance_policies table in V2', () => {
    const db = getDb();
    runMigrations(db);
    expect(() =>
      db.runSync(
        `INSERT INTO insurance_policies (id, profile_id, insurance_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        'test-id', 'prof-id', 'Malpractice', 1, 1
      )
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx jest src/db/__tests__/migrations.test.ts --no-coverage
```

Expected: fails — `CURRENT_VERSION` is 1, insurance_policies table does not exist.

- [ ] **Step 3: Update migrations.ts**

Replace the contents of `src/db/migrations.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';

export const CURRENT_VERSION = 2;

const V1 = `
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    profession TEXT,
    color TEXT DEFAULT '#3B82F6',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    name TEXT NOT NULL,
    issuing_body TEXT,
    credential_number TEXT,
    issue_date TEXT,
    expiration_date TEXT,
    renewal_url TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS ce_courses (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    credential_id TEXT,
    course_name TEXT NOT NULL,
    organization TEXT,
    date_completed TEXT NOT NULL,
    hours_earned REAL NOT NULL,
    category TEXT,
    certificate_number TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_credentials_profile_id ON credentials(profile_id);
  CREATE INDEX IF NOT EXISTS idx_ce_profile_id ON ce_courses(profile_id);
  CREATE INDEX IF NOT EXISTS idx_ce_credential_id ON ce_courses(credential_id);
  CREATE INDEX IF NOT EXISTS idx_credentials_expiration ON credentials(expiration_date);
`;

const V2 = `
  CREATE TABLE IF NOT EXISTS insurance_policies (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    insurance_type TEXT NOT NULL,
    carrier TEXT,
    policy_number TEXT,
    effective_date TEXT,
    expiration_date TEXT,
    coverage_limit TEXT,
    premium_amount TEXT,
    auto_renew INTEGER DEFAULT 0,
    notes TEXT,
    document_uri TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_insurance_profile_id ON insurance_policies(profile_id);
  CREATE INDEX IF NOT EXISTS idx_insurance_expiration ON insurance_policies(expiration_date);
`;

export function runMigrations(db: SQLiteDatabase): void {
  db.execSync('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);');
  const row = db.getFirstSync<{ version: number }>('SELECT version FROM schema_version LIMIT 1');
  const current = row?.version ?? 0;

  if (current < 1) {
    db.withTransactionSync(() => {
      db.execSync(V1);
      db.runSync('DELETE FROM schema_version');
      db.runSync('INSERT INTO schema_version (version) VALUES (?)', 1);
    });
  }

  if (current < 2) {
    db.withTransactionSync(() => {
      db.execSync(V2);
      db.runSync('DELETE FROM schema_version');
      db.runSync('INSERT INTO schema_version (version) VALUES (?)', 2);
    });
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx jest src/db/__tests__/migrations.test.ts --no-coverage
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add src/db/migrations.ts src/db/__tests__/migrations.test.ts && git commit -m "feat: add V2 migration for insurance_policies table"
```

---

## Task 3: Insurance DB Module

**Files:**
- Create: `src/db/insurance.ts`
- Create: `src/db/__tests__/insurance.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/db/__tests__/insurance.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx jest src/db/__tests__/insurance.test.ts --no-coverage
```

Expected: fails — `insurance` module does not exist.

- [ ] **Step 3: Create src/db/insurance.ts**

```ts
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
    `UPDATE insurance_policies SET profile_id = ?, insurance_type = ?, carrier = ?, policy_number = ?,
     effective_date = ?, expiration_date = ?, coverage_limit = ?, premium_amount = ?,
     auto_renew = ?, notes = ?, document_uri = ?, updated_at = ? WHERE id = ?`,
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
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx jest src/db/__tests__/insurance.test.ts --no-coverage
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add src/db/insurance.ts src/db/__tests__/insurance.test.ts && git commit -m "feat: add insurance_policies DB module"
```

---

## Task 4: AI Scan Library

**Files:**
- Create: `src/lib/ai-scan.ts`
- Create: `src/lib/__tests__/ai-scan.test.ts`

- [ ] **Step 1: Add mocks for new deps to jest.setup.ts**

Append to `jest.setup.ts`:

```ts
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(async () => 'base64data'),
  copyAsync: jest.fn(async () => undefined),
  makeDirectoryAsync: jest.fn(async () => undefined),
  deleteAsync: jest.fn(async () => undefined),
  getInfoAsync: jest.fn(async () => ({ exists: true })),
  documentDirectory: 'file:///documents/',
  EncodingType: { Base64: 'base64' },
}));

jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => false),
  isEnrolledAsync: jest.fn(async () => false),
  authenticateAsync: jest.fn(async () => ({ success: false })),
}));
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/__tests__/ai-scan.test.ts`:

```ts
import * as SecureStore from 'expo-secure-store';

jest.mock('@/db/settings', () => ({
  getSetting: jest.fn((key: string) => {
    if (key === 'ai_base_url') return 'https://api.openai.com/v1';
    if (key === 'ai_model') return 'gpt-4o';
    return null;
  }),
}));

import { scanDocument } from '../ai-scan';

beforeEach(() => {
  jest.clearAllMocks();
  (global as any).fetch = jest.fn();
});

test('throws NO_KEY when no API key configured', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  await expect(scanDocument('file:///img.jpg', 'credential')).rejects.toBe('NO_KEY');
});

test('returns extracted credential fields on success', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('sk-test-key');
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: '{"name":"ARRT","expirationDate":"2027-02-28"}' } }],
    }),
  });

  const result = await scanDocument('file:///img.jpg', 'credential') as any;
  expect(result.name).toBe('ARRT');
  expect(result.expirationDate).toBe('2027-02-28');
});

test('throws SCAN_FAILED on non-2xx response', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('sk-test-key');
  (global as any).fetch = jest.fn().mockResolvedValue({ ok: false });
  await expect(scanDocument('file:///img.jpg', 'ce')).rejects.toBe('SCAN_FAILED');
});

test('throws SCAN_FAILED on invalid JSON in response', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('sk-test-key');
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'Sorry, I cannot read that.' } }],
    }),
  });
  const result = await scanDocument('file:///img.jpg', 'insurance') as any;
  expect(result).toEqual({});
});

test('sends correct Authorization header', async () => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('sk-my-key');
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content: '{}' } }] }),
  });
  await scanDocument('file:///img.jpg', 'credential');
  const [, options] = ((global as any).fetch as jest.Mock).mock.calls[0];
  const headers = JSON.parse(options.body).model;
  expect(headers).toBe('gpt-4o');
  const authHeader = options.headers.Authorization;
  expect(authHeader).toBe('Bearer sk-my-key');
});
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx jest src/lib/__tests__/ai-scan.test.ts --no-coverage
```

Expected: fails — `ai-scan` module does not exist.

- [ ] **Step 4: Create src/lib/ai-scan.ts**

```ts
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { getSetting } from '@/db/settings';

export type ScanType = 'credential' | 'ce' | 'insurance';

export type CredentialScanResult = {
  name?: string;
  issuingBody?: string;
  credentialNumber?: string;
  issueDate?: string;
  expirationDate?: string;
  renewalUrl?: string;
};

export type CeScanResult = {
  courseName?: string;
  organization?: string;
  dateCompleted?: string;
  hoursEarned?: number;
  category?: string;
  certificateNumber?: string;
};

export type InsuranceScanResult = {
  insuranceType?: string;
  carrier?: string;
  policyNumber?: string;
  effectiveDate?: string;
  expirationDate?: string;
  coverageLimit?: string;
  premiumAmount?: string;
};

export type ScanResult = CredentialScanResult | CeScanResult | InsuranceScanResult;

const PROMPTS: Record<ScanType, string> = {
  credential: `Extract fields from this professional license or certification document. Return ONLY valid JSON with these optional keys: name, issuingBody, credentialNumber, issueDate (YYYY-MM-DD), expirationDate (YYYY-MM-DD), renewalUrl. Omit any key you cannot confidently extract.`,
  ce: `Extract fields from this continuing education certificate. Return ONLY valid JSON with these optional keys: courseName, organization, dateCompleted (YYYY-MM-DD), hoursEarned (number), category, certificateNumber. Omit any key you cannot confidently extract.`,
  insurance: `Extract fields from this insurance policy document. Return ONLY valid JSON with these optional keys: insuranceType (one of: Malpractice, General Liability, Health/Benefits, Other), carrier, policyNumber, effectiveDate (YYYY-MM-DD), expirationDate (YYYY-MM-DD), coverageLimit, premiumAmount. Omit any key you cannot confidently extract.`,
};

export async function scanDocument(imageUri: string, type: ScanType): Promise<ScanResult> {
  const apiKey = await SecureStore.getItemAsync('ai_api_key');
  if (!apiKey) throw 'NO_KEY';

  const baseUrl = getSetting('ai_base_url') ?? 'https://api.openai.com/v1';
  const model = getSetting('ai_model') ?? 'gpt-4o';

  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: PROMPTS[type] },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 500,
    }),
  });

  if (!res.ok) throw 'SCAN_FAILED';

  const data = (await res.json()) as any;
  const content: string = data?.choices?.[0]?.message?.content ?? '{}';

  try {
    const match = content.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  } catch {
    return {};
  }
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx jest src/lib/__tests__/ai-scan.test.ts --no-coverage
```

Expected: 5 tests pass.

- [ ] **Step 6: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add jest.setup.ts src/lib/ai-scan.ts src/lib/__tests__/ai-scan.test.ts && git commit -m "feat: add AI scan library (OpenAI-compatible)"
```

---

## Task 5: Biometrics Library

**Files:**
- Create: `src/lib/biometrics.ts`
- Create: `src/lib/__tests__/biometrics.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/biometrics.test.ts`:

```ts
import * as LocalAuthentication from 'expo-local-authentication';
import { isBiometricAvailable, authenticate } from '../biometrics';

beforeEach(() => jest.clearAllMocks());

test('isBiometricAvailable returns false when no hardware', async () => {
  (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
  expect(await isBiometricAvailable()).toBe(false);
  expect(LocalAuthentication.isEnrolledAsync).not.toHaveBeenCalled();
});

test('isBiometricAvailable returns false when hardware present but not enrolled', async () => {
  (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
  (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
  expect(await isBiometricAvailable()).toBe(false);
});

test('isBiometricAvailable returns true when hardware present and enrolled', async () => {
  (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
  (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
  expect(await isBiometricAvailable()).toBe(true);
});

test('authenticate returns true on success', async () => {
  (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
  expect(await authenticate('Delete credential?')).toBe(true);
  expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
    expect.objectContaining({ promptMessage: 'Delete credential?' })
  );
});

test('authenticate returns false on failure', async () => {
  (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: false, error: 'user_cancel' });
  expect(await authenticate('Unlock app')).toBe(false);
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx jest src/lib/__tests__/biometrics.test.ts --no-coverage
```

Expected: fails — `biometrics` module does not exist.

- [ ] **Step 3: Create src/lib/biometrics.ts**

```ts
import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

export async function authenticate(reason: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Cancel',
    fallbackLabel: 'Use Passcode',
  });
  return result.success;
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx jest src/lib/__tests__/biometrics.test.ts --no-coverage
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add src/lib/biometrics.ts src/lib/__tests__/biometrics.test.ts && git commit -m "feat: add biometrics helper (expo-local-authentication)"
```

---

## Task 6: ScanButton Component

**Files:**
- Create: `src/components/ScanButton.tsx`

- [ ] **Step 1: Create src/components/ScanButton.tsx**

```tsx
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { scanDocument, type ScanResult, type ScanType } from '@/lib/ai-scan';

type Props = {
  type: ScanType;
  onResult: (result: ScanResult, imageUri: string) => void;
  onError?: (code: 'NO_KEY' | 'SCAN_FAILED' | 'CANCELLED') => void;
};

export function ScanButton({ type, onResult, onError }: Props) {
  const [scanning, setScanning] = useState(false);

  const pick = () => {
    Alert.alert('Scan Document', 'Choose source', [
      { text: 'Take Photo', onPress: () => launch('camera') },
      { text: 'Photo Library', onPress: () => launch('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const launch = async (source: 'camera' | 'library') => {
    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera access is needed to scan documents.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Photo library access is needed to scan documents.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    }

    if (result.canceled) {
      onError?.('CANCELLED');
      return;
    }

    const uri = result.assets[0].uri;
    setScanning(true);
    try {
      const fields = await scanDocument(uri, type);
      onResult(fields, uri);
    } catch (e) {
      if (e === 'NO_KEY') {
        Alert.alert('AI not configured', 'Add your API key in Settings → AI Scanning.');
        onError?.('NO_KEY');
      } else {
        Alert.alert('Scan failed', 'Could not extract fields. Fill them in manually.');
        onError?.('SCAN_FAILED');
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <Pressable
      onPress={pick}
      disabled={scanning}
      className="flex-row items-center justify-center border border-blue-600 rounded-lg py-2 px-4 mb-4"
    >
      {scanning ? (
        <ActivityIndicator size="small" color="#2563EB" />
      ) : (
        <Text className="text-blue-600 font-semibold">📷 Scan Document</Text>
      )}
    </Pressable>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add src/components/ScanButton.tsx && git commit -m "feat: add ScanButton component (camera/library → AI extraction)"
```

---

## Task 7: InsuranceRow Component

**Files:**
- Create: `src/components/InsuranceRow.tsx`

- [ ] **Step 1: Create src/components/InsuranceRow.tsx**

```tsx
import { Pressable, Text, View } from 'react-native';
import { calculateStatus } from '@/domain/status';
import { StatusBadge } from './StatusBadge';

export function InsuranceRow(props: {
  id: string;
  insuranceType: string;
  carrier: string | null;
  expirationDate: string | null;
  onPress: (id: string) => void;
}) {
  const status = calculateStatus(props.expirationDate);
  return (
    <Pressable
      onPress={() => props.onPress(props.id)}
      className="flex-row items-center justify-between p-4 border-b border-gray-200"
    >
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900">{props.insuranceType}</Text>
        {props.carrier ? (
          <Text className="text-xs text-gray-500">{props.carrier}</Text>
        ) : null}
        <Text className="text-xs text-gray-400">
          {props.expirationDate ? `Expires ${props.expirationDate}` : 'No expiration'}
        </Text>
      </View>
      <StatusBadge status={status} />
    </Pressable>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add src/components/InsuranceRow.tsx && git commit -m "feat: add InsuranceRow component"
```

---

## Task 8: Insurance Tab + Tab Layout

**Files:**
- Create: `app/(tabs)/insurance.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Create app/(tabs)/insurance.tsx**

```tsx
import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useActiveProfile } from '@/state/activeProfile';
import { listInsuranceForProfile, type InsurancePolicy } from '@/db/insurance';
import { InsuranceRow } from '@/components/InsuranceRow';
import { EmptyState } from '@/components/EmptyState';
import { usePro } from '@/purchases/usePro';

export default function InsuranceTab() {
  const router = useRouter();
  const isPro = usePro();
  const { activeProfileId } = useActiveProfile();
  const [rows, setRows] = useState<InsurancePolicy[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (activeProfileId) setRows(listInsuranceForProfile(activeProfileId));
    }, [activeProfileId])
  );

  if (!isPro) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-white">
        <Text className="text-xl font-bold mb-2">Insurance tracking is a Pro feature</Text>
        <Pressable
          onPress={() => router.push('/paywall')}
          className="bg-blue-600 px-4 py-2 rounded-lg mt-4"
        >
          <Text className="text-white font-semibold">Upgrade to Pro</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row justify-between items-center p-4">
        <Text className="text-2xl font-bold">Insurance</Text>
        <Pressable
          onPress={() => router.push('/insurance/new')}
          className="bg-blue-600 px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-semibold">+ Add</Text>
        </Pressable>
      </View>
      {rows.length === 0 ? (
        <EmptyState
          title="No insurance policies yet"
          body="Tap + Add to track your first policy."
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <InsuranceRow
              id={item.id}
              insuranceType={item.insurance_type}
              carrier={item.carrier}
              expirationDate={item.expiration_date}
              onPress={(id) => router.push(`/insurance/${id}`)}
            />
          )}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 2: Update app/(tabs)/_layout.tsx to add Insurance tab**

Replace the entire contents of `app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="credentials" options={{ title: 'Credentials' }} />
      <Tabs.Screen name="ce" options={{ title: 'CE' }} />
      <Tabs.Screen name="insurance" options={{ title: 'Insurance' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add app/(tabs)/insurance.tsx app/(tabs)/_layout.tsx && git commit -m "feat: add Insurance tab"
```

---

## Task 9: New Insurance Form

> **Prerequisite:** Complete Task 12 (Insurance Notifications) before this task. The form imports `scheduleForInsurance` from `@/notifications/scheduler` which is added in Task 12. Typecheck will fail if Task 12 is not done first.

**Files:**
- Create: `app/insurance/new.tsx`

- [ ] **Step 1: Create app/insurance/new.tsx**

```tsx
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { useActiveProfile } from '@/state/activeProfile';
import { createInsurance } from '@/db/insurance';
import { FormField } from '@/components/FormField';
import { DateField } from '@/components/DateField';
import { ScanButton } from '@/components/ScanButton';
import { scheduleForInsurance } from '@/notifications/scheduler';
import { usePro } from '@/purchases/usePro';
import type { InsuranceScanResult } from '@/lib/ai-scan';

const INSURANCE_TYPES = ['Malpractice', 'General Liability', 'Health/Benefits', 'Other'];

export default function NewInsurance() {
  const router = useRouter();
  const isPro = usePro();
  const { activeProfileId } = useActiveProfile();

  const [insuranceType, setInsuranceType] = useState('');
  const [carrier, setCarrier] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [coverageLimit, setCoverageLimit] = useState('');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [notes, setNotes] = useState('');
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

  const applyScannedFields = (result: InsuranceScanResult, imageUri: string) => {
    if (result.insuranceType) setInsuranceType(result.insuranceType);
    if (result.carrier) setCarrier(result.carrier);
    if (result.policyNumber) setPolicyNumber(result.policyNumber);
    if (result.effectiveDate) setEffectiveDate(result.effectiveDate);
    if (result.expirationDate) setExpirationDate(result.expirationDate);
    if (result.coverageLimit) setCoverageLimit(result.coverageLimit);
    if (result.premiumAmount) setPremiumAmount(result.premiumAmount);
    setPendingImageUri(imageUri);
  };

  const save = async () => {
    if (!activeProfileId) return;
    if (!insuranceType) return Alert.alert('Insurance type is required');

    const policy = createInsurance({
      profile_id: activeProfileId,
      insurance_type: insuranceType,
      carrier: carrier || null,
      policy_number: policyNumber || null,
      effective_date: effectiveDate,
      expiration_date: expirationDate,
      coverage_limit: coverageLimit || null,
      premium_amount: premiumAmount || null,
      auto_renew: autoRenew,
      notes: notes || null,
      document_uri: null,
    });

    if (pendingImageUri) {
      await new Promise<void>((resolve) => {
        Alert.alert(
          'Attach document?',
          'Save the scanned image with this policy?',
          [
            {
              text: 'Yes',
              onPress: async () => {
                try {
                  const dir = `${FileSystem.documentDirectory}insurance/${policy.id}/`;
                  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
                  const dest = `${dir}doc.jpg`;
                  await FileSystem.copyAsync({ from: pendingImageUri, to: dest });
                  const { updateInsurance } = require('@/db/insurance');
                  updateInsurance(policy.id, { document_uri: dest });
                } catch {
                  // best-effort
                }
                resolve();
              },
            },
            { text: 'No', onPress: () => resolve() },
          ]
        );
      });
    }

    await scheduleForInsurance(policy, isPro);
    router.back();
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">New Insurance Policy</Text>

      <ScanButton
        type="insurance"
        onResult={(result, uri) => applyScannedFields(result as InsuranceScanResult, uri)}
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">Insurance Type *</Text>
      <View className="border border-gray-300 rounded-lg mb-3 overflow-hidden">
        {INSURANCE_TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setInsuranceType(t)}
            className={`p-3 border-b border-gray-100 ${insuranceType === t ? 'bg-blue-50' : ''}`}
          >
            <Text className={insuranceType === t ? 'text-blue-600 font-semibold' : 'text-gray-800'}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <FormField label="Carrier / Insurer" value={carrier} onChangeText={setCarrier} placeholder="e.g. The Doctors Company" />
      <FormField label="Policy Number" value={policyNumber} onChangeText={setPolicyNumber} />
      <DateField label="Effective Date" value={effectiveDate} onChange={setEffectiveDate} />
      <DateField label="Expiration Date" value={expirationDate} onChange={setExpirationDate} />
      <FormField label="Coverage Limit" value={coverageLimit} onChangeText={setCoverageLimit} placeholder="e.g. 1000000" keyboardType="numeric" />
      <FormField label="Annual Premium" value={premiumAmount} onChangeText={setPremiumAmount} placeholder="e.g. 1200" keyboardType="numeric" />

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-medium text-gray-700">Auto Renew</Text>
        <Switch value={autoRenew} onValueChange={setAutoRenew} />
      </View>

      <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />

      {pendingImageUri ? (
        <Text className="text-xs text-blue-600 mb-2">📎 Document scanned — will prompt to attach on save</Text>
      ) : null}

      <Pressable onPress={save} className="bg-blue-600 py-3 rounded-lg items-center mt-2">
        <Text className="text-white font-semibold text-base">Save Policy</Text>
      </Pressable>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add app/insurance/new.tsx && git commit -m "feat: add new insurance form with AI scan + document attachment"
```

---

## Task 10: Insurance Detail Screen

**Files:**
- Create: `app/insurance/[id].tsx`

- [ ] **Step 1: Create app/insurance/[id].tsx**

```tsx
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { getInsurance, deleteInsurance, type InsurancePolicy } from '@/db/insurance';
import { cancelForInsurance } from '@/notifications/scheduler';
import { calculateStatus } from '@/domain/status';
import { StatusBadge } from '@/components/StatusBadge';
import { getSetting } from '@/db/settings';
import { authenticate } from '@/lib/biometrics';

export default function InsuranceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [policy, setPolicy] = useState<InsurancePolicy | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (id) setPolicy(getInsurance(id));
    }, [id])
  );

  if (!policy) return null;

  const status = calculateStatus(policy.expiration_date);

  const onDelete = async () => {
    const bioEnabled = getSetting('biometrics_enabled') === 'true';
    if (bioEnabled) {
      const ok = await authenticate('Confirm delete insurance policy');
      if (!ok) {
        Alert.alert('Authentication required');
        return;
      }
    }
    Alert.alert('Delete policy?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await cancelForInsurance(policy.id);
          if (policy.document_uri) {
            try { await FileSystem.deleteAsync(policy.document_uri, { idempotent: true }); } catch {}
          }
          deleteInsurance(policy.id);
          router.back();
        },
      },
    ]);
  };

  const viewDocument = () => {
    if (policy.document_uri) Linking.openURL(policy.document_uri);
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-2xl font-bold flex-1 pr-2">{policy.insurance_type}</Text>
        <StatusBadge status={status} />
      </View>

      {policy.carrier ? <Text className="text-gray-600">{policy.carrier}</Text> : null}
      {policy.policy_number ? <Text className="text-gray-500 mt-1">Policy #{policy.policy_number}</Text> : null}
      {policy.effective_date ? <Text className="text-gray-700 mt-2">Effective: {policy.effective_date}</Text> : null}
      {policy.expiration_date ? <Text className="text-gray-700">Expires: {policy.expiration_date}</Text> : null}
      {policy.coverage_limit ? <Text className="text-gray-700 mt-1">Coverage: ${policy.coverage_limit}</Text> : null}
      {policy.premium_amount ? <Text className="text-gray-700">Premium: ${policy.premium_amount}/yr</Text> : null}
      {policy.auto_renew ? <Text className="text-green-600 mt-1">Auto-renew: On</Text> : null}
      {policy.notes ? <Text className="text-gray-700 mt-3">{policy.notes}</Text> : null}

      {policy.document_uri ? (
        <Pressable onPress={viewDocument} className="mt-3">
          <Text className="text-blue-600">📄 View Document</Text>
        </Pressable>
      ) : null}

      <View className="flex-row gap-3 mt-6">
        <Pressable
          onPress={() => router.push(`/insurance/${policy.id}/edit`)}
          className="flex-1 bg-gray-200 py-2 rounded-lg items-center"
        >
          <Text className="font-semibold">Edit</Text>
        </Pressable>
        <Pressable onPress={onDelete} className="flex-1 bg-red-600 py-2 rounded-lg items-center">
          <Text className="text-white font-semibold">Delete</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add "app/insurance/[id].tsx" && git commit -m "feat: add insurance detail screen"
```

---

## Task 11: Insurance Edit Screen

**Files:**
- Create: `app/insurance/[id]/edit.tsx`

- [ ] **Step 1: Create app/insurance/[id]/edit.tsx**

```tsx
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { getInsurance, updateInsurance } from '@/db/insurance';
import { FormField } from '@/components/FormField';
import { DateField } from '@/components/DateField';
import { ScanButton } from '@/components/ScanButton';
import { rescheduleForInsurance } from '@/notifications/scheduler';
import { usePro } from '@/purchases/usePro';
import type { InsuranceScanResult } from '@/lib/ai-scan';

const INSURANCE_TYPES = ['Malpractice', 'General Liability', 'Health/Benefits', 'Other'];

export default function EditInsurance() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isPro = usePro();

  const [insuranceType, setInsuranceType] = useState('');
  const [carrier, setCarrier] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [coverageLimit, setCoverageLimit] = useState('');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [notes, setNotes] = useState('');
  const [existingDocUri, setExistingDocUri] = useState<string | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const p = getInsurance(id);
    if (!p) return;
    setInsuranceType(p.insurance_type);
    setCarrier(p.carrier ?? '');
    setPolicyNumber(p.policy_number ?? '');
    setEffectiveDate(p.effective_date);
    setExpirationDate(p.expiration_date);
    setCoverageLimit(p.coverage_limit ?? '');
    setPremiumAmount(p.premium_amount ?? '');
    setAutoRenew(p.auto_renew);
    setNotes(p.notes ?? '');
    setExistingDocUri(p.document_uri);
  }, [id]);

  const applyScannedFields = (result: InsuranceScanResult, imageUri: string) => {
    if (result.insuranceType) setInsuranceType(result.insuranceType);
    if (result.carrier) setCarrier(result.carrier);
    if (result.policyNumber) setPolicyNumber(result.policyNumber);
    if (result.effectiveDate) setEffectiveDate(result.effectiveDate);
    if (result.expirationDate) setExpirationDate(result.expirationDate);
    if (result.coverageLimit) setCoverageLimit(result.coverageLimit);
    if (result.premiumAmount) setPremiumAmount(result.premiumAmount);
    setPendingImageUri(imageUri);
  };

  const save = async () => {
    if (!id) return;
    if (!insuranceType) return Alert.alert('Insurance type is required');

    let newDocUri = existingDocUri;

    if (pendingImageUri) {
      await new Promise<void>((resolve) => {
        Alert.alert(
          'Attach document?',
          'Replace the document with the newly scanned image?',
          [
            {
              text: 'Yes',
              onPress: async () => {
                try {
                  const dir = `${FileSystem.documentDirectory}insurance/${id}/`;
                  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
                  const dest = `${dir}doc.jpg`;
                  await FileSystem.copyAsync({ from: pendingImageUri, to: dest });
                  newDocUri = dest;
                } catch {}
                resolve();
              },
            },
            { text: 'No', onPress: () => resolve() },
          ]
        );
      });
    }

    const updated = updateInsurance(id, {
      insurance_type: insuranceType,
      carrier: carrier || null,
      policy_number: policyNumber || null,
      effective_date: effectiveDate,
      expiration_date: expirationDate,
      coverage_limit: coverageLimit || null,
      premium_amount: premiumAmount || null,
      auto_renew: autoRenew,
      notes: notes || null,
      document_uri: newDocUri,
    });

    if (updated) await rescheduleForInsurance(updated, isPro);
    router.back();
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">Edit Insurance Policy</Text>

      <ScanButton
        type="insurance"
        onResult={(result, uri) => applyScannedFields(result as InsuranceScanResult, uri)}
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">Insurance Type *</Text>
      <View className="border border-gray-300 rounded-lg mb-3 overflow-hidden">
        {INSURANCE_TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setInsuranceType(t)}
            className={`p-3 border-b border-gray-100 ${insuranceType === t ? 'bg-blue-50' : ''}`}
          >
            <Text className={insuranceType === t ? 'text-blue-600 font-semibold' : 'text-gray-800'}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <FormField label="Carrier / Insurer" value={carrier} onChangeText={setCarrier} />
      <FormField label="Policy Number" value={policyNumber} onChangeText={setPolicyNumber} />
      <DateField label="Effective Date" value={effectiveDate} onChange={setEffectiveDate} />
      <DateField label="Expiration Date" value={expirationDate} onChange={setExpirationDate} />
      <FormField label="Coverage Limit" value={coverageLimit} onChangeText={setCoverageLimit} keyboardType="numeric" />
      <FormField label="Annual Premium" value={premiumAmount} onChangeText={setPremiumAmount} keyboardType="numeric" />

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-medium text-gray-700">Auto Renew</Text>
        <Switch value={autoRenew} onValueChange={setAutoRenew} />
      </View>

      <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />

      {existingDocUri && !pendingImageUri ? (
        <Text className="text-xs text-gray-500 mb-2">📎 Document attached</Text>
      ) : null}
      {pendingImageUri ? (
        <Text className="text-xs text-blue-600 mb-2">📎 New document scanned — will prompt to attach on save</Text>
      ) : null}

      <Pressable onPress={save} className="bg-blue-600 py-3 rounded-lg items-center mt-2">
        <Text className="text-white font-semibold text-base">Save</Text>
      </Pressable>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add "app/insurance/[id]/edit.tsx" && git commit -m "feat: add insurance edit screen"
```

---

## Task 12: Insurance Notifications

**Files:**
- Modify: `src/notifications/scheduler.ts`

- [ ] **Step 1: Add InsurancePolicy import to the top of scheduler.ts**

Open `src/notifications/scheduler.ts` and add this import at the **top of the file**, alongside the existing imports:

```ts
import type { InsurancePolicy } from '../db/insurance';
```

- [ ] **Step 2: Append insurance notification functions to scheduler.ts**

After the existing `rescheduleForCredential` function, append:

```ts

export async function scheduleForInsurance(
  p: Pick<InsurancePolicy, 'id' | 'insurance_type' | 'expiration_date'>,
  isPro: boolean
): Promise<void> {
  if (!p.expiration_date) return;
  const exp = parseISO(p.expiration_date);
  const now = new Date();
  let scheduled = 0;
  for (const d of reminderDays(isPro)) {
    const fireAt = subDays(exp, d);
    if (fireAt.getTime() <= now.getTime()) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${p.insurance_type} policy renewal reminder`,
        body: d === 0 ? 'Expires today.' : `Expires in ${d} days.`,
        data: { insuranceId: p.id },
      },
      trigger: { type: 'date', date: fireAt } as any,
    });
    scheduled++;
  }
  if (scheduled === 0 && exp.getTime() > now.getTime()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${p.insurance_type} policy renewal reminder`,
        body: 'Expires today.',
        data: { insuranceId: p.id },
      },
      trigger: { type: 'date', date: exp } as any,
    });
  }
}

export async function cancelForInsurance(insuranceId: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if ((n as any)?.content?.data?.insuranceId === insuranceId) {
      await Notifications.cancelScheduledNotificationAsync((n as any).identifier);
    }
  }
}

export async function rescheduleForInsurance(
  p: Pick<InsurancePolicy, 'id' | 'insurance_type' | 'expiration_date'>,
  isPro: boolean
): Promise<void> {
  await cancelForInsurance(p.id);
  await scheduleForInsurance(p, isPro);
}
```

- [ ] **Step 3: Typecheck**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run all tests to confirm nothing broken**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add src/notifications/scheduler.ts && git commit -m "feat: add insurance notification scheduling"
```

---

## Task 13: AI Scan on Credential/New and CE/New

**Files:**
- Modify: `app/credential/new.tsx`
- Modify: `app/credential/[id]/ce/new.tsx`

- [ ] **Step 1: Add ScanButton to app/credential/new.tsx**

Replace the contents of `app/credential/new.tsx`:

```tsx
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useActiveProfile } from '@/state/activeProfile';
import { createCredential, countCredentialsForProfile } from '@/db/credentials';
import { FormField } from '@/components/FormField';
import { DateField } from '@/components/DateField';
import { ScanButton } from '@/components/ScanButton';
import { usePro } from '@/purchases/usePro';
import { FREE_LIMITS } from '@/constants/limits';
import { scheduleForCredential } from '@/notifications/scheduler';
import type { CredentialScanResult } from '@/lib/ai-scan';

export default function NewCredential() {
  const router = useRouter();
  const { activeProfileId } = useActiveProfile();
  const isPro = usePro();
  const [name, setName] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [credNum, setCredNum] = useState('');
  const [issueDate, setIssueDate] = useState<string | null>(null);
  const [expDate, setExpDate] = useState<string | null>(null);
  const [renewalUrl, setRenewalUrl] = useState('');
  const [notes, setNotes] = useState('');

  const applyScannedFields = (result: CredentialScanResult) => {
    if (result.name) setName(result.name);
    if (result.issuingBody) setIssuingBody(result.issuingBody);
    if (result.credentialNumber) setCredNum(result.credentialNumber);
    if (result.issueDate) setIssueDate(result.issueDate);
    if (result.expirationDate) setExpDate(result.expirationDate);
    if (result.renewalUrl) setRenewalUrl(result.renewalUrl);
  };

  const save = async () => {
    if (!activeProfileId) return;
    if (!name.trim()) return Alert.alert('Name is required');
    if (!isPro && countCredentialsForProfile(activeProfileId) >= FREE_LIMITS.MAX_CREDENTIALS) {
      return router.push('/paywall');
    }
    const c = createCredential({
      profile_id: activeProfileId,
      name: name.trim(),
      issuing_body: issuingBody || null,
      credential_number: credNum || null,
      issue_date: issueDate,
      expiration_date: expDate,
      renewal_url: renewalUrl || null,
      notes: notes || null,
    });
    await scheduleForCredential(c, isPro);
    router.back();
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">New Credential</Text>
      <ScanButton
        type="credential"
        onResult={(result) => applyScannedFields(result as CredentialScanResult)}
      />
      <FormField label="Name *" value={name} onChangeText={setName} placeholder="e.g. RN License" />
      <FormField label="Issuing Body" value={issuingBody} onChangeText={setIssuingBody} />
      <FormField label="Credential Number" value={credNum} onChangeText={setCredNum} />
      <DateField label="Issue Date" value={issueDate} onChange={setIssueDate} />
      <DateField label="Expiration Date" value={expDate} onChange={setExpDate} />
      <FormField label="Renewal URL" value={renewalUrl} onChangeText={setRenewalUrl} keyboardType="url" />
      <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />
      <Pressable onPress={save} className="bg-blue-600 py-3 rounded-lg items-center mt-2">
        <Text className="text-white font-semibold text-base">Save</Text>
      </Pressable>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Read the current CE new screen to get its exact content**

Read `app/credential/[id]/ce/new.tsx` to confirm current content before editing.

- [ ] **Step 3: Add ScanButton to app/credential/[id]/ce/new.tsx**

Read the file first, then add after the imports and at the top of the form (before the first `FormField`), following this pattern:

Add import: `import { ScanButton } from '@/components/ScanButton';`
Add import: `import type { CeScanResult } from '@/lib/ai-scan';`

Add `applyScannedFields` function before `save` (state setter names must match the existing variables: `course`, `org`, `date`, `hours`, `category`, `certNum`):
```tsx
const applyScannedFields = (result: CeScanResult) => {
  if (result.courseName) setCourse(result.courseName);
  if (result.organization) setOrg(result.organization);
  if (result.dateCompleted) setDate(result.dateCompleted);
  if (result.hoursEarned != null) setHours(String(result.hoursEarned));
  if (result.category) setCategory(result.category);
  if (result.certificateNumber) setCertNum(result.certificateNumber);
};
```

Add `<ScanButton>` at the top of the ScrollView content, before the first FormField:
```tsx
<ScanButton
  type="ce"
  onResult={(result) => applyScannedFields(result as CeScanResult)}
/>
```

- [ ] **Step 4: Typecheck**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add app/credential/new.tsx "app/credential/[id]/ce/new.tsx" && git commit -m "feat: add AI scan to credential and CE new forms"
```

---

## Task 14: Lock Screen

**Files:**
- Create: `app/lock.tsx`

- [ ] **Step 1: Create app/lock.tsx**

```tsx
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticate } from '@/lib/biometrics';

type Props = {
  onUnlock: () => void;
};

export default function LockScreen({ onUnlock }: Props) {
  const [authenticating, setAuthenticating] = useState(false);

  const tryAuth = async () => {
    setAuthenticating(true);
    try {
      const ok = await authenticate('Unlock Credential Tracker');
      if (ok) {
        onUnlock();
      } else {
        Alert.alert('Authentication failed', 'Tap "Unlock" to try again.');
      }
    } finally {
      setAuthenticating(false);
    }
  };

  useEffect(() => {
    tryAuth();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center p-8">
      <Text className="text-3xl font-bold text-gray-900 mb-2">Credential Tracker</Text>
      <Text className="text-gray-500 mb-12">Your credentials are locked.</Text>

      {authenticating ? (
        <ActivityIndicator size="large" color="#2563EB" />
      ) : (
        <Pressable
          onPress={tryAuth}
          className="bg-blue-600 px-8 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold text-base">🔒 Unlock</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add app/lock.tsx && git commit -m "feat: add biometric lock screen"
```

---

## Task 15: App Layout Biometric Integration

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Replace app/_layout.tsx with biometric lock integration**

```tsx
import { useEffect, useRef, useState } from 'react';
import { AppState, Appearance, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { runMigrations } from '@/db/migrations';
import { getDb } from '@/db/client';
import { initRevenueCat } from '@/purchases/revenuecat';
import { getSetting, setSetting } from '@/db/settings';
import { isBiometricAvailable } from '@/lib/biometrics';
import LockScreen from './lock';
import '../global.css';

runMigrations(getDb());

function applyStoredTheme() {
  const t = getSetting('theme');
  if (t === 'light' || t === 'dark') {
    Appearance.setColorScheme(t);
  } else {
    Appearance.setColorScheme(null);
  }
}

async function recordSqliteDirExists() {
  if (getSetting('backup_excluded') === 'true') return;
  try {
    const sqliteDir = `${FileSystem.documentDirectory}SQLite`;
    const info = await FileSystem.getInfoAsync(sqliteDir);
    if (info.exists) setSetting('backup_excluded', 'true');
  } catch {}
}

export default function RootLayout() {
  const router = useRouter();
  const [locked, setLocked] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    applyStoredTheme();
    recordSqliteDirExists();
    initRevenueCat();

    (async () => {
      const bioEnabled = getSetting('biometrics_enabled') === 'true';
      if (bioEnabled && (await isBiometricAvailable())) {
        setLocked(true);
      }
    })();

    const notifSub = Notifications.addNotificationResponseReceivedListener((res) => {
      const id = res.notification.request.content.data?.credentialId as string | undefined;
      if (id) router.push(`/credential/${id}`);
    });

    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active') {
        const bgAt = backgroundedAt.current;
        if (bgAt && Date.now() - bgAt >= 60_000) {
          const bioEnabled = getSetting('biometrics_enabled') === 'true';
          if (bioEnabled) {
            isBiometricAvailable().then((available) => {
              if (available) setLocked(true);
            });
          }
        }
        backgroundedAt.current = null;
      }
    });

    return () => {
      notifSub.remove();
      appStateSub.remove();
    };
  }, [router]);

  if (locked) {
    return (
      <SafeAreaProvider>
        <LockScreen onUnlock={() => setLocked(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add app/_layout.tsx && git commit -m "feat: add biometric launch lock + AppState re-lock after 60s background"
```

---

## Task 16: Settings — Security + AI Scanning Sections

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Read current settings.tsx**

Read `app/(tabs)/settings.tsx` fully to understand current state before editing.

- [ ] **Step 2: Add imports to settings.tsx**

At the top of `app/(tabs)/settings.tsx`, add these imports after the existing ones:

```tsx
import * as SecureStore from 'expo-secure-store';
import { isBiometricAvailable } from '@/lib/biometrics';
```

- [ ] **Step 3: Add state variables**

Inside the `Settings` component, add these state variables after the existing ones:

```tsx
const [bioAvailable, setBioAvailable] = useState(false);
const [bioEnabled, setBioEnabled] = useState(false);
const [aiBaseUrl, setAiBaseUrl] = useState('');
const [aiModel, setAiModel] = useState('');
const [aiKey, setAiKey] = useState('');
```

- [ ] **Step 4: Load new settings in the existing useEffect**

Inside the existing `useEffect` (the one that loads theme, notifEnabled, profiles), add after `loadProfiles()`:

```tsx
isBiometricAvailable().then((avail) => {
  setBioAvailable(avail);
  setBioEnabled(getSetting('biometrics_enabled') === 'true');
});
setAiBaseUrl(getSetting('ai_base_url') ?? '');
setAiModel(getSetting('ai_model') ?? '');
SecureStore.getItemAsync('ai_api_key').then((k) => setAiKey(k ?? ''));
```

- [ ] **Step 5: Add Security section to the ScrollView**

Inside the `<ScrollView>`, after the `{/* Notifications */}` section and before `{/* Profiles */}`, add:

```tsx
{/* Security */}
{bioAvailable ? (
  <Section title="Security">
    <View className="flex-row items-center justify-between">
      <View className="flex-1 pr-4">
        <Text className="text-base text-slate-900">Require Face ID / Biometrics</Text>
        <Text className="text-xs text-slate-500 mt-0.5">Lock app on launch and before destructive actions</Text>
      </View>
      <Switch
        value={bioEnabled}
        onValueChange={(next) => {
          setBioEnabled(next);
          setSetting('biometrics_enabled', next ? 'true' : 'false');
        }}
      />
    </View>
  </Section>
) : null}

{/* AI Scanning */}
<Section title="AI Scanning">
  <View className="mb-3">
    <Text className="text-xs text-slate-500 mb-2">
      Any OpenAI-compatible endpoint. Common models: gpt-4o, claude-opus-4-8, gemini-2.0-flash
    </Text>
    <Text className="text-sm font-medium text-slate-700 mb-1">Base URL</Text>
    <TextInput
      value={aiBaseUrl}
      onChangeText={setAiBaseUrl}
      onBlur={() => setSetting('ai_base_url', aiBaseUrl || 'https://api.openai.com/v1')}
      placeholder="https://api.openai.com/v1"
      autoCapitalize="none"
      autoCorrect={false}
      className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mb-2"
    />
    <Text className="text-sm font-medium text-slate-700 mb-1">Model</Text>
    <TextInput
      value={aiModel}
      onChangeText={setAiModel}
      onBlur={() => setSetting('ai_model', aiModel)}
      placeholder="gpt-4o"
      autoCapitalize="none"
      autoCorrect={false}
      className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mb-2"
    />
    <Text className="text-sm font-medium text-slate-700 mb-1">API Key</Text>
    <TextInput
      value={aiKey}
      onChangeText={setAiKey}
      onBlur={() => SecureStore.setItemAsync('ai_api_key', aiKey)}
      placeholder="sk-..."
      secureTextEntry
      autoCapitalize="none"
      autoCorrect={false}
      className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white"
    />
  </View>
</Section>
```

- [ ] **Step 6: Add TextInput to imports**

At the top of `app/(tabs)/settings.tsx`, add `TextInput` to the existing `react-native` import:

```tsx
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Appearance,
  TextInput,
} from 'react-native';
```

- [ ] **Step 7: Typecheck**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add "app/(tabs)/settings.tsx" && git commit -m "feat: add Security + AI Scanning sections to Settings"
```

---

## Task 17: Destructive Action Guards

**Files:**
- Modify: `app/credential/[id].tsx`
- Modify: `app/export.tsx`
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Add biometric guard to credential delete in app/credential/[id].tsx**

Add this import at the top:
```tsx
import { authenticate } from '@/lib/biometrics';
import { getSetting } from '@/db/settings';
```

Replace the existing `onDelete` function with:

```tsx
const onDelete = async () => {
  const bioEnabled = getSetting('biometrics_enabled') === 'true';
  if (bioEnabled) {
    const ok = await authenticate('Confirm delete credential');
    if (!ok) {
      Alert.alert('Authentication required');
      return;
    }
  }
  Alert.alert('Delete credential?', 'This will also remove its CE entries from this credential.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      await cancelForCredential(cred.id);
      deleteCredential(cred.id);
      router.back();
    }},
  ]);
};
```

- [ ] **Step 2: Add biometric guard to Export in app/export.tsx**

Read `app/export.tsx` to understand its current structure, then add at the start of the export handler function:

```tsx
import { authenticate } from '@/lib/biometrics';
import { getSetting } from '@/db/settings';
```

At the beginning of the export trigger function (before generating the CSV), add:

```tsx
const bioEnabled = getSetting('biometrics_enabled') === 'true';
if (bioEnabled) {
  const ok = await authenticate('Confirm data export');
  if (!ok) {
    Alert.alert('Authentication required');
    return;
  }
}
```

- [ ] **Step 3: Add biometric guard to Reset Data and Erase Everything in settings.tsx**

In the `confirmReset` function, replace the current `Alert.alert` call to add a biometric check before:

```tsx
const confirmReset = async () => {
  const bioEnabled = getSetting('biometrics_enabled') === 'true';
  if (bioEnabled) {
    const ok = await authenticate('Confirm reset data');
    if (!ok) { Alert.alert('Authentication required'); return; }
  }
  Alert.alert(
    'Reset data?',
    'This deletes every credential and CE course for all profiles. Profiles and settings are kept.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => {
        resetCredentialData();
        Alert.alert('Done', 'Credential and CE data has been cleared.');
      }},
    ]
  );
};
```

In the `confirmErase` function, add the same guard at the top:

```tsx
const confirmErase = async () => {
  const bioEnabled = getSetting('biometrics_enabled') === 'true';
  if (bioEnabled) {
    const ok = await authenticate('Confirm erase everything');
    if (!ok) { Alert.alert('Authentication required'); return; }
  }
  Alert.alert(
    'Erase everything?',
    'This deletes ALL profiles, credentials, CE courses, and settings. The app restarts to onboarding. This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: () => {
        eraseEverything();
        router.replace('/onboarding');
      }},
    ]
  );
};
```

Add `import { authenticate } from '@/lib/biometrics';` to settings.tsx imports (if not already present).

- [ ] **Step 4: Typecheck**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add "app/credential/[id].tsx" app/export.tsx "app/(tabs)/settings.tsx" && git commit -m "feat: add biometric guard to delete, export, and erase actions"
```

---

## Task 18: Dashboard Insurance Summary Cards

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Replace app/(tabs)/index.tsx with insurance cards added**

```tsx
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useActiveProfile } from '@/state/activeProfile';
import { listCredentialsForProfile } from '@/db/credentials';
import { listInsuranceForProfile } from '@/db/insurance';
import { calculateStatus } from '@/domain/status';
import { SummaryCard } from '@/components/SummaryCard';
import { ProfilePicker } from '@/components/ProfilePicker';
import { STATUS_COLORS } from '@/constants/colors';
import { usePro } from '@/purchases/usePro';

export default function Dashboard() {
  const { activeProfileId, hydrate } = useActiveProfile();
  const isPro = usePro();
  const [counts, setCounts] = useState({ total: 0, soon: 0, expiring: 0, expired: 0 });
  const [insuranceCounts, setInsuranceCounts] = useState({ active: 0, expiring: 0 });

  useEffect(() => { hydrate(); }, []);

  useEffect(() => {
    if (!activeProfileId) return;

    const creds = listCredentialsForProfile(activeProfileId);
    const c = { total: creds.length, soon: 0, expiring: 0, expired: 0 };
    creds.forEach((r) => {
      const s = calculateStatus(r.expiration_date);
      if (s === 'expiring-soon') c.soon++;
      else if (s === 'expiring') c.expiring++;
      else if (s === 'expired') c.expired++;
    });
    setCounts(c);

    if (isPro) {
      const policies = listInsuranceForProfile(activeProfileId);
      const ic = { active: 0, expiring: 0 };
      policies.forEach((p) => {
        const s = calculateStatus(p.expiration_date);
        if (s === 'active' || s === 'no-expiration') ic.active++;
        else if (s === 'expiring-soon' || s === 'expiring') ic.expiring++;
      });
      setInsuranceCounts(ic);
    }
  }, [activeProfileId, isPro]);

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4"><ProfilePicker /></View>
      <Text className="text-2xl font-bold px-4">Overview</Text>
      <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 mt-3 mb-1">Credentials</Text>
      <View className="flex-row flex-wrap p-2">
        <SummaryCard label="Total" value={counts.total} color="#3B82F6" />
        <SummaryCard label="Expiring Soon" value={counts.soon} color={STATUS_COLORS['expiring-soon']} />
        <SummaryCard label="Expiring" value={counts.expiring} color={STATUS_COLORS['expiring']} />
        <SummaryCard label="Expired" value={counts.expired} color={STATUS_COLORS['expired']} />
      </View>
      {isPro && (insuranceCounts.active + insuranceCounts.expiring) > 0 ? (
        <>
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 mt-2 mb-1">Insurance</Text>
          <View className="flex-row flex-wrap p-2">
            <SummaryCard label="Active" value={insuranceCounts.active} color="#3B82F6" />
            <SummaryCard label="Expiring" value={insuranceCounts.expiring} color={STATUS_COLORS['expiring-soon']} />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && git add "app/(tabs)/index.tsx" && git commit -m "feat: add insurance summary cards to dashboard"
```

---

## Final Verification

- [ ] **Run full test suite one last time**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Typecheck**

```bash
cd "/Users/juancarlossaldivar/Desktop/JC Hub/Cowork OS/credential-tracker" && npx tsc --noEmit
```

Expected: no errors.
