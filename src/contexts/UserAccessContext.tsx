/**
 * UserAccessContext
 * ─────────────────
 * Single unified call to check_user_access on login.
 * Provides user identity, roles, agencies, students to the entire app.
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
}

type AccessStatus = 'loading' | 'authenticated' | 'no_access' | 'not_provisioned' | 'unauthenticated' | 'error';

interface UserAccessContextValue {
  data: UserAccessData | null;
  status: AccessStatus;
  error: string | null;
  refresh: () => Promise<void>;
}

const UserAccessCtx = createContext<UserAccessContextValue>({
  data: null,
  status: 'loading',
  error: null,
  refresh: async () => {},
});

export function useUserAccess() {
  return useContext(UserAccessCtx);
}

// ─── Provider ────────────────────────────────────────────

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
        setStatus('not_provisioned');
        setError('No Nova Core profile found for this email.');
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
      };

      setData(accessData);

      if (!accessData.hasAccess) {
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

  useEffect(() => {
    loadAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadAccess();
      } else if (event === 'SIGNED_OUT') {
        setData(null);
        setStatus('unauthenticated');
      }
    });

    return () => subscription.unsubscribe();
  }, [loadAccess]);

  return (
    <UserAccessCtx.Provider value={{ data, status, error, refresh: loadAccess }}>
      {children}
    </UserAccessCtx.Provider>
  );
}
