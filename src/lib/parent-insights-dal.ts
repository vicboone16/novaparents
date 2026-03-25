/**
 * Parent Insights DAL
 * ───────────────────
 * Queries Nova Core for parent-facing data:
 * parent_insights, behavior_translations, beacon rewards.
 */

import { proxyQuery } from '@/lib/dal';

// ─── Types ──────────────────────────────────────────────

export interface BehaviorSummaryItem {
  label: string;
  trend: 'improving' | 'worsening' | 'stable';
  count?: number;
}

export interface ParentInsight {
  id: string;
  student_id: string;
  insight_date: string;
  headline: string;
  points_earned: number;
  behavior_summary: BehaviorSummaryItem[];
  what_this_means: string | null;
  what_you_can_do: string[];
  teacher_note: string | null;
  created_at: string;
}

export interface RewardSummary {
  student_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
}

export interface BeaconReward {
  id: string;
  title: string;
  point_cost: number;
  emoji?: string;
}

export interface BehaviorTranslation {
  function_key: string;
  parent_label: string;
  home_strategies: string[];
}

// ─── Fallback translations ──────────────────────────────

const FALLBACK_TRANSLATIONS: Record<string, { meaning: string; strategies: string[] }> = {
  escape: {
    meaning: 'Your child is learning to handle challenging activities with support.',
    strategies: [
      'Offer a short break before asking again',
      'Use a visual timer to show how long the task will take',
      'Praise your child when they try, even if they do not finish',
      'Break big tasks into smaller, manageable steps',
    ],
  },
  attention: {
    meaning: 'Your child is learning to get attention in positive ways.',
    strategies: [
      'Give specific praise when your child waits patiently',
      'Set aside 10 minutes of one-on-one time each day',
      'Catch your child being good and name what you see',
      'Respond calmly to attention-seeking behavior',
    ],
  },
  access: {
    meaning: 'Your child is learning patience and appropriate ways to ask for things.',
    strategies: [
      'Practice "first-then" language: "First homework, then tablet"',
      'Offer choices between two acceptable options',
      'Praise your child when they ask nicely',
      'Use a visual schedule to show when preferred items are available',
    ],
  },
  automatic: {
    meaning: 'Your child uses this behavior for self-regulation.',
    strategies: [
      'Offer a sensory alternative (fidget, stress ball, chewy)',
      'Create a calm-down corner with comforting items',
      'Notice when the behavior increases — it may signal stress',
      'Avoid drawing too much attention to the behavior itself',
    ],
  },
};

// ─── Queries ────────────────────────────────────────────

export async function getTodayInsight(studentId: string): Promise<ParentInsight | null> {
  const today = new Date().toISOString().split('T')[0];
  try {
    const data = await proxyQuery({
      table: 'parent_insights',
      operation: 'select',
      eq_filters: [
        { col: 'student_id', val: studentId },
        { col: 'insight_date', val: today },
      ],
      maybe_single: true,
    });
    return data ?? null;
  } catch {
    return null;
  }
}

export async function getWeekInsights(studentId: string, days = 7): Promise<ParentInsight[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];
  try {
    const data = await proxyQuery({
      table: 'parent_insights',
      operation: 'select',
      eq_filters: [{ col: 'student_id', val: studentId }],
      order: [{ col: 'insight_date', ascending: true }],
      limit: days,
    });
    // Filter client-side since gateway may not support gte filters
    return (data || []).filter((d: ParentInsight) => d.insight_date >= sinceStr);
  } catch {
    return [];
  }
}

export async function getRewardSummary(studentId: string): Promise<RewardSummary | null> {
  try {
    const data = await proxyQuery({
      table: 'v_beacon_student_reward_summary',
      operation: 'select',
      eq_filters: [{ col: 'student_id', val: studentId }],
      maybe_single: true,
    });
    return data ?? null;
  } catch {
    return null;
  }
}

export async function getAvailableRewards(studentId: string): Promise<BeaconReward[]> {
  try {
    const data = await proxyQuery({
      table: 'beacon_rewards',
      operation: 'select',
      eq_filters: [{ col: 'is_active', val: true }],
      order: [{ col: 'point_cost', ascending: true }],
      limit: 20,
    });
    return data || [];
  } catch {
    return [];
  }
}

export async function getBehaviorTranslation(functionKey: string): Promise<{ meaning: string; strategies: string[] }> {
  // Try remote behavior_translations table first
  try {
    const data = await proxyQuery({
      table: 'behavior_translations',
      operation: 'select',
      eq_filters: [{ col: 'function_key', val: functionKey }],
      maybe_single: true,
    });
    if (data) {
      return {
        meaning: data.parent_label || FALLBACK_TRANSLATIONS[functionKey]?.meaning || '',
        strategies: data.home_strategies || FALLBACK_TRANSLATIONS[functionKey]?.strategies || [],
      };
    }
  } catch { /* fall through */ }

  return FALLBACK_TRANSLATIONS[functionKey] || {
    meaning: 'Your child is building new skills every day.',
    strategies: ['Keep doing what you are doing — consistency matters!'],
  };
}

// ─── Seed demo data ─────────────────────────────────────

export async function seedDemoParentInsights(): Promise<{ inserted: number; error?: string }> {
  const today = new Date();
  const rows: Record<string, unknown>[] = [];

  // Generate 7 days of insights for a demo student ID
  // We use a fixed UUID that matches demo data conventions
  const demoStudentId = '00000000-0000-0000-0000-000000000001';

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay();
    const points = Math.round(8 + Math.random() * 12);
    const behaviors: BehaviorSummaryItem[] = [
      { label: 'Following directions', trend: i < 3 ? 'improving' : 'stable' },
      { label: 'Staying on task', trend: i < 2 ? 'improving' : i > 4 ? 'worsening' : 'stable' },
      { label: 'Using kind words', trend: 'improving' },
    ];

    const headlines = [
      `Great start to the week — ${points} points earned! 🌟`,
      `Solid effort today — ${points} points! 💪`,
      `${points} points earned today! Keep it up! 🎉`,
      `A wonderful day — ${points} points! ⭐`,
      `Strong finish — ${points} points today! 🌈`,
      `Nice progress — ${points} points! 🌻`,
      `Another great day — ${points} points! ✨`,
    ];

    rows.push({
      student_id: demoStudentId,
      insight_date: dateStr,
      headline: headlines[dayOfWeek % headlines.length],
      points_earned: points,
      behavior_summary: behaviors,
      what_this_means: FALLBACK_TRANSLATIONS.escape.meaning,
      what_you_can_do: FALLBACK_TRANSLATIONS.escape.strategies,
      teacher_note: i === 0 ? 'Had a wonderful day today! Very proud of the progress.' : null,
    });
  }

  try {
    await proxyQuery({
      table: 'parent_insights',
      operation: 'upsert',
      data: rows,
      on_conflict: 'student_id,insight_date',
    });
    return { inserted: rows.length };
  } catch (err: any) {
    return { inserted: 0, error: err.message };
  }
}
