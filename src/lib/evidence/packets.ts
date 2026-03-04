/**
 * Weekly Snapshots
 * ────────────────
 * Bundles lesson completions, quiz scores, reflections, implementation logs,
 * and learner data logs into a single Weekly Snapshot for agency review.
 *
 * All DB operations routed through novatrack-proxy to Nova Core.
 */

import { proxyQuery } from '@/lib/dal';
import { getAllEvents, getAllTimings, getAllFlags, computeCoachScore } from '@/lib/engagement';
import type { EngagementEvent, LessonTimingRecord, IntegrityFlag } from '@/lib/engagement';

// ─── Types ───────────────────────────────────────────────

export type PacketStatus = 'draft' | 'submitted' | 'pending_review' | 'approved' | 'needs_followup' | 'rejected';

/** @deprecated Use WeeklySnapshot terminology in UI. Kept for backward compat. */
export type EvidencePacket = WeeklySnapshot;

export interface WeeklySnapshot {
  id: string;
  userId: string;
  createdAt: string;
  submittedAt: string | null;
  status: PacketStatus;
  feedbackMessage: string | null;
  followupItems: string[];
  lessonsCompleted: string[];
  quizScores: { lessonKey: string; correct: boolean }[];
  reflectionsSubmitted: number;
  behaviorLogsCount: number;
  implementationLogsCount: number;
  frequencyLogsCount: number;
  durationLogsCount: number;
  totalActiveTimeSec: number;
  pagesVisited: string[];
  integrityScore: number;
  billingEligible: boolean;
  flagsSummary: { high: number; med: number; low: number };
}

const TOTAL_LESSONS = 11;

// ─── Build packet from local engagement data ─────────────

export function buildWeeklySnapshot(userId: string): WeeklySnapshot {
  const events = getAllEvents().filter(e => e.userId === userId);
  const timings = getAllTimings();
  const flags = getAllFlags().filter(f => f.userId === userId);
  const score = computeCoachScore(userId, TOTAL_LESSONS);

  const completions = events.filter(e => e.eventType === 'lesson_complete');
  const uniqueCompletions = [...new Set(completions.map(e => e.meta.lessonKey as string))];
  const reflections = events.filter(e => e.eventType === 'reflection_submitted').length;
  const quizEvents = events.filter(e => e.eventType === 'micro_quiz_submit');
  const behaviorLogs = events.filter(e => e.eventType === 'behavior_log_created').length;
  const implLogs = events.filter(e => e.eventType === 'implementation_log_created').length;

  const freqLogs = (() => { try { return JSON.parse(localStorage.getItem('bd_frequency_log') || '[]').length; } catch { return 0; } })();
  const durLogs = (() => { try { return JSON.parse(localStorage.getItem('bd_duration_log') || '[]').length; } catch { return 0; } })();

  const totalTime = Object.values(timings).reduce((s, t) => s + (t.durationSec ?? 0), 0);
  const pages = [...new Set(events.filter(e => e.eventType === 'page_view').map(e => e.meta.route as string))];

  const highFlags = flags.filter(f => f.severity === 'high').length;
  const medFlags = flags.filter(f => f.severity === 'med').length;
  const lowFlags = flags.filter(f => f.severity === 'low').length;

  return {
    id: crypto.randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
    submittedAt: null,
    status: 'draft',
    feedbackMessage: null,
    followupItems: [],
    lessonsCompleted: uniqueCompletions,
    quizScores: quizEvents.map(e => ({ lessonKey: e.meta.lessonKey as string, correct: true })),
    reflectionsSubmitted: reflections,
    behaviorLogsCount: behaviorLogs,
    implementationLogsCount: implLogs,
    frequencyLogsCount: freqLogs,
    durationLogsCount: durLogs,
    totalActiveTimeSec: totalTime,
    pagesVisited: pages,
    integrityScore: score.totalScore,
    billingEligible: score.billingEligible,
    flagsSummary: { high: highFlags, med: medFlags, low: lowFlags },
  };
}

// ─── Submit to backend ───────────────────────────────────

