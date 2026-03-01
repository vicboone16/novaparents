/**
 * Weekly Snapshots Data Layer
 * ───────────────────────────
 * Local-first storage for weekly snapshots.
 * Agency-linked coaches can also share snapshots to NovaTrack.
 */

import { supabase } from '@/integrations/supabase/client';

// ─── Types ───────────────────────────────────────────────

export type SnapshotStatusLocal = 'saved' | 'shared_pending' | 'reviewed' | 'returned';

/** Display-facing status (maps from status_local) */
export type SnapshotStatus = 'saved' | 'pending_review' | 'reviewed' | 'returned';

export interface WeeklySnapshot {
  id: string;
  userId: string;
  clientId?: string;
  weekStart: string; // ISO date (Monday)
  weekEnd: string;   // ISO date (Sunday)
  createdAt: string;
  statusLocal: SnapshotStatusLocal;

  // Core data
  abcCount: number;
  frequencyTotal: number;
  durationMinutesTotal: number;
  intensityAvg: number;
  topFunctions: string[];
  topTriggers: string[];
  toolsUsed: string[];
  engagementMinutes: number;
  gamesCompleted: number;
  parentNotes: string;

  // Sharing metadata
  sharedAt?: string;
  sharedPacketId?: string | null;
  lastSyncedAt?: string | null;
}

export interface AgencyLinkInfo {
  isLinked: boolean;
  agencyId?: string;
  clientId?: string;
  role?: string;
}

// ─── Status mapping ──────────────────────────────────────

export function toDisplayStatus(s: SnapshotStatusLocal): SnapshotStatus {
  if (s === 'shared_pending') return 'pending_review';
  return s;
}

// ─── Constants ───────────────────────────────────────────

const SNAPSHOTS_KEY = 'bd_weekly_snapshots';

const FUNCTION_OPTIONS = [
  { value: 'attention', label: 'Attention', alt: 'Social Reinforcement', example: 'Calling out, grabbing, following' },
  { value: 'escape', label: 'Escape / Avoidance', alt: 'Negative Reinforcement', example: 'Running away, refusing, shutting down' },
  { value: 'tangible', label: 'Tangible / Access', alt: 'Getting something', example: 'Grabbing items, screaming for toys, food' },
  { value: 'sensory', label: 'Sensory / Automatic', alt: 'Self-stimulation', example: 'Rocking, hand-flapping, mouthing objects' },
];

const TRIGGER_OPTIONS = [
  { value: 'transitions', label: 'Transitions' },
  { value: 'demands', label: 'Demands / Tasks' },
  { value: 'denied_access', label: 'Denied Access' },
  { value: 'attention_loss', label: 'Loss of Attention' },
  { value: 'sensory_overload', label: 'Sensory Overload' },
  { value: 'routine_change', label: 'Routine Change' },
  { value: 'peer_conflict', label: 'Peer Conflict' },
  { value: 'fatigue_hunger', label: 'Fatigue / Hunger' },
  { value: 'unstructured_time', label: 'Unstructured Time' },
  { value: 'other', label: 'Other' },
];

export { FUNCTION_OPTIONS, TRIGGER_OPTIONS };

// ─── Week helpers ────────────────────────────────────────

export function getWeekRange(date: Date = new Date()): { start: string; end: string; label: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (dt: Date) => dt.toISOString().split('T')[0];
  const short = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    start: fmt(monday),
    end: fmt(sunday),
    label: `${short(monday)} – ${short(sunday)}`,
  };
}

export function getRecentWeeks(count: number = 12): { start: string; end: string; label: string }[] {
  const weeks: ReturnType<typeof getWeekRange>[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    weeks.push(getWeekRange(d));
  }
  return weeks;
}

// ─── Storage key ─────────────────────────────────────────

function snapshotKey(userId: string, clientId?: string, weekStart?: string): string {
  return `${userId}:${clientId || 'self'}:${weekStart || ''}`;
}

// ─── Local Storage CRUD ──────────────────────────────────

