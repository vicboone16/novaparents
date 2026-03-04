/**
 * useUserRole — Server-side role check via Nova Core user_roles table.
 * Routes through novatrack-proxy.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { proxyQuery } from '@/lib/dal';

export type AppRole = 'super_admin' | 'agency_admin' | 'supervisor' | 'coach';

export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      try {
        const data = await proxyQuery({
          table: 'user_roles',
          operation: 'select',
          eq_filters: [{ col: 'user_id', val: user.id }],
          select_columns: 'role',
          limit: 1,
          maybe_single: true,
        });

        if (data?.role) {
          setRole(data.role as AppRole);
        } else {
          setRole('coach');
        }
      } catch {
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
