# Credential Tracker — Portal Parity Design Spec
**Date:** 2026-06-13  
**Scope:** Bring credential-tracker mobile app (React Native / Expo) to feature parity with portal.jcsynnas.com

---

## Goal

Add three feature sets to the mobile app that exist in the portal:

1. **Insurance section** — full CRUD for insurance policies per profile
2. **AI scanning** — camera/image → OpenAI-compatible AI → auto-fill forms for credentials, CE, and insurance
3. **Biometric lock** — Face ID / fingerprint on app launch and before destructive actions

Admin management and server-side 2FA are intentionally excluded — they don't apply to a local mobile app.

---

## 1. Architecture & Data Layer

### Tab Structure (updated)
Five tabs: `Dashboard` · `Credentials` · `CE` · `Insurance` · `Settings`

### Database — Migration V2

New table: `insurance_policies`

```sql
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
```

`document_uri` is nullable — the user chooses at save time whether to keep the original file locally.

`CURRENT_VERSION` in `src/db/migrations.ts` bumps from 1 → 2.

### New Modules

| Path | Purpose |
|---|---|
| `src/db/insurance.ts` | CRUD for insurance_policies — mirrors pattern of credentials.ts |
| `src/lib/ai-scan.ts` | OpenAI-compatible vision call, returns extracted fields by document type |
| `src/lib/biometrics.ts` | Wraps expo-local-authentication + expo-secure-store helpers |

### New Dependencies

| Package | Purpose |
|---|---|
| `expo-local-authentication` | Face ID / fingerprint |
| `expo-secure-store` | Encrypted storage for AI API key |
| `expo-image-picker` | Camera + photo library access for scanning |

### Reused Without Change
- `calculateStatus()` — drives status badges for insurance expiration
- `StatusBadge` component
- `DateField`, `FormField` components
- Notification scheduler pattern (extended to insurance)

---

## 2. Screens & Navigation

### Insurance Tab

**`app/(tabs)/insurance.tsx`**  
Lists all insurance policies for the active profile, sorted by expiration date ASC. Each row: insurance type, carrier, status badge, expiry date. "+ Add" button top-right. Empty state if none. Tapping a row navigates to detail.

**`app/insurance/new.tsx`**  
Form screen. "Scan Document" button at top — opens camera or photo library, sends to AI, pre-fills fields. Fields: insurance type (required, picker: Malpractice / General Liability / Health/Benefits / Other), carrier, policy number, effective date, expiration date, coverage limit, annual premium, auto-renew toggle, notes. On save: if a document was scanned, prompt "Attach document to this policy?" — Yes copies file to `{documentDirectory}/insurance/{id}/doc.{ext}`, No discards it. `document_uri` stored in DB only if user confirms attachment.

**`app/insurance/[id].tsx`**  
Detail view. Shows all fields, status badge, days until expiry. If `document_uri` set: "View Document" button. Edit / Delete actions. Delete requires biometric confirmation.

**`app/insurance/[id]/edit.tsx`**  
Same form as new, pre-filled. Re-scan option available (overwrites extracted fields, prompts again about attachment).

### AI Scan Added to Existing Screens

**`app/credential/new.tsx`** — "Scan Document" button added above form. Extracts: name, issuing body, credential number, issue date, expiration date, renewal URL.

**`app/credential/[id]/ce/new.tsx`** — "Scan Certificate" button added above form. Extracts: course name, organization, date completed, hours earned, category, certificate number.

### Biometric Lock Screen

**`app/lock.tsx`**  
Full-screen lock. Shows app name + "Unlock with Face ID / Fingerprint" button. Auto-triggers biometric prompt on mount. Blocks all navigation until authenticated. On failure: retry button shown, no auto-dismiss.

### Settings Tab Additions

**Security section** (shown only if device supports biometrics):  
- Toggle: "Require biometrics to unlock app"

