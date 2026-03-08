/**
 * Invite Code DAL — via Nova Core satellite-gateway.
 */

import { proxyQuery } from '@/lib/dal';

// Use callGateway indirectly through proxyRpc for RPC calls
import { proxyRpc } from '@/lib/dal';

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

  try {
    const result = await proxyRpc('redeem_invite_code', {
      _code: normalizedCode,
      _redeemed_from: redeemedFrom,
    });

    const parsed = (result?.data ?? result) as unknown as RedeemResult;
    if (!parsed.success && parsed.error) {
      if (parsed.error === 'already_linked' && normalizedCode.startsWith('BD-')) {
        parsed.error = "You're already linked to this learner.";
      } else {
        parsed.error = ERROR_MESSAGES[parsed.error] || parsed.error;
      }
    }

    return parsed;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
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
