/**
 * Behavior Lab™ — localStorage persistence
 */

import type { LabAttemptLocal } from './lab-types';

const STORAGE_KEY = 'bd_lab_attempts';

export function getLocalAttempts(): LabAttemptLocal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalAttempt(attempt: LabAttemptLocal): void {
  const all = getLocalAttempts();
  all.unshift(attempt);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getTotalXp(): number {
  return getLocalAttempts().reduce((sum, a) => sum + a.xp_earned, 0);
}

export function getStreakDays(): number {
  const attempts = getLocalAttempts();
  if (attempts.length === 0) return 0;

  const uniqueDays = [...new Set(attempts.map(a => a.completed_at.slice(0, 10)))].sort().reverse();
  if (uniqueDays.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Must have played today or yesterday to have an active streak
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffDays = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.abs(diffDays - 1) < 0.1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function getBestScore(gameId: string): number | null {
  const attempts = getLocalAttempts().filter(a => a.game_id === gameId);
  if (attempts.length === 0) return null;
  return Math.max(...attempts.map(a => a.score_percent));
}

export function getGameAttemptCount(gameId: string): number {
  return getLocalAttempts().filter(a => a.game_id === gameId).length;
}

export function getSkillMastery(tags: string[]): number {
  const attempts = getLocalAttempts().filter(a =>
    a.skill_tags.some(t => tags.includes(t))
  );
  if (attempts.length === 0) return 0;
  const avg = attempts.reduce((s, a) => s + a.score_percent, 0) / attempts.length;
  return Math.round(avg);
}
