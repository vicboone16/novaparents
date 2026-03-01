/**
 * Streak Tracking
 * ───────────────
 * Tracks consecutive days with meaningful activity.
 * Activity = completing a module, logging data, using a tool, or playing a lab game.
 */

import { supabase } from '@/integrations/supabase/client';

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
}

/**
 * Get the current user's streak data.
 */
export async function getStreak(userId: string): Promise<UserStreak> {
  const { data, error } = await supabase
    .from('user_streaks')
    .select('current_streak, longest_streak, last_activity_date')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
  }

  return {
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    lastActivityDate: data.last_activity_date,
  };
}

/**
 * Record activity for today. Updates streak accordingly:
 * - Same day: no-op
 * - Next day: streak + 1
 * - Gap > 1 day: streak resets to 1
 */
export async function recordActivity(userId: string): Promise<UserStreak> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Get existing streak
  const { data: existing } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    // First ever activity
    const { data } = await supabase
      .from('user_streaks')
      .insert({
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: today,
      })
      .select()
      .single();

    return { currentStreak: 1, longestStreak: 1, lastActivityDate: today };
  }

  const lastDate = existing.last_activity_date;

  // Same day — no change
  if (lastDate === today) {
    return {
      currentStreak: existing.current_streak,
      longestStreak: existing.longest_streak,
      lastActivityDate: lastDate,
    };
  }

  // Calculate day difference
  const last = new Date(lastDate + 'T00:00:00');
  const now = new Date(today + 'T00:00:00');
  const diffDays = Math.round((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  let newStreak: number;
  if (diffDays === 1) {
    // Consecutive day
    newStreak = existing.current_streak + 1;
  } else {
    // Gap — reset
    newStreak = 1;
  }

  const newLongest = Math.max(existing.longest_streak, newStreak);

  await supabase
    .from('user_streaks')
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_activity_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastActivityDate: today,
  };
}

/**
 * Streak milestone messages.
 * Returns a motivational message if the streak hits a milestone, otherwise null.
 */
const MILESTONES: { days: number; emoji: string; message: string }[] = [
  { days: 3, emoji: '🔥', message: '3-day streak! You\'re building momentum.' },
  { days: 7, emoji: '⭐', message: '7-day streak! A full week of growth — amazing!' },
  { days: 14, emoji: '🏆', message: '14-day streak! Two weeks strong. Your Learner benefits every day you show up.' },
  { days: 21, emoji: '💎', message: '21-day streak! They say it takes 21 days to build a habit. You did it!' },
  { days: 30, emoji: '🌟', message: '30-day streak! A whole month of consistency. You\'re a Confident Coach!' },
  { days: 60, emoji: '🚀', message: '60-day streak! Your dedication is extraordinary.' },
  { days: 100, emoji: '👑', message: '100-day streak! You\'re in the top tier. Incredible commitment!' },
];

export function getStreakMilestone(streak: number): { emoji: string; message: string } | null {
  // Return the highest milestone that matches exactly
  const milestone = MILESTONES.find(m => m.days === streak);
  return milestone ? { emoji: milestone.emoji, message: milestone.message } : null;
}