/** @deprecated Use submitWeeklySnapshot */
export const submitEvidencePacket = submitWeeklySnapshot;
/** @deprecated Use buildWeeklySnapshot */
export const buildEvidencePacket = buildWeeklySnapshot;

export async function submitWeeklySnapshot(userId: string): Promise<WeeklySnapshot> {
  const packet = buildWeeklySnapshot(userId);
  packet.status = 'pending_review';
  packet.submittedAt = new Date().toISOString();

  try {
    await proxyQuery({
      table: 'evidence_packets',
      operation: 'insert',
      data: {
        id: packet.id,
        user_id: userId,
        created_at: packet.createdAt,
        submitted_at: packet.submittedAt,
        status: packet.status,
        lessons_completed: packet.lessonsCompleted,
        quiz_scores: packet.quizScores,
        reflections_submitted: packet.reflectionsSubmitted,
        behavior_logs_count: packet.behaviorLogsCount,
        implementation_logs_count: packet.implementationLogsCount,
        frequency_logs_count: packet.frequencyLogsCount,
        duration_logs_count: packet.durationLogsCount,
        total_active_time_sec: packet.totalActiveTimeSec,
        pages_visited: packet.pagesVisited,
        integrity_score: packet.integrityScore,
        billing_eligible: packet.billingEligible,
        flags_summary: packet.flagsSummary,
      },
      single: true,
    });
  } catch (err: any) {
    console.error('[Snapshot] Failed to persist weekly snapshot:', err?.message);
    const local = loadLocalPackets();
    local.unshift(packet);
    saveLocalPackets(local);
  }

  return packet;
}

// ─── Fetch from backend ──────────────────────────────────

export async function getPackets(userId?: string): Promise<WeeklySnapshot[]> {
  try {
    const eq_filters: Array<{ col: string; val: unknown }> = [];
    if (userId) eq_filters.push({ col: 'user_id', val: userId });

    const data = await proxyQuery({
      table: 'evidence_packets',
      operation: 'select',
      eq_filters,
      order: [{ col: 'created_at', ascending: false }],
    });

    if (!data?.length) return loadLocalPackets();
    return (data as any[]).map(mapDbToPacket);
  } catch {
    return loadLocalPackets();
  }
}

export async function getPacketsByStatus(status: PacketStatus): Promise<WeeklySnapshot[]> {
  try {
    const data = await proxyQuery({
      table: 'evidence_packets',
      operation: 'select',
      eq_filters: [{ col: 'status', val: status }],
      order: [{ col: 'created_at', ascending: false }],
    });

    if (!data) return [];
    return (data as any[]).map(mapDbToPacket);
  } catch {
    return [];
  }
}

// ─── Helpers ─────────────────────────────────────────────

function mapDbToPacket(row: any): WeeklySnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    submittedAt: row.submitted_at,
    status: row.status as PacketStatus,
    feedbackMessage: row.feedback_message,
    followupItems: row.followup_items || [],
    lessonsCompleted: row.lessons_completed || [],
    quizScores: row.quiz_scores || [],
    reflectionsSubmitted: row.reflections_submitted || 0,
    behaviorLogsCount: row.behavior_logs_count || 0,
    implementationLogsCount: row.implementation_logs_count || 0,
    frequencyLogsCount: row.frequency_logs_count || 0,
    durationLogsCount: row.duration_logs_count || 0,
    totalActiveTimeSec: row.total_active_time_sec || 0,
    pagesVisited: row.pages_visited || [],
    integrityScore: row.integrity_score || 0,
    billingEligible: row.billing_eligible || false,
    flagsSummary: row.flags_summary || { high: 0, med: 0, low: 0 },
  };
}

const LOCAL_PACKETS_KEY = 'bd_evidence_packets';

function loadLocalPackets(): WeeklySnapshot[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_PACKETS_KEY) || '[]'); }
  catch { return []; }
}

function saveLocalPackets(packets: WeeklySnapshot[]) {
  localStorage.setItem(LOCAL_PACKETS_KEY, JSON.stringify(packets));
}
