/**
 * useUserRole — Server-side role check via user_roles table.
 * Supports: super_admin, agency_admin, supervisor, coach
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'super_admin' | 'agency_admin' | 'supervisor' | 'coach';

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
        setRole('coach');
      }
      setLoading(false);
    }
    fetchRole();
  }, []);

  const isAdmin = role === 'super_admin' || role === 'agency_admin' || role === 'supervisor';

  return {
    role,
    loading,
    isAdmin,
    isSuperAdmin: role === 'super_admin',
    isAgencyAdmin: role === 'agency_admin',
    isSupervisor: role === 'supervisor',
  };
}
