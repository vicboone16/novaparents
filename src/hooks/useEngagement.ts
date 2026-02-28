/**
 * useEngagement — Hook for automatic session + page view tracking.
 * Mount once in AppLayout. Handles session lifecycle and route changes.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  startSession,
  endSession,
  logPageView,
  getSessionId,
} from '@/lib/engagement';
import { getCurrentUser } from '@/lib/dal';

export function useEngagement() {
  const location = useLocation();
  const userIdRef = useRef<string | null>(null);

  // Start session on mount, end on unmount
  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) {
        userIdRef.current = user.id;
        if (!getSessionId()) {
          startSession(user.id);
        }
      }
    });

    const handleBeforeUnload = () => endSession();
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      endSession();
    };
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (userIdRef.current) {
      logPageView(userIdRef.current, location.pathname);
    }
  }, [location.pathname]);

  return { userId: userIdRef.current };
}
