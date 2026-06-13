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
