import { useEffect, useState } from 'react';
import { isProActive } from './revenuecat';

export function usePro(): boolean {
  const [pro, setPro] = useState(false);
  useEffect(() => {
    let mounted = true;
    isProActive().then((p) => { if (mounted) setPro(p); }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  return pro;
}
