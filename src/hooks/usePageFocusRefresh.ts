import { useEffect } from 'react';

export function usePageFocusRefresh(callback: () => void) {
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') callback();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [callback]);
}
