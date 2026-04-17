/**
 * Weekly Snapshots Data Layer — via Nova Core through novatrack-proxy.
 *
 * TABLE / VIEW CONTRACT (Nova Core schema):
 * ─────────────────────────────────────────
 * WRITES → coach_evidence_packets  (base table, writable)
 * READS  → weekly_snapshots        (Postgres VIEW over coach_evidence_packets)
 *
 * The view adds computed/joined columns (e.g. integrity_score, active_seconds,
 * caregiver fields) and may alias student_id ↔ client_id across the join.
 * Both fetchSnapshots() and updateSnapshot() must therefore use the table
 * name that matches their direction:
 *   • proxyQuery insert/update  →  table: 'coach_evidence_packets'
 *   • proxyQuery select         →  table: 'weekly_snapshots'
 *
 * If a newly created snapshot does not appear in the list, the most likely
 * cause is that the view definition changed on Nova Core.  The createSnapshot()
 * function performs a post-write read-back against weekly_snapshots to surface
 * this failure fast.
 *
 * COLUMN NAMING NOTE:
 * Nova Core uses `client_id` in coach_evidence_packets and the view surfaces
 * both `student_id` and `client_id` for compatibility.  mapViewRow() accepts
 * both names; if Nova Core normalises to a single name, remove the fallback.
 */

import { supabase } from '@/integrations/supabase/client';
import { proxyQuery } from '@/lib/dal';

// ─── Types ───────────────────────────────────────────────

export type SnapshotStatus = 'draft' | 'submitted' | 'pending_review' | 'reviewed' | 'returned';

export interface WeeklySnapshot {
  id: string;
  coachUserId: string;
  agencyId?: string | null;
  studentId?: string | null;
  clientId?: string | null;
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

    const data = await proxyQuery({
      table: 'user_agency_access',
      operation: 'select',
      select_columns: 'agency_id, client_id, role',
      eq_filters: [{ col: 'user_id', val: user.id }],
      limit: 1,
      maybe_single: true,
    });

    if (!data) return { isLinked: false };

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

export async function getMyLearners(): Promise<{ clientId: string; agencyId: string; firstName?: string; lastName?: string }[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const accessRows = await proxyQuery({
      table: 'user_student_access',
      operation: 'select',
      select_columns: 'student_id, agency_id',
      eq_filters: [{ col: 'user_id', val: user.id }],
    });

    if (!accessRows?.length) return [];

    const studentIds = accessRows.map((r: any) => r.student_id).filter(Boolean);
    if (studentIds.length === 0) return [];

    const students = await proxyQuery({
      table: 'students',
      operation: 'select',
      select_columns: 'id, first_name, last_name',
      in_filters: [{ col: 'id', vals: studentIds }],
    });

    const studentMap = new Map((students || []).map((s: any) => [s.id, s]));

    return accessRows
      .filter((r: any) => r.student_id)
      .map((r: any) => {
        const s: any = studentMap.get(r.student_id);
        return {
          clientId: r.student_id,
          agencyId: r.agency_id || '',
          firstName: s?.first_name,
          lastName: s?.last_name,
        };
      });
  } catch {
    return [];
  }
}

// ─── READ: Fetch snapshots ──────────────────────────────

export async function fetchSnapshots(studentId?: string): Promise<WeeklySnapshot[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const eq_filters: Array<{ col: string; val: unknown }> = [
      { col: 'coach_user_id', val: user.id },
    ];
    if (studentId) eq_filters.push({ col: 'client_id', val: studentId });

    const data = await proxyQuery({
      table: 'weekly_snapshots',
      operation: 'select',
      eq_filters,
      order: [{ col: 'created_at', ascending: false }],
      limit: 50,
    });

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

// ─── WRITE: Insert snapshot ─────────────────────────────

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

    if (input.agencyId) row.agency_id = input.agencyId;
    if (input.status === 'submitted') row.submitted_at = now;

    const inserted = await proxyQuery({
      table: 'coach_evidence_packets',
      operation: 'insert',
      data: row,
      single: true,
    });

    // Read back through the view to confirm the record is visible to the list.
    // If this returns null, the weekly_snapshots view definition on Nova Core
    // has drifted from coach_evidence_packets and inserts will silently vanish.
    let viewRow = inserted;
    try {
      const fromView = await proxyQuery({
        table: 'weekly_snapshots',
        operation: 'select',
        eq_filters: [{ col: 'id', val: inserted.id }],
        maybe_single: true,
      });
      if (fromView) viewRow = fromView;
      else console.warn('[Snapshots] Post-create read-back returned null — weekly_snapshots view may not include this record. Check Nova Core schema.');
    } catch {
      // Read-back is diagnostic only; don't fail the create if it errors.
    }

    return { success: true, data: mapViewRow(viewRow) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

// ─── UPDATE ─────────────────────────────────────────────

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
      if (updates.status === 'submitted') row.submitted_at = new Date().toISOString();
    }

    await proxyQuery({
      table: 'coach_evidence_packets',
      operation: 'update',
      eq_filters: [{ col: 'id', val: id }],
      data: row,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

// ─── Trend helpers ───────────────────────────────────────

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

export function generatePatternNotes(snapshots: WeeklySnapshot[]): string[] {
  if (snapshots.length === 0) return [];
  const notes: string[] = [];

  if (snapshots.length >= 3) notes.push(`You've created ${snapshots.length} snapshots — great consistency!`);
  const submitted = snapshots.filter(s => s.status === 'submitted' || s.status === 'pending_review');
  if (submitted.length > 0) notes.push(`${submitted.length} snapshot(s) submitted for review.`);
  const returned = snapshots.filter(s => s.status === 'returned');
  if (returned.length > 0) notes.push(`${returned.length} snapshot(s) returned — check feedback from your support team.`);

  return notes.slice(0, 2);
}

// ─── Legacy re-exports ──────────────────────────────────

export type SnapshotStatusLocal = SnapshotStatus;
export function toDisplayStatus(s: string): SnapshotStatus {
  return (s as SnapshotStatus) || 'draft';
}

export function getSnapshotsForUser(_userId: string): WeeklySnapshot[] {
  return [];
}
