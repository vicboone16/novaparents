/**
 * Invite Code DAL
 * ───────────────
 * Handles invite code redemption via the redeem_invite_code DB function.
 */

import { supabase } from '@/integrations/supabase/client';

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

  const { data, error } = await (supabase as any).rpc('redeem_invite_code', {
    _code: normalizedCode,
    _redeemed_from: redeemedFrom,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data as unknown as RedeemResult;
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
    const { data, error } = await (supabase as any)
      .from('user_agency_access')
      .select('id, agency_id, client_id, role, redeemed_at')
      .order('redeemed_at', { ascending: false });

    if (error || !data) return [];
    return data as AgencyAccess[];
  } catch {
    return [];
  }
}
