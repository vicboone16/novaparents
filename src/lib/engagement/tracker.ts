/**
 * Engagement Tracker
 * ──────────────────
 * Handles session lifecycle, event logging, page view tracking,
 * and heartbeats. All data stored in localStorage for Phase 1.
 */

import type {
  EngagementEvent,
  EngagementEventType,
  EngagementSession,
} from './types';
import { ENGAGEMENT_THRESHOLDS } from './types';

const EVENTS_KEY = 'bd_engagement_events';
const SESSION_KEY = 'bd_engagement_session';

// ─── Storage Helpers ─────────────────────────────────────

function loadEvents(): EngagementEvent[] {
  try { return JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]'); }
  catch { return []; }
}

function persistEvents(events: EngagementEvent[]) {
  // Keep last 2000 events to avoid storage bloat
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-2000)));
}

function loadSession(): EngagementSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function persistSession(session: EngagementSession | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

// ─── Current state ───────────────────────────────────────

let currentSession: EngagementSession | null = loadSession();
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

// ─── Public API ──────────────────────────────────────────

export function getSessionId(): string | null {
  return currentSession?.id ?? null;
}

export function startSession(userId: string): EngagementSession {
  // End any existing session
  if (currentSession) endSession();

  const session: EngagementSession = {
    id: crypto.randomUUID(),
    userId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    lastHeartbeat: new Date().toISOString(),
    pagesVisited: [],
  };
  currentSession = session;
  persistSession(session);
  logEvent(userId, 'session_start', {});

  // Start heartbeat
  heartbeatTimer = setInterval(() => {
    if (currentSession) {
      currentSession.lastHeartbeat = new Date().toISOString();
      persistSession(currentSession);
      logEvent(userId, 'heartbeat', {});
    }
  }, ENGAGEMENT_THRESHOLDS.HEARTBEAT_INTERVAL_MS);

  return session;
}

export function endSession() {
  if (!currentSession) return;
  currentSession.endedAt = new Date().toISOString();
  logEvent(currentSession.userId, 'session_end', {
    durationSec: Math.round(
      (Date.now() - new Date(currentSession.startedAt).getTime()) / 1000
    ),
  });
  persistSession(null);
  currentSession = null;
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export function logEvent(
  userId: string,
  eventType: EngagementEventType,
  meta: Record<string, unknown> = {}
): EngagementEvent {
  const event: EngagementEvent = {
    id: crypto.randomUUID(),
    userId,
    eventType,
    timestamp: new Date().toISOString(),
    meta,
    sessionId: currentSession?.id ?? 'no-session',
  };

  const events = loadEvents();
  events.push(event);
  persistEvents(events);

  // Track pages visited in session
  if (eventType === 'page_view' && currentSession) {
    const route = meta.route as string;
    if (route && !currentSession.pagesVisited.includes(route)) {
      currentSession.pagesVisited.push(route);
      persistSession(currentSession);
    }
  }

  return event;
}

export function logPageView(userId: string, route: string) {
  return logEvent(userId, 'page_view', { route });
}

export function logModuleOpen(userId: string, moduleId: number) {
  return logEvent(userId, 'module_open', { moduleId });
}

export function logLessonOpen(userId: string, moduleId: number, lessonIdx: number) {
  return logEvent(userId, 'lesson_open', { moduleId, lessonIdx, lessonKey: `${moduleId}-${lessonIdx}` });
}

export function logLessonComplete(userId: string, moduleId: number, lessonIdx: number) {
  return logEvent(userId, 'lesson_complete', { moduleId, lessonIdx, lessonKey: `${moduleId}-${lessonIdx}` });
}

export function logReflectionSubmitted(userId: string, moduleId: number, lessonIdx: number) {
  return logEvent(userId, 'reflection_submitted', { moduleId, lessonIdx, lessonKey: `${moduleId}-${lessonIdx}` });
}

export function logMicroQuizSubmit(userId: string, moduleId: number, lessonIdx: number) {
  return logEvent(userId, 'micro_quiz_submit', { moduleId, lessonIdx, lessonKey: `${moduleId}-${lessonIdx}` });
}

export function logBehaviorLogCreated(userId: string, logId: string) {
  return logEvent(userId, 'behavior_log_created', { logId });
}

export function logImplementationLogCreated(userId: string, logId: string) {
  return logEvent(userId, 'implementation_log_created', { logId });
}

// ─── Query helpers (for scoring / audit) ─────────────────

export function getAllEvents(): EngagementEvent[] {
  return loadEvents();
}

export function getEventsByUser(userId: string): EngagementEvent[] {
  return loadEvents().filter(e => e.userId === userId);
}

export function getEventsByType(eventType: EngagementEventType): EngagementEvent[] {
  return loadEvents().filter(e => e.eventType === eventType);
}

export function getEventsInWindow(userId: string, windowMs: number): EngagementEvent[] {
  const cutoff = Date.now() - windowMs;
  return loadEvents().filter(
    e => e.userId === userId && new Date(e.timestamp).getTime() >= cutoff
  );
}
