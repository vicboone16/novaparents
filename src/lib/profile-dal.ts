/**
 * Profile Data Access Layer
 * Manages user display names via the profiles table.
 */

import { supabase } from '@/integrations/supabase/client';

/** Get display name for a user, or null if not set. */
export async function getDisplayName(userId: string): Promise<string | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('display_name')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data.display_name || null;
  } catch {
    return null;
  }
}

/** Update (or create) the display name for a user. */
export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const trimmed = displayName.trim().slice(0, 100);
  
  const { error } = await (supabase as any)
    .from('profiles')
    .upsert(
      { user_id: userId, display_name: trimmed, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) throw new Error('Failed to update display name');
}
