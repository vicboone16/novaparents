/**
 * Anti-Click-Through Enforcement
 * ───────────────────────────────
 * Deterministic rules that prevent coaches from clicking through
 * lessons without genuine engagement.
 */

import type { LessonTimingRecord } from './types';
import { ENGAGEMENT_THRESHOLDS } from './types';
import { getAllEvents } from './tracker';

const TIMING_KEY = 'bd_lesson_timing';

// ─── Timing storage ─────────────────────────────────────

function loadTimings(): Record<string, LessonTimingRecord> {
  try { return JSON.parse(localStorage.getItem(TIMING_KEY) || '{}'); }
  catch { return {}; }
}

function persistTimings(t: Record<string, LessonTimingRecord>) {
  localStorage.setItem(TIMING_KEY, JSON.stringify(t));
}

// ─── Public API ──────────────────────────────────────────

/** Call when a coach opens a lesson */
export function recordLessonOpen(moduleId: number, lessonIdx: number) {
  const key = `${moduleId}-${lessonIdx}`;
  const timings = loadTimings();
  // Only set openedAt if not already open (prevent reset by re-renders)
  if (!timings[key] || timings[key].completedAt) {
    timings[key] = {
      key,
      openedAt: new Date().toISOString(),
      completedAt: null,
      durationSec: null,
      hadInteraction: false,
    };
  }
  persistTimings(timings);
}

/** Call when a micro-interaction occurs (reflection typed, quiz answered) */
export function recordInteraction(moduleId: number, lessonIdx: number) {
  const key = `${moduleId}-${lessonIdx}`;
  const timings = loadTimings();
  if (timings[key]) {
    timings[key].hadInteraction = true;
    persistTimings(timings);
  }
}

/**
 * Check if a lesson can be completed. Returns { allowed, reason? }
 */
export function canCompleteLesson(moduleId: number, lessonIdx: number): {
  allowed: boolean;
  reason?: string;
  remainingSec?: number;
} {
  const key = `${moduleId}-${lessonIdx}`;
  const timings = loadTimings();
  const record = timings[key];

  if (!record) {
    return { allowed: false, reason: 'Lesson not opened yet.' };
  }

  // 1. Minimum time check
  const elapsedSec = Math.round(
    (Date.now() - new Date(record.openedAt).getTime()) / 1000
  );
  const minTime = ENGAGEMENT_THRESHOLDS.MIN_LESSON_TIME_SEC;
  if (elapsedSec < minTime) {
    return {
      allowed: false,
      reason: `Please spend at least ${minTime} seconds on this lesson before completing.`,
      remainingSec: minTime - elapsedSec,
    };
  }

  // 2. Micro-interaction requirement
  if (!record.hadInteraction) {
    return {
      allowed: false,
      reason: 'Please complete at least one reflection or interaction before marking complete.',
    };
  }

  // 3. Burst/rapid completion rate limiting
  const events = getAllEvents();
  const windowMs = ENGAGEMENT_THRESHOLDS.BURST_WINDOW_MIN * 60 * 1000;
  const recentCompletions = events.filter(
    e =>
      e.eventType === 'lesson_complete' &&
      Date.now() - new Date(e.timestamp).getTime() < windowMs
  );
  if (recentCompletions.length >= ENGAGEMENT_THRESHOLDS.BURST_MAX_COMPLETIONS) {
    return {
      allowed: false,
      reason: `You've completed ${recentCompletions.length} lessons in the last ${ENGAGEMENT_THRESHOLDS.BURST_WINDOW_MIN} minutes. Please take a break before continuing.`,
    };
  }

  return { allowed: true };
}

/** Record successful completion */
export function recordLessonComplete(moduleId: number, lessonIdx: number) {
  const key = `${moduleId}-${lessonIdx}`;
  const timings = loadTimings();
  if (timings[key]) {
    timings[key].completedAt = new Date().toISOString();
    timings[key].durationSec = Math.round(
      (Date.now() - new Date(timings[key].openedAt).getTime()) / 1000
    );
    persistTimings(timings);
  }
}

/** Get all timing records (for audit) */
export function getAllTimings(): Record<string, LessonTimingRecord> {
  return loadTimings();
}
