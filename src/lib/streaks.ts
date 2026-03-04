/**
 * Streak Tracking — via Nova Core through novatrack-proxy.
 */

import { proxyQuery } from '@/lib/dal';

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
}

export async function getStreak(userId: string): Promise<UserStreak> {
  try {
    const data = await proxyQuery({
      table: 'user_streaks',
      operation: 'select',
      eq_filters: [{ col: 'user_id', val: userId }],
      select_columns: 'current_streak, longest_streak, last_activity_date',
      maybe_single: true,
    });

    if (!data) return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };

    return {
      currentStreak: data.current_streak,
      longestStreak: data.longest_streak,
      lastActivityDate: data.last_activity_date,
    };
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
  }
}

export async function recordActivity(userId: string): Promise<UserStreak> {
  const today = new Date().toISOString().split('T')[0];

  const existing = await proxyQuery({
    table: 'user_streaks',
    operation: 'select',
    eq_filters: [{ col: 'user_id', val: userId }],
    maybe_single: true,
  });

  if (!existing) {
    await proxyQuery({
      table: 'user_streaks',
      operation: 'insert',
      data: { user_id: userId, current_streak: 1, longest_streak: 1, last_activity_date: today },
      single: true,
    });
    return { currentStreak: 1, longestStreak: 1, lastActivityDate: today };
  }

  const lastDate = existing.last_activity_date;
  if (lastDate === today) {
    return { currentStreak: existing.current_streak, longestStreak: existing.longest_streak, lastActivityDate: lastDate };
  }

  const last = new Date(lastDate + 'T00:00:00');
  const now = new Date(today + 'T00:00:00');
  const diffDays = Math.round((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  const newStreak = diffDays === 1 ? existing.current_streak + 1 : 1;
  const newLongest = Math.max(existing.longest_streak, newStreak);

  await proxyQuery({
    table: 'user_streaks',
    operation: 'update',
    eq_filters: [{ col: 'user_id', val: userId }],
    data: { current_streak: newStreak, longest_streak: newLongest, last_activity_date: today, updated_at: new Date().toISOString() },
  });

  return { currentStreak: newStreak, longestStreak: newLongest, lastActivityDate: today };
}

// ─── Streak Recovery ─────────────────────────────────────

export const STREAK_RECOVERY_COST = 50;

export interface StreakRecoveryStatus {
  canRecover: boolean;
  previousStreak: number;
  cost: number;
}

export function checkStreakRecovery(streak: UserStreak, totalXp: number): StreakRecoveryStatus {
  if (!streak.lastActivityDate || streak.currentStreak > 0) {
    return { canRecover: false, previousStreak: 0, cost: STREAK_RECOVERY_COST };
  }

  const last = new Date(streak.lastActivityDate + 'T00:00:00');
  const today = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00');
  const diffDays = Math.round((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 2 && totalXp >= STREAK_RECOVERY_COST) {
    return { canRecover: true, previousStreak: streak.longestStreak, cost: STREAK_RECOVERY_COST };
  }

  return { canRecover: false, previousStreak: 0, cost: STREAK_RECOVERY_COST };
}

export async function recoverStreak(userId: string): Promise<UserStreak> {
  const today = new Date().toISOString().split('T')[0];

  const existing = await proxyQuery({
    table: 'user_streaks',
    operation: 'select',
    eq_filters: [{ col: 'user_id', val: userId }],
    maybe_single: true,
  });

  if (!existing) throw new Error('No streak data found');

  const restoredStreak = existing.current_streak + 1;
  const newLongest = Math.max(existing.longest_streak, restoredStreak);

  await proxyQuery({
    table: 'user_streaks',
    operation: 'update',
    eq_filters: [{ col: 'user_id', val: userId }],
    data: { current_streak: restoredStreak, longest_streak: newLongest, last_activity_date: today, updated_at: new Date().toISOString() },
  });

  // Deduct XP from academy progress
  const progressRows = await proxyQuery({
    table: 'academy_module_progress',
    operation: 'select',
    eq_filters: [{ col: 'user_id', val: userId }],
    order: [{ col: 'completed_at', ascending: false }],
    limit: 10,
  });

  let remaining = STREAK_RECOVERY_COST;
  if (progressRows) {
    for (const row of progressRows) {
      if (remaining <= 0) break;
      const deduct = Math.min(remaining, row.xp_earned || 0);
      if (deduct > 0) {
        await proxyQuery({
          table: 'academy_module_progress',
          operation: 'update',
          eq_filters: [{ col: 'id', val: row.id }],
          data: { xp_earned: (row.xp_earned || 0) - deduct },
        });
        remaining -= deduct;
      }
    }
  }

  return { currentStreak: restoredStreak, longestStreak: newLongest, lastActivityDate: today };
}

// ─── Milestone messages ──────────────────────────────────

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
  const milestone = MILESTONES.find(m => m.days === streak);
  return milestone ? { emoji: milestone.emoji, message: milestone.message } : null;
}
