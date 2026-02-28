/**
 * Coach Engagement Audit + Integrity System — Types
 * ──────────────────────────────────────────────────
 * Agency-facing engagement tracking, anti-click-through rules,
 * and integrity scoring for Behavior Decoded™ Caregiver Training.
 *
 * Terminology:  Coach = parent/caregiver   Learner = client
 */

// ─── Event Types ─────────────────────────────────────────

export type EngagementEventType =
  | 'session_start'
  | 'session_end'
  | 'heartbeat'
  | 'page_view'
  | 'module_open'
  | 'lesson_open'
  | 'lesson_complete'
  | 'lesson_completed'
  | 'reflection_submitted'
  | 'micro_quiz_submit'
  | 'behavior_log_created'
  | 'implementation_log_created';

export interface EngagementEvent {
  id: string;
  userId: string;
  eventType: EngagementEventType;
  /** ISO timestamp */
  timestamp: string;
  /** Additional context (route, moduleId, lessonIdx, etc.) */
  meta: Record<string, unknown>;
  /** Current session id */
  sessionId: string;
}

// ─── Session ─────────────────────────────────────────────

export interface EngagementSession {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  lastHeartbeat: string;
  pagesVisited: string[];
}

// ─── Anti-Click-Through ──────────────────────────────────

export interface LessonTimingRecord {
  /** "moduleId-lessonIdx" */
  key: string;
  openedAt: string;
  completedAt: string | null;
  /** Seconds spent before completion */
  durationSec: number | null;
  /** Whether at least one micro-interaction occurred */
  hadInteraction: boolean;
}

// ─── Integrity Flags ─────────────────────────────────────

export type FlagSeverity = 'low' | 'med' | 'high';

export type FlagReasonCode =
  | 'RAPID_COMPLETION'
  | 'NO_INTERACTION'
  | 'BELOW_MIN_TIME'
  | 'BURST_COMPLETIONS'
  | 'SESSION_TOO_SHORT';

export interface IntegrityFlag {
  id: string;
  userId: string;
  sessionId: string;
  severity: FlagSeverity;
  reasonCode: FlagReasonCode;
  reason: string;
  lessonKey: string | null;
  timestamp: string;
  meta: Record<string, unknown>;
}

// ─── Scoring ─────────────────────────────────────────────

export interface ScoringRubric {
  /** Category weight (sums to 1.0) */
  weight: number;
  label: string;
  description: string;
}

export interface CoachScore {
  userId: string;
  /** 0–100 */
  totalScore: number;
  breakdown: {
    category: string;
    score: number;
    maxScore: number;
    weight: number;
  }[];
  /** Whether this coach meets billing eligibility threshold */
  billingEligible: boolean;
  computedAt: string;
}

// ─── Thresholds (deterministic config) ───────────────────

export const ENGAGEMENT_THRESHOLDS = {
  /** Minimum seconds on a lesson before completion is allowed */
  MIN_LESSON_TIME_SEC: 60,
  /** Max completions allowed within a rolling window */
  BURST_WINDOW_MIN: 10,
  BURST_MAX_COMPLETIONS: 3,
  /** Heartbeat interval in ms */
  HEARTBEAT_INTERVAL_MS: 30_000,
  /** Minimum score for billing eligibility (0-100) */
  BILLING_ELIGIBILITY_THRESHOLD: 60,
} as const;
