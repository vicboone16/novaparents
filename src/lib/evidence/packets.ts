/**
 * Evidence Packets
 * ────────────────
 * Bundles lesson completions, quiz scores, reflections, implementation logs,
 * and learner data logs into a single Evidence Packet for agency review.
 *
 * Phase 2: persists to backend via evidence_packets table.
 */

import { supabase } from '@/integrations/supabase/client';
import { getAllEvents, getAllTimings, getAllFlags, computeCoachScore } from '@/lib/engagement';
import type { EngagementEvent, LessonTimingRecord, IntegrityFlag } from '@/lib/engagement';

// ─── Types ───────────────────────────────────────────────

export type PacketStatus = 'draft' | 'submitted' | 'pending_review' | 'approved' | 'needs_followup' | 'rejected';

export interface EvidencePacket {
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

export function buildEvidencePacket(userId: string): EvidencePacket {
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

export async function submitEvidencePacket(userId: string): Promise<EvidencePacket> {
  const packet = buildEvidencePacket(userId);
  packet.status = 'pending_review';
  packet.submittedAt = new Date().toISOString();

  const { error } = await (supabase as any)
    .from('evidence_packets')
    .insert({
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
    });

  if (error) {
    console.error('[Evidence] Failed to persist packet:', error.message);
    // Fall back to localStorage
    const local = loadLocalPackets();
    local.unshift(packet);
    saveLocalPackets(local);
  }

  return packet;
}

// ─── Fetch from backend ──────────────────────────────────

export async function getPackets(userId?: string): Promise<EvidencePacket[]> {
  try {
    let query = (supabase as any).from('evidence_packets').select('*').order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    
    const { data, error } = await query;
    
    if (error || !data?.length) {
      // Fall back to localStorage
      return loadLocalPackets();
    }

    return (data as any[]).map(mapDbToPacket);
  } catch {
    return loadLocalPackets();
  }
}

export async function getPacketsByStatus(status: PacketStatus): Promise<EvidencePacket[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('evidence_packets')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return (data as any[]).map(mapDbToPacket);
  } catch {
    return [];
  }
}

// ─── Helpers ─────────────────────────────────────────────

function mapDbToPacket(row: any): EvidencePacket {
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

function loadLocalPackets(): EvidencePacket[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_PACKETS_KEY) || '[]'); }
  catch { return []; }
}

function saveLocalPackets(packets: EvidencePacket[]) {
  localStorage.setItem(LOCAL_PACKETS_KEY, JSON.stringify(packets));
}
