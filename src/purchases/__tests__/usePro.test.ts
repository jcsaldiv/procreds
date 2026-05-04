import { renderHook, waitFor } from '@testing-library/react-native';
import Purchases from 'react-native-purchases';
import { usePro } from '../usePro';

test('returns true when entitlement active', async () => {
  (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce({ entitlements: { active: { pro: {} } } });
  const { result } = renderHook(() => usePro());
  await waitFor(() => expect(result.current).toBe(true));
});

test('returns false when no entitlement', async () => {
  (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce({ entitlements: { active: {} } });
  const { result } = renderHook(() => usePro());
  await waitFor(() => expect(result.current).toBe(false));
});
