/**
 * Integrity Flags
 * ───────────────
 * Deterministic anomaly detection with severity + reason codes.
 * Flags are generated client-side and stored for agency audit.
 * Coaches NEVER see flag details — only agencies do.
 */

import type { IntegrityFlag, FlagSeverity, FlagReasonCode } from './types';
import { ENGAGEMENT_THRESHOLDS } from './types';
import { getAllEvents } from './tracker';
import { getAllTimings } from './anti-clickthrough';

const FLAGS_KEY = 'bd_integrity_flags';

function loadFlags(): IntegrityFlag[] {
  try { return JSON.parse(localStorage.getItem(FLAGS_KEY) || '[]'); }
  catch { return []; }
}

function persistFlags(flags: IntegrityFlag[]) {
  localStorage.setItem(FLAGS_KEY, JSON.stringify(flags.slice(-500)));
}

function addFlag(
  userId: string,
  sessionId: string,
  severity: FlagSeverity,
  reasonCode: FlagReasonCode,
  reason: string,
  lessonKey: string | null = null,
  meta: Record<string, unknown> = {}
): IntegrityFlag {
  const flag: IntegrityFlag = {
    id: crypto.randomUUID(),
    userId,
    sessionId,
    severity,
    reasonCode,
    reason,
    lessonKey,
    timestamp: new Date().toISOString(),
    meta,
  };
  const flags = loadFlags();
  flags.push(flag);
  persistFlags(flags);
  return flag;
}

// ─── Flag generation (called after lesson completion) ────

export function evaluateLessonCompletion(
  userId: string,
  sessionId: string,
  moduleId: number,
  lessonIdx: number
) {
  const key = `${moduleId}-${lessonIdx}`;
  const timings = getAllTimings();
  const record = timings[key];

  if (!record) return;

  const duration = record.durationSec ?? 0;
  const minTime = ENGAGEMENT_THRESHOLDS.MIN_LESSON_TIME_SEC;

  // Below minimum time (shouldn't happen if enforcement works, but defense-in-depth)
  if (duration < minTime) {
    addFlag(userId, sessionId, 'high', 'BELOW_MIN_TIME',
      `Lesson ${key} completed in ${duration}s (min: ${minTime}s)`, key,
      { durationSec: duration });
  }

  // No interaction recorded
  if (!record.hadInteraction) {
    addFlag(userId, sessionId, 'med', 'NO_INTERACTION',
      `Lesson ${key} completed without any micro-interaction`, key);
  }

  // Rapid completion (close to threshold)
  if (duration > 0 && duration < minTime * 1.5) {
    addFlag(userId, sessionId, 'low', 'RAPID_COMPLETION',
      `Lesson ${key} completed quickly (${duration}s)`, key,
      { durationSec: duration });
  }

  // Burst detection
  const events = getAllEvents();
  const windowMs = ENGAGEMENT_THRESHOLDS.BURST_WINDOW_MIN * 60 * 1000;
  const recent = events.filter(
    e => e.eventType === 'lesson_complete' &&
      e.userId === userId &&
      Date.now() - new Date(e.timestamp).getTime() < windowMs
  );
  if (recent.length >= ENGAGEMENT_THRESHOLDS.BURST_MAX_COMPLETIONS) {
    addFlag(userId, sessionId, 'high', 'BURST_COMPLETIONS',
      `${recent.length} completions within ${ENGAGEMENT_THRESHOLDS.BURST_WINDOW_MIN} min`, null,
      { completionCount: recent.length });
  }
}

// ─── Query helpers (agency-only surfaces) ────────────────

export function getAllFlags(): IntegrityFlag[] {
  return loadFlags();
}

export function getFlagsByUser(userId: string): IntegrityFlag[] {
  return loadFlags().filter(f => f.userId === userId);
}

export function getFlagsBySeverity(severity: FlagSeverity): IntegrityFlag[] {
  return loadFlags().filter(f => f.severity === severity);
}
