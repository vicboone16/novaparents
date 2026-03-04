/**
 * Invite Code DAL — via Nova Core through novatrack-proxy.
 */

import { supabase } from '@/integrations/supabase/client';
import { proxyQuery } from '@/lib/dal';

export interface RedeemResult {
  success: boolean;
  error?: string;
  agency_id?: string;
  client_id?: string;
  role?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: 'You must be logged in to redeem a code.',
  code_not_found: 'Code not found. Please check and try again.',
  code_revoked: 'This code has been revoked.',
  code_expired: 'This code has expired.',
  code_maxed: 'This code has already been used the maximum number of times.',
  already_linked: "You're already linked to this agency.",
};

export async function redeemInviteCode(
  code: string,
  redeemedFrom: 'signup' | 'settings' = 'settings'
): Promise<RedeemResult> {
  const normalizedCode = code.trim().toUpperCase();

  // RPC calls through the proxy
  const { data, error } = await supabase.functions.invoke('novatrack-proxy', {
    body: {
      action: 'rpc',
      rpc_name: 'redeem_invite_code',
      rpc_params: { _code: normalizedCode, _redeemed_from: redeemedFrom },
    },
  });

  if (error) return { success: false, error: error.message };

  const result = (data?.data ?? data) as unknown as RedeemResult;
  if (!result.success && result.error) {
    if (result.error === 'already_linked' && normalizedCode.startsWith('BD-')) {
      result.error = "You're already linked to this learner.";
    } else {
      result.error = ERROR_MESSAGES[result.error] || result.error;
    }
  }

  return result;
}

export interface AgencyAccess {
  id: string;
  agency_id: string;
  client_id: string | null;
  role: string;
  redeemed_at: string;
}

export async function getMyAgencyAccess(): Promise<AgencyAccess[]> {
  try {
    const data = await proxyQuery({
      table: 'user_agency_access',
      operation: 'select',
      select_columns: 'id, agency_id, client_id, role, redeemed_at',
      order: [{ col: 'redeemed_at', ascending: false }],
    });
    return (data as AgencyAccess[]) || [];
  } catch {
    return [];
  }
}
