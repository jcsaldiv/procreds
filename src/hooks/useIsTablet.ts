import { useWindowDimensions } from 'react-native';

export const TABLET_MAX_WIDTH = 680;

export function useIsTablet() {
  return useWindowDimensions().width >= 768;
}

export function useTabletStyle() {
  const isTablet = useIsTablet();
  return isTablet
    ? ({ maxWidth: TABLET_MAX_WIDTH, alignSelf: 'center' as const, width: '100%' })
    : undefined;
}
