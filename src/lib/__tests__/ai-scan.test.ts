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