export function loadSnapshots(): WeeklySnapshot[] {
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveSnapshotsToStorage(snapshots: WeeklySnapshot[]) {
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
}

export function getSnapshotsForUser(userId: string): WeeklySnapshot[] {
  return loadSnapshots()
    .filter(s => s.userId === userId)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

export function saveSnapshot(snapshot: WeeklySnapshot): WeeklySnapshot {
  const all = loadSnapshots();
  const key = snapshotKey(snapshot.userId, snapshot.clientId, snapshot.weekStart);
  // Replace if same composite key, else prepend
  const existingIdx = all.findIndex(
    s => snapshotKey(s.userId, s.clientId, s.weekStart) === key
  );
  if (existingIdx >= 0) {
    all[existingIdx] = snapshot;
  } else {
    all.unshift(snapshot);
  }
  saveSnapshotsToStorage(all);
  return snapshot;
}

// ─── Auto-fill from local logs ───────────────────────────

function loadLocal(key: string): any[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

export function autoFillSnapshot(userId: string, weekStart: string, weekEnd: string): Partial<WeeklySnapshot> {
  const abcLogs = loadLocal('bd_behavior_log').filter((l: any) => l.date >= weekStart && l.date <= weekEnd);
  const freqLogs = loadLocal('bd_frequency_log').filter((l: any) => l.date >= weekStart && l.date <= weekEnd);
  const durLogs = loadLocal('bd_duration_log').filter((l: any) => l.date >= weekStart && l.date <= weekEnd);

  const abcCount = abcLogs.length;
  const frequencyTotal = freqLogs.reduce((s: number, l: any) => s + (l.count || 0), 0);
  const durationMinutesTotal = durLogs.reduce((s: number, l: any) => s + (l.durationMin || 0), 0);

  const intensities = abcLogs.map((l: any) => l.intensity || 3);
  const intensityAvg = intensities.length > 0
    ? Math.round((intensities.reduce((a: number, b: number) => a + b, 0) / intensities.length) * 10) / 10
    : 0;

  // Detect tools used
  const toolsUsed: string[] = [];
  try {
    const engagement = JSON.parse(localStorage.getItem('bd_engagement_events') || '[]');
    const weekEvents = engagement.filter((e: any) => {
      const d = e.timestamp?.split('T')[0];
      return d >= weekStart && d <= weekEnd;
    });
    const toolPages = new Set(weekEvents.filter((e: any) => e.eventType === 'page_view').map((e: any) => e.meta?.route));
    if (toolPages.has('/toolkit')) toolsUsed.push('Coach Toolkit');
    if (toolPages.has('/behavior-lab')) toolsUsed.push('Behavior Lab');
    if (toolPages.has('/academy')) toolsUsed.push('Nova Academy');
    if (toolPages.has('/log')) toolsUsed.push('Data Logging');
  } catch {}

  // Games completed
  let gamesCompleted = 0;
  try {
    const labProgress = JSON.parse(localStorage.getItem('bd_lab_progress') || '{}');
    gamesCompleted = Object.keys(labProgress).length;
  } catch {}

  return {
    abcCount,
    frequencyTotal,
    durationMinutesTotal,
    intensityAvg,
    topFunctions: [],
    topTriggers: [],
    toolsUsed,
    engagementMinutes: 0,
    gamesCompleted,
    parentNotes: '',
  };
}

// ─── Agency Link Check ───────────────────────────────────

export async function checkAgencyLink(): Promise<AgencyLinkInfo> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isLinked: false };

    const { data, error } = await (supabase as any)
      .from('user_agency_access')
      .select('agency_id, client_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (error || !data) return { isLinked: false };

    return {
      isLinked: true,
      agencyId: data.agency_id,
      clientId: data.client_id,
      role: data.role,
    };
  } catch {
    return { isLinked: false };
  }
}

// ─── Share to Backend ────────────────────────────────────

export async function shareSnapshot(snapshot: WeeklySnapshot): Promise<{ success: boolean; error?: string; insertedCount?: number }> {
  try {
    const payload = {
      week_start: snapshot.weekStart,
      week_end: snapshot.weekEnd,
      abc_count: snapshot.abcCount,
      frequency_total: snapshot.frequencyTotal,
      duration_minutes_total: snapshot.durationMinutesTotal,
      intensity_avg: snapshot.intensityAvg,
      top_functions: snapshot.topFunctions,
      top_triggers: snapshot.topTriggers,
      tools_used: snapshot.toolsUsed,
      engagement_minutes: snapshot.engagementMinutes,
      games_completed: snapshot.gamesCompleted,
      parent_notes: snapshot.parentNotes,
      source: 'parent_app',
      status: 'pending',
    };

    const { data, error } = await (supabase as any).rpc('submit_parent_summary_packets', {
      p_client_id: snapshot.clientId,
      p_packets: [payload],
    });

    if (error) {
      console.warn('[Snapshots] RPC not available:', error.message);
      return { success: false, error: error.message };
    }

    // data may contain inserted count or packet ids
    const insertedCount = typeof data === 'number' ? data : (data?.inserted_count ?? 1);
    return { success: true, insertedCount };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

// ─── Trend helpers ───────────────────────────────────────

export interface SnapshotTrends {
  freqTrend: number[];
  intensityTrend: number[];
  durationTrend: number[];
  topFunction: string | null;
}

export function computeTrends(snapshots: WeeklySnapshot[]): SnapshotTrends | null {
  const recent = snapshots.slice(0, 8);
  if (recent.length < 2) return null;

  const freqTrend = recent.map(s => s.frequencyTotal);
  const intensityTrend = recent.map(s => s.intensityAvg);
  const durationTrend = recent.map(s => s.durationMinutesTotal);

  // Count functions
  const funcCounts: Record<string, number> = {};
  recent.forEach(s => s.topFunctions.forEach(f => { funcCounts[f] = (funcCounts[f] || 0) + 1; }));
  const topFunction = Object.entries(funcCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return { freqTrend, intensityTrend, durationTrend, topFunction };
}

// ─── Pattern Notes ───────────────────────────────────────

export function generatePatternNotes(snapshots: WeeklySnapshot[]): string[] {
  if (snapshots.length === 0) return [];
  const notes: string[] = [];
  const latest = snapshots[0];

  // Check triggers
  if (latest.topTriggers.includes('transitions')) {
    notes.push('Transitions showed up often this week.');
  }

  // Check function trends
  if (snapshots.length >= 2) {
    const prev = snapshots[1];
    if (latest.topFunctions.includes('escape') && !prev.topFunctions.includes('escape')) {
      notes.push('Escape patterns increased this week.');
    }
    if (latest.frequencyTotal > prev.frequencyTotal * 1.3) {
      notes.push('Frequency increased compared to last week.');
    }
    if (latest.intensityAvg < prev.intensityAvg && latest.intensityAvg > 0) {
      notes.push('Average intensity decreased — progress!');
    }
    if (latest.durationMinutesTotal > prev.durationMinutesTotal * 1.3 && latest.durationMinutesTotal > 0) {
      notes.push('Duration increased compared to last week.');
    }
  }

  if (latest.topTriggers.includes('demands')) {
    notes.push('Demand-related triggers were common.');
  }

  if (latest.topTriggers.includes('routine_change')) {
    notes.push('Routine changes may have contributed to behaviors this week.');
  }

  return notes.slice(0, 2);
}