**AI Scanning section:**  
- Base URL — text input, default `https://api.openai.com/v1` — saved to SQLite `app_settings` key `ai_base_url`
- Model — text input, placeholder shows common options: `gpt-4o`, `claude-opus-4-8`, `gemini-2.0-flash` — saved to SQLite `app_settings` key `ai_model`
- API Key — masked text input, saved to expo-secure-store key `ai_api_key` (never in SQLite)

### Dashboard Update

Two new summary cards added below credential cards, only when the active profile has ≥1 insurance policy:
- "Insurance Active" — count of policies with status active
- "Insurance Expiring" — count expiring within 90 days

---

## 3. AI Scanning Logic

### `src/lib/ai-scan.ts`

**Interface:**
```ts
type ScanType = 'credential' | 'ce' | 'insurance';

type ScanResult =
  | { name?: string; issuingBody?: string; credentialNumber?: string; issueDate?: string; expirationDate?: string; renewalUrl?: string }         // credential
  | { courseName?: string; organization?: string; dateCompleted?: string; hoursEarned?: number; category?: string; certificateNumber?: string }   // ce
  | { insuranceType?: string; carrier?: string; policyNumber?: string; effectiveDate?: string; expirationDate?: string; coverageLimit?: string; premiumAmount?: string }; // insurance

export async function scanDocument(imageUri: string, type: ScanType): Promise<ScanResult>
```

**Flow:**
1. Read API key from expo-secure-store (`ai_api_key`); read base URL and model name from SQLite `app_settings` (`ai_base_url`, `ai_model`)
2. If no key → throw `'NO_KEY'` (caller shows "Set up AI in Settings")
3. Read image file → base64
4. POST to `{baseUrl}/chat/completions` with `model` from settings, type-specific system prompt, image as `image_url` content part
5. Parse JSON from response content
6. Return partial object — any field AI couldn't extract is `undefined`

**Error handling:** Any network error, bad JSON, or non-2xx response → throw `'SCAN_FAILED'`. Caller shows toast and leaves form blank. Never blocks the user from filling the form manually.

**System prompts:** Each type has a focused prompt asking only for the fields relevant to that document type. Output is always valid JSON matching the return shape.

---

## 4. Biometric Lock Logic

### `src/lib/biometrics.ts`

```ts
export async function isBiometricAvailable(): Promise<boolean>
export async function authenticate(reason: string): Promise<boolean>
```

- `isBiometricAvailable` — returns true if device has enrolled biometrics (Face ID, fingerprint, iris)
- `authenticate` — triggers native prompt with provided reason string; returns true on success, false on cancel/failure

### App Launch Lock

In `app/_layout.tsx`:
- On mount: if `settings.biometrics_enabled === 'true'` and device supports biometrics → render `<LockScreen />` instead of tab navigator
- On successful auth → replace lock screen with tabs
- On `AppState` change to `'active'` after ≥60 seconds in background → re-lock (reset auth state)

### Destructive Action Guard

Thin async wrapper called before:
- Delete credential
- Delete insurance policy
- Export data
- Erase everything

If biometrics enabled and `authenticate()` returns false → cancel action, show Alert "Authentication required."

---

## 5. Notifications Extension

Extend existing scheduler (`src/notifications/scheduler.ts`) with `scheduleForInsurance(policy, isPro)` — mirrors `scheduleForCredential`. Fires at 90 / 60 / 30 / 7 day thresholds before `expiration_date`. Called on create and edit of insurance policies.

---

## 6. Testing

Existing test suite structure extended:
- `src/db/__tests__/insurance.test.ts` — CRUD unit tests (mirrors credentials.test.ts)
- `src/db/__tests__/migrations.test.ts` — updated to assert V2 schema
- `src/lib/__tests__/ai-scan.test.ts` — mock fetch, assert prompt construction and field mapping
- `src/lib/__tests__/biometrics.test.ts` — mock expo-local-authentication, assert available/unavailable paths

---

## 7. What Is NOT Changing

- Pro/paywall gating — insurance follows existing pattern (gated behind Pro, same as CE)
- Export — existing CSV export; insurance policies not included in this phase
- Profile system — insurance is per-profile, same as credentials and CE
- NAS / n8n — mobile app remains fully local, no server sync
