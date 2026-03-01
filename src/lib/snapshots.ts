/**
 * Weekly Snapshots Data Layer
 * ───────────────────────────
 * Writes to: public.coach_evidence_packets
 * Reads from: public.weekly_snapshots (view)
 * 
 * DB column mapping:
 *   student_id  → learner (view exposes as client_id)
 *   coach_user_id → auth.uid()
 */

import { supabase } from '@/integrations/supabase/client';

// ─── Types ───────────────────────────────────────────────

export type SnapshotStatus = 'draft' | 'submitted' | 'pending_review' | 'reviewed' | 'returned';

export interface WeeklySnapshot {
  id: string;
  coachUserId: string;
  agencyId?: string | null;
  studentId?: string | null;   // DB: student_id
  clientId?: string | null;    // view alias for student_id
  title: string;
  description: string;
  status: SnapshotStatus;
  evidenceSummary?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  caregiverName?: string | null;
  caregiverRelationship?: string | null;
  activeSeconds?: number | null;
  completionCount?: number | null;
  integrityScore?: number | null;
  integrityFlags?: Record<string, unknown> | null;
}

export interface AgencyLinkInfo {
  isLinked: boolean;
  agencyId?: string;
  clientId?: string;
  role?: string;
}

// Status display mapping
const STATUS_DISPLAY: Record<string, { label: string; cls: string }> = {
  draft:          { label: 'Saved',          cls: 'bg-muted text-muted-foreground' },
  submitted:      { label: 'Submitted',      cls: 'bg-warning/10 text-warning' },
  pending_review: { label: 'Pending Review', cls: 'bg-warning/10 text-warning' },
  reviewed:       { label: 'Reviewed',       cls: 'bg-success/10 text-success' },
  returned:       { label: 'Returned',       cls: 'bg-secondary/10 text-secondary' },
};

export function getStatusDisplay(status: string) {
  return STATUS_DISPLAY[status] || STATUS_DISPLAY.draft;
}

// ─── Constants ───────────────────────────────────────────

export const FUNCTION_OPTIONS = [
  { value: 'attention', label: 'Attention', alt: 'Social Reinforcement', example: 'Calling out, grabbing, following' },
  { value: 'escape', label: 'Escape / Avoidance', alt: 'Negative Reinforcement', example: 'Running away, refusing, shutting down' },
  { value: 'tangible', label: 'Tangible / Access', alt: 'Getting something', example: 'Grabbing items, screaming for toys, food' },
  { value: 'sensory', label: 'Sensory / Automatic', alt: 'Self-stimulation', example: 'Rocking, hand-flapping, mouthing objects' },
];

