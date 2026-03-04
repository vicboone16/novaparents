/**
 * Profile Data Access Layer
 * Manages user display names via Nova Core profiles table.
 */

import { proxyQuery } from '@/lib/dal';

export async function getDisplayName(userId: string): Promise<string | null> {
  try {
    const data = await proxyQuery({
      table: 'profiles',
      operation: 'select',
      eq_filters: [{ col: 'user_id', val: userId }],
      select_columns: 'display_name',
      maybe_single: true,
    });
    return data?.display_name || null;
  } catch {
    return null;
  }
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const trimmed = displayName.trim().slice(0, 100);
  await proxyQuery({
    table: 'profiles',
    operation: 'upsert',
    data: { user_id: userId, display_name: trimmed, updated_at: new Date().toISOString() },
    on_conflict: 'user_id',
    single: true,
  });
}
