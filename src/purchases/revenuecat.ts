import Purchases, { type CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';

// RevenueCat product IDs:
//   - one-time:    pro_lifetime
//   - entitlement: pro
const IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? '';

let initialized = false;
export function initRevenueCat() {
  if (initialized) return;
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) return;
  Purchases.configure({ apiKey });
  initialized = true;
}

export const ENTITLEMENT_ID = 'pro';

export async function fetchCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

export async function isProActive(): Promise<boolean> {
  const info = await fetchCustomerInfo();
  return Boolean(info.entitlements.active[ENTITLEMENT_ID]);
}

export async function getLifetimePackage(): Promise<any | null> {
  const offerings = await Purchases.getOfferings();
  const packages = offerings?.current?.availablePackages ?? [];
  return packages.find((p: any) =>
    p.packageType === 'LIFETIME' || p.product?.identifier === 'pro_lifetime'
  ) ?? packages[0] ?? null;
}

export async function purchasePackageAndCheck(pkg: any): Promise<boolean> {
  const res = await Purchases.purchasePackage(pkg);
  return Boolean(res.customerInfo.entitlements.active[ENTITLEMENT_ID]);
}

export async function restoreAndCheck(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  return Boolean(info.entitlements.active[ENTITLEMENT_ID]);
}
