/**
 * Engagement Tracker
 * ──────────────────
 * Handles session lifecycle, event logging, page view tracking,
 * and heartbeats.
 *
 * PERSISTENCE STRATEGY (two-layer):
 * 1. Local-first  — events are written to localStorage immediately so they
 *    survive page reloads and intermittent connectivity.
 * 2. Server flush — on session end (and every FLUSH_BATCH_SIZE events during
 *    a long session) events are batched and pushed to Nova Core via proxyQuery.
 *    The billing-eligibility score MUST be computed server-side from this data,
 *    not from localStorage, to prevent client-side manipulation.
 *
 *    Target table: coach_engagement_events (Nova Core)
 *    Columns: id, user_id, session_id, event_type, timestamp, meta (jsonb)
 *
 *    If the table does not exist yet on Nova Core the flush fails silently;
 *    local data is preserved and no user-visible error is shown.  Once the
 *    table is provisioned all subsequent sessions will begin flushing.
 */

import type {
  EngagementEvent,
  EngagementEventType,
  EngagementSession,
} from './types';
import { ENGAGEMENT_THRESHOLDS } from './types';

const EVENTS_KEY = 'bd_engagement_events';
const SESSION_KEY = 'bd_engagement_session';
const FLUSHED_KEY = 'bd_engagement_flushed_ids';
const FLUSH_BATCH_SIZE = 50;

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
  // Flush all pending events to Nova Core on session end so the server has
  // accurate data for billing-eligibility scoring.
  flushEventsToServer().catch(() => { /* silent */ });
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

  // Mid-session flush every FLUSH_BATCH_SIZE events so long sessions don't
  // accumulate a huge unsynced backlog.
  const flushed = loadFlushedIds();
  const unflushedCount = events.filter(e => !flushed.has(e.id)).length;
  if (unflushedCount >= FLUSH_BATCH_SIZE) {
    flushEventsToServer().catch(() => { /* silent */ });
  }

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

// ─── Server-side flush ───────────────────────────────────
// Pushes unsynced events to Nova Core so the billing-eligibility score can
// be computed server-side.  This is fire-and-forget; failures never surface
// to the user.

function loadFlushedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(FLUSHED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function markFlushed(ids: string[]) {
  try {
    const existing = loadFlushedIds();
    ids.forEach(id => existing.add(id));
    // Keep the set bounded — only retain the most recent 5000 ids.
    const trimmed = Array.from(existing).slice(-5000);
    localStorage.setItem(FLUSHED_KEY, JSON.stringify(trimmed));
  } catch { /* storage full — continue silently */ }
}

export async function flushEventsToServer(): Promise<void> {
  // Lazy import to avoid a circular dependency at module load time.
  let proxyQuery: typeof import('@/lib/dal').proxyQuery;
  try {
    proxyQuery = (await import('@/lib/dal')).proxyQuery;
  } catch {
    return;
  }

  const events = loadEvents();
  const flushed = loadFlushedIds();
  const pending = events.filter(e => !flushed.has(e.id));

  if (pending.length === 0) return;

  // Batch into groups of FLUSH_BATCH_SIZE to avoid oversized payloads.
  for (let i = 0; i < pending.length; i += FLUSH_BATCH_SIZE) {
    const batch = pending.slice(i, i + FLUSH_BATCH_SIZE);
    const rows = batch.map(e => ({
      id: e.id,
      user_id: e.userId,
      session_id: e.sessionId,
      event_type: e.eventType,
      timestamp: e.timestamp,
      meta: e.meta,
    }));

    try {
      await proxyQuery({
        table: 'coach_engagement_events',
        operation: 'upsert',
        data: rows,
        on_conflict: 'id',
      });
      markFlushed(batch.map(e => e.id));
    } catch {
      // Table may not yet be provisioned on Nova Core — fail silently.
      // Local data is preserved; retry will happen on next session end.
      break;
    }
  }
}
