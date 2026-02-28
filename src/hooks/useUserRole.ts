/**
 * useUserRole — Server-side role check via user_roles table.
 * Never trust client storage for authorization.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'agency_admin' | 'coach';

export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (data?.role) {
        setRole(data.role as AppRole);
      } else {
        // Default: coach (parent) role
        setRole('coach');
      }
      setLoading(false);
    }
    fetchRole();
  }, []);

  return { role, loading, isAgencyAdmin: role === 'agency_admin' };
}
