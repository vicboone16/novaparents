/**
 * UserAccessContext
 * ─────────────────
 * Single unified call to check_user_access on login.
 * Provides user identity, roles, agencies, students to the entire app.
 * Supports "independent mode" for parents without a Nova Core profile.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { callNovaTrackProxy } from '@/lib/dal';

// ─── Types ───────────────────────────────────────────────

export interface AgencyInfo {
  agency_id: string;
  role: string;
}

export interface StudentInfo {
  id: string;
  first_name: string;
  last_name: string;
}

export interface UserAccessData {
  userId: string;
  email: string;
  displayName: string | null;
  roles: string[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  hasAccess: boolean;
  appRole: string | null;
  agencies: AgencyInfo[];
  students: StudentInfo[];
  visibleStudentIds: string[];
  appSlug: string;
  isIndependent: boolean;
}

type AccessStatus = 'loading' | 'authenticated' | 'no_access' | 'not_provisioned' | 'unauthenticated' | 'error';

interface UserAccessContextValue {
  data: UserAccessData | null;
  status: AccessStatus;
  error: string | null;
  refresh: () => Promise<void>;
  continueAsIndependent: () => void;
}

const UserAccessCtx = createContext<UserAccessContextValue>({
  data: null,
  status: 'loading',
  error: null,
  refresh: async () => {},
  continueAsIndependent: () => {},
});

export function useUserAccess() {
  return useContext(UserAccessCtx);
}

// ─── Provider ────────────────────────────────────────────

const INDEPENDENT_KEY = 'bd_independent_mode';
const DEMO_EMAIL_PATTERN = /^demo-.*@behaviordecoded\.app$/;

export function UserAccessProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<UserAccessData | null>(null);
  const [status, setStatus] = useState<AccessStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const loadAccess = useCallback(async () => {
    try {
      setStatus('loading');
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus('unauthenticated');
        setData(null);
        return;
      }

      const result = await callNovaTrackProxy('check_user_access', {
        app_slug: 'behavior_decoded',
      });

      if (result?.error === 'user_not_provisioned') {
        const userEmail = user.email ?? '';
        const isDemoUser = DEMO_EMAIL_PATTERN.test(userEmail);
        const savedIndependent = localStorage.getItem(INDEPENDENT_KEY);
        if (savedIndependent === user.id || isDemoUser) {
          if (isDemoUser) localStorage.setItem(INDEPENDENT_KEY, user.id);
          setData(buildIndependentData(user.id, userEmail));
          setStatus('authenticated');
          return;
        }
        setStatus('not_provisioned');
        setError('No profile found for this email.');
        return;
      }

      if (result?.error) {
        setStatus('error');
        setError(result.error);
        return;
      }

      const accessData: UserAccessData = {
        userId: result.user_id,
        email: result.email,
        displayName: result.display_name || null,
        roles: result.roles || [],
        isSuperAdmin: result.is_super_admin === true,
        isAdmin: result.is_admin === true,
        hasAccess: result.has_access === true,
        appRole: result.app_role || null,
        agencies: result.agencies || [],
        students: result.students || [],
        visibleStudentIds: result.visible_student_ids || [],
        appSlug: result.app_slug || 'behavior_decoded',
        isIndependent: false,
      };

      setData(accessData);

      if (!accessData.hasAccess) {
        const savedIndependent = localStorage.getItem(INDEPENDENT_KEY);
        const isDemoUser = DEMO_EMAIL_PATTERN.test(accessData.email);
        if (savedIndependent === result.user_id || isDemoUser) {
          if (isDemoUser) localStorage.setItem(INDEPENDENT_KEY, result.user_id);
          accessData.isIndependent = true;
          accessData.hasAccess = true;
          setData(accessData);
          setStatus('authenticated');
          return;
        }
        setStatus('no_access');
        setError('Your account does not have access to Behavior Decoded.');
      } else {
        setStatus('authenticated');
      }
    } catch (err: any) {
      console.error('[UserAccessContext] load error:', err);
      setStatus('error');
      setError(err.message || 'Failed to verify access.');
    }
  }, []);

  const continueAsIndependent = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    localStorage.setItem(INDEPENDENT_KEY, user.id);
    setData(buildIndependentData(user.id, user.email ?? ''));
    setStatus('authenticated');
    setError(null);
  }, []);

  useEffect(() => {
    let hasLoadedAccess = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        hasLoadedAccess = false;
        setData(null);
        setStatus('unauthenticated');
        localStorage.removeItem(INDEPENDENT_KEY);
        return;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session) {
          if (!hasLoadedAccess) {
            hasLoadedAccess = true;
            loadAccess();
          }
        } else {
          setStatus('unauthenticated');
          setData(null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [loadAccess]);

  return (
    <UserAccessCtx.Provider value={{ data, status, error, refresh: loadAccess, continueAsIndependent }}>
      {children}
    </UserAccessCtx.Provider>
  );
}

// ─── Helper ──────────────────────────────────────────────

function buildIndependentData(userId: string, email: string): UserAccessData {
  return {
    userId,
    email,
    displayName: null,
    roles: [],
    isSuperAdmin: false,
    isAdmin: false,
    hasAccess: true,
    appRole: 'parent',
    agencies: [],
    students: [],
    visibleStudentIds: [],
    appSlug: 'behavior_decoded',
    isIndependent: true,
  };
}
