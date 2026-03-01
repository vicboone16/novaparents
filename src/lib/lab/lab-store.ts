/**
 * Behavior Lab™ — localStorage persistence
 * Attempts, XP, streaks, mastery
 */

import type { LabAttemptLocal } from './lab-types';

const STORAGE_KEY = 'bd_lab_attempts';
const MASTERY_KEY = 'bd_lab_mastery';

// ─── Attempts ─────────────────────────────

export function getLocalAttempts(): LabAttemptLocal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveLocalAttempt(attempt: LabAttemptLocal): void {
  const all = getLocalAttempts();
  all.unshift(attempt);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  // Update mastery
  updateMastery(attempt);
}

export function getTotalXp(): number {
  return getLocalAttempts().reduce((sum, a) => sum + a.xp_earned, 0);
}

export function getUniqueGamesCompleted(): number {
  return new Set(getLocalAttempts().map(a => a.game_id)).size;
}

// ─── Streak ───────────────────────────────

export function getStreakDays(): number {
  const attempts = getLocalAttempts();
  if (attempts.length === 0) return 0;

  const uniqueDays = [...new Set(attempts.map(a => a.completed_at.slice(0, 10)))].sort().reverse();
  if (uniqueDays.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffDays = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.abs(diffDays - 1) < 0.1) {
      streak++;
    } else { break; }
  }
  return streak;
}

export function hasActiveStreak(): boolean {
  return getStreakDays() > 0;
}

// ─── Best Score / Attempt Count ───────────

export function getBestScore(gameId: string): number | null {
  const attempts = getLocalAttempts().filter(a => a.game_id === gameId);
  if (attempts.length === 0) return null;
  return Math.max(...attempts.map(a => a.score_percent));
}

export function getGameAttemptCount(gameId: string): number {
  return getLocalAttempts().filter(a => a.game_id === gameId).length;
}

// ─── Mastery ──────────────────────────────

export interface MasteryState {
  [skillKey: string]: number; // 0.0–1.0
}

export function getMastery(): MasteryState {
  try {
    const raw = localStorage.getItem(MASTERY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function updateMastery(attempt: LabAttemptLocal): void {
  const mastery = getMastery();
  for (const tag of attempt.skill_tags) {
    const current = mastery[tag] || 0;
    let delta = 0.01;
    if (attempt.score_percent >= 80) delta = 0.06;
    else if (attempt.score_percent >= 60) delta = 0.03;
    mastery[tag] = Math.min(1.0, current + delta);
  }
  localStorage.setItem(MASTERY_KEY, JSON.stringify(mastery));
}

export function getSkillMastery(tags: string[]): number {
  const mastery = getMastery();
  const values = tags.map(t => mastery[t] || 0).filter(v => v > 0);
  if (values.length === 0) return 0;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100);
}

// ─── Stage Gating ─────────────────────────

export function getAvgScore(minAttempts: number = 8): number {
  const attempts = getLocalAttempts();
  if (attempts.length < minAttempts) return 0;
  const sample = attempts.slice(0, Math.max(minAttempts, attempts.length));
  return Math.round(sample.reduce((s, a) => s + a.score_percent, 0) / sample.length);
}

export function getStreakDaysWithin(withinDays: number): number {
  const attempts = getLocalAttempts();
  const cutoff = new Date(Date.now() - withinDays * 86400000).toISOString().slice(0, 10);
  const recentDays = new Set(
    attempts
      .filter(a => a.completed_at.slice(0, 10) >= cutoff)
      .map(a => a.completed_at.slice(0, 10))
  );
  return recentDays.size;
}

// ─── Daily Drill Rotation ─────────────────

export function getRecentGameIds(days: number): string[] {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  return getLocalAttempts()
    .filter(a => a.completed_at >= cutoff)
    .map(a => a.game_id);
}