export const TRIGGER_OPTIONS = [
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

// ─── Week helpers ────────────────────────────────────────

export function getWeekRange(date: Date = new Date()): { start: string; end: string; label: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (dt: Date) => dt.toISOString().split('T')[0];
  const short = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return { start: fmt(monday), end: fmt(sunday), label: `${short(monday)} – ${short(sunday)}` };
}

export function getRecentWeeks(count = 12): { start: string; end: string; label: string }[] {
  const weeks: ReturnType<typeof getWeekRange>[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    weeks.push(getWeekRange(d));
  }
  return weeks;
}

export function defaultSnapshotTitle(weekLabel: string): string {
  return `Weekly Snapshot — ${weekLabel}`;
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

// ─── Get available learners ──────────────────────────────

export async function getMyLearners(): Promise<{ clientId: string; agencyId: string }[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await (supabase as any)
      .from('user_agency_access')
      .select('client_id, agency_id')
      .eq('user_id', user.id)
      .not('client_id', 'is', null);

    if (error || !data) return [];
    return data.map((r: any) => ({ clientId: r.client_id, agencyId: r.agency_id }));
  } catch {
    return [];
  }
}

// ─── READ: Fetch snapshots from weekly_snapshots view ────

export async function fetchSnapshots(studentId?: string): Promise<WeeklySnapshot[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = (supabase as any)
      .from('weekly_snapshots')
      .select('*')
      .eq('coach_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (studentId) {
      query = query.eq('client_id', studentId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[Snapshots] Read from weekly_snapshots failed:', error.message);
      return [];
    }

    return (data || []).map(mapViewRow);
  } catch (err: any) {
    console.warn('[Snapshots] fetchSnapshots error:', err?.message);
    return [];
  }
}

function mapViewRow(row: any): WeeklySnapshot {
  return {
    id: row.id,
    coachUserId: row.coach_user_id,
    agencyId: row.agency_id,
    studentId: row.student_id || row.client_id,
    clientId: row.client_id || row.student_id,
    title: row.title || '',
    description: row.description || '',
    status: (row.status || 'draft') as SnapshotStatus,
    evidenceSummary: row.evidence_summary,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    caregiverName: row.caregiver_name,
    caregiverRelationship: row.caregiver_relationship,
    activeSeconds: row.active_seconds,
    completionCount: row.completion_count,
    integrityScore: row.integrity_score,
    integrityFlags: row.integrity_flags,
  };
}

// ─── WRITE: Insert snapshot into coach_evidence_packets ──

export interface CreateSnapshotInput {
  agencyId?: string | null;
  studentId: string;
  title: string;
  description?: string;
  evidenceSummary?: string;
  caregiverName?: string;
  caregiverRelationship?: string;
  status: 'draft' | 'submitted';
}

export async function createSnapshot(input: CreateSnapshotInput): Promise<{ success: boolean; data?: WeeklySnapshot; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const now = new Date().toISOString();
    const row: Record<string, unknown> = {
      coach_user_id: user.id,
      student_id: input.studentId,
      title: input.title,
      description: input.description || null,
      evidence_summary: input.evidenceSummary || null,
      status: input.status,
      caregiver_name: input.caregiverName || null,
      caregiver_relationship: input.caregiverRelationship || null,
    };

    if (input.agencyId) {
      row.agency_id = input.agencyId;
    }

    if (input.status === 'submitted') {
      row.submitted_at = now;
    }

    const { data, error } = await (supabase as any)
      .from('coach_evidence_packets')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('[Snapshots] Insert failed:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: mapViewRow(data) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

// ─── UPDATE: Update an existing snapshot ─────────────────

export async function updateSnapshot(
  id: string,
  updates: Partial<Pick<CreateSnapshotInput, 'title' | 'description' | 'evidenceSummary' | 'status'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const row: Record<string, unknown> = {};
    if (updates.title !== undefined) row.title = updates.title;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.evidenceSummary !== undefined) row.evidence_summary = updates.evidenceSummary;
    if (updates.status !== undefined) {
      row.status = updates.status;
      if (updates.status === 'submitted') {
        row.submitted_at = new Date().toISOString();
      }
    }

    const { error } = await (supabase as any)
      .from('coach_evidence_packets')
      .update(row)
      .eq('id', id);

    if (error) {
      console.error('[Snapshots] Update failed:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

// ─── Trend helpers (uses fetched snapshots) ──────────────

export interface SnapshotTrends {
  totalSnapshots: number;
  draftCount: number;
  submittedCount: number;
  reviewedCount: number;
}

export function computeTrends(snapshots: WeeklySnapshot[]): SnapshotTrends | null {
  if (snapshots.length < 1) return null;
  return {
    totalSnapshots: snapshots.length,
    draftCount: snapshots.filter(s => s.status === 'draft').length,
    submittedCount: snapshots.filter(s => s.status === 'submitted' || s.status === 'pending_review').length,
    reviewedCount: snapshots.filter(s => s.status === 'reviewed').length,
  };
}

// ─── Pattern Notes ───────────────────────────────────────

export function generatePatternNotes(snapshots: WeeklySnapshot[]): string[] {
  if (snapshots.length === 0) return [];
  const notes: string[] = [];

  if (snapshots.length >= 3) {
    notes.push(`You've created ${snapshots.length} snapshots — great consistency!`);
  }

  const submitted = snapshots.filter(s => s.status === 'submitted' || s.status === 'pending_review');
  if (submitted.length > 0) {
    notes.push(`${submitted.length} snapshot(s) submitted for review.`);
  }

  const returned = snapshots.filter(s => s.status === 'returned');
  if (returned.length > 0) {
    notes.push(`${returned.length} snapshot(s) returned — check feedback from your support team.`);
  }

  return notes.slice(0, 2);
}

// ─── Legacy re-exports for backward compat ───────────────

/** @deprecated Use SnapshotStatus */
export type SnapshotStatusLocal = SnapshotStatus;
export function toDisplayStatus(s: string): SnapshotStatus {
  return (s as SnapshotStatus) || 'draft';
}

/** @deprecated */
export function getSnapshotsForUser(_userId: string): WeeklySnapshot[] {
  // Now async — this sync version returns empty; use fetchSnapshots instead
  return [];
}
