/**
 * useUserRole — Now powered by unified UserAccessContext.
 */

import { useUserAccess } from '@/contexts/UserAccessContext';

export type AppRole = 'super_admin' | 'agency_admin' | 'supervisor' | 'coach';

export function useUserRole() {
  const { data, status } = useUserAccess();

  const role = (data?.appRole as AppRole) || (data?.roles?.[0] as AppRole) || null;
  const loading = status === 'loading';
  const isAdmin = data?.isAdmin === true;

  return {
    role,
    loading,
    isAdmin,
    isSuperAdmin: data?.isSuperAdmin === true,
    isAgencyAdmin: role === 'agency_admin',
    isSupervisor: role === 'supervisor',
  };
}
