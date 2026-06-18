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

function parseJsonFromContent(content: string): ScanResult {
  try {
    const match = content.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  } catch {
    return {};
  }
}

async function scanWithAnthropic(
  base64: string,
  type: ScanType,
  baseUrl: string,
  model: string,
  apiKey: string
): Promise<ScanResult> {
  const res = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      system: PROMPTS[type],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
            },
            { type: 'text', text: 'Extract the fields as described.' },
          ],
        },
      ],
    }),
  });

  if (!res.ok) throw 'SCAN_FAILED';
  const data = (await res.json()) as any;
  const content: string = data?.content?.[0]?.text ?? '{}';
  return parseJsonFromContent(content);
}

async function scanWithOpenAI(
  base64: string,
  type: ScanType,
  baseUrl: string,
  model: string,
  apiKey: string
): Promise<ScanResult> {
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
  return parseJsonFromContent(content);
}

export async function scanDocument(imageUri: string, type: ScanType): Promise<ScanResult> {
  const apiKey = await SecureStore.getItemAsync('ai_api_key');
  if (!apiKey) throw 'NO_KEY';

  const provider = getSetting('ai_provider') ?? 'chatgpt';
  const baseUrl = getSetting('ai_base_url') ?? 'https://api.openai.com/v1';
  const model = getSetting('ai_model') ?? 'gpt-4o';

  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (provider === 'claude') {
    return scanWithAnthropic(base64, type, baseUrl, model, apiKey);
  }
  return scanWithOpenAI(base64, type, baseUrl, model, apiKey);
}
