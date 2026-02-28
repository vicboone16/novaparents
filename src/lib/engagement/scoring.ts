/**
 * Coach Engagement Scoring
 * ────────────────────────
 * Transparent, deterministic rubric-based scoring.
 * Billing eligibility is purely deterministic (no AI).
 * Future: adaptive weighting + AI summaries layered on top.
 */

import type { CoachScore, ScoringRubric } from './types';
import { ENGAGEMENT_THRESHOLDS } from './types';
import { getAllEvents } from './tracker';
import { getAllTimings } from './anti-clickthrough';
import { getFlagsByUser } from './integrity';

// ─── Rubric Definition ───────────────────────────────────

const RUBRIC: ScoringRubric[] = [
  { weight: 0.30, label: 'Lesson Completion', description: 'Percentage of available lessons completed with genuine engagement.' },
  { weight: 0.20, label: 'Time Investment', description: 'Average time spent per lesson relative to minimum threshold.' },
  { weight: 0.20, label: 'Reflections & Interactions', description: 'Micro-interactions submitted (reflections, quizzes).' },
  { weight: 0.15, label: 'Behavior Logging', description: 'Behavior and implementation logs created.' },
  { weight: 0.15, label: 'Integrity', description: 'Absence of integrity flags reduces score.' },
];

export function getRubric(): ScoringRubric[] {
  return [...RUBRIC];
}

// ─── Scoring Engine ──────────────────────────────────────

export function computeCoachScore(userId: string, totalLessons: number): CoachScore {
  const events = getAllEvents().filter(e => e.userId === userId);
  const timings = getAllTimings();
  const flags = getFlagsByUser(userId);

  // 1. Lesson Completion (0-100)
  const completions = events.filter(e => e.eventType === 'lesson_complete');
  const uniqueCompletions = new Set(completions.map(e => e.meta.lessonKey as string));
  const completionPct = totalLessons > 0
    ? Math.min(100, (uniqueCompletions.size / totalLessons) * 100)
    : 0;

  // 2. Time Investment (0-100)
  const completedTimings = Object.values(timings).filter(t => t.completedAt && t.durationSec);
  const avgTime = completedTimings.length > 0
    ? completedTimings.reduce((s, t) => s + (t.durationSec ?? 0), 0) / completedTimings.length
    : 0;
  const minTime = ENGAGEMENT_THRESHOLDS.MIN_LESSON_TIME_SEC;
  // Score based on how much above minimum (2x min = 100)
  const timeScore = Math.min(100, (avgTime / (minTime * 2)) * 100);

  // 3. Reflections & Interactions (0-100)
  const interactions = events.filter(
    e => e.eventType === 'reflection_submitted' || e.eventType === 'micro_quiz_submit'
  );
  // Score: ratio of interactions to completions
  const interactionRatio = uniqueCompletions.size > 0
    ? interactions.length / uniqueCompletions.size
    : 0;
  const interactionScore = Math.min(100, interactionRatio * 100);

  // 4. Behavior Logging (0-100)
  const behaviorLogs = events.filter(
    e => e.eventType === 'behavior_log_created' || e.eventType === 'implementation_log_created'
  );
  // 10+ logs = full score
  const loggingScore = Math.min(100, (behaviorLogs.length / 10) * 100);

  // 5. Integrity (0-100, deductions for flags)
  const highFlags = flags.filter(f => f.severity === 'high').length;
  const medFlags = flags.filter(f => f.severity === 'med').length;
  const lowFlags = flags.filter(f => f.severity === 'low').length;
  const deduction = (highFlags * 25) + (medFlags * 10) + (lowFlags * 3);
  const integrityScore = Math.max(0, 100 - deduction);

  const categoryScores = [completionPct, timeScore, interactionScore, loggingScore, integrityScore];

  const breakdown = RUBRIC.map((r, i) => ({
    category: r.label,
    score: Math.round(categoryScores[i]),
    maxScore: 100,
    weight: r.weight,
  }));

  const totalScore = Math.round(
    breakdown.reduce((sum, b) => sum + b.score * b.weight, 0)
  );

  return {
    userId,
    totalScore,
    breakdown,
    billingEligible: totalScore >= ENGAGEMENT_THRESHOLDS.BILLING_ELIGIBILITY_THRESHOLD,
    computedAt: new Date().toISOString(),
  };
}
