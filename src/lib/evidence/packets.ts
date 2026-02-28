/**
 * Evidence Packets
 * ────────────────
 * Bundles lesson completions, quiz scores, reflections, implementation logs,
 * and learner data logs into a single Evidence Packet for agency review.
 *
 * Coach submits → status = pending_review
 * BCBA/admin in NovaTrack: approve / needs_followup / reject
 * Coach NEVER sees billing/auth details.
 *
 * Phase 1: localStorage. Phase 2: syncs to NovaTrack.
 */

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
  /** Agency feedback message (visible to coach only for needs_followup) */
  feedbackMessage: string | null;
  /** What coach needs to redo (for needs_followup) */
  followupItems: string[];

  // ─── Bundled data ────────────────────────────────────
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

// ─── Storage ─────────────────────────────────────────────

const PACKETS_KEY = 'bd_evidence_packets';

function loadPackets(): EvidencePacket[] {
  try { return JSON.parse(localStorage.getItem(PACKETS_KEY) || '[]'); }
  catch { return []; }
}

function persistPackets(packets: EvidencePacket[]) {
  localStorage.setItem(PACKETS_KEY, JSON.stringify(packets));
}

// ─── Public API ──────────────────────────────────────────

export function getPackets(): EvidencePacket[] {
  return loadPackets();
}

export function getPacketsByStatus(status: PacketStatus): EvidencePacket[] {
  return loadPackets().filter(p => p.status === status);
}

export function getLatestPacket(): EvidencePacket | null {
  const packets = loadPackets();
  return packets.length > 0 ? packets[0] : null;
}

const TOTAL_LESSONS = 11;

/**
 * Build a new Evidence Packet from current engagement data.
 */
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

  // Count frequency/duration logs from localStorage
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

/**
 * Submit an Evidence Packet for agency review.
 */
export function submitEvidencePacket(userId: string): EvidencePacket {
  const packet = buildEvidencePacket(userId);
  packet.status = 'submitted';
  packet.submittedAt = new Date().toISOString();

  // After a brief delay it becomes pending_review (simulating sync to NovaTrack)
  packet.status = 'pending_review';

  const packets = loadPackets();
  packets.unshift(packet);
  persistPackets(packets);
  return packet;
}

/**
 * Simulate agency review action (for testing; in production this comes from NovaTrack).
 */
export function updatePacketStatus(
  packetId: string,
  status: 'approved' | 'needs_followup' | 'rejected',
  feedbackMessage?: string,
  followupItems?: string[]
) {
  const packets = loadPackets();
  const idx = packets.findIndex(p => p.id === packetId);
  if (idx === -1) return;
  packets[idx].status = status;
  if (feedbackMessage) packets[idx].feedbackMessage = feedbackMessage;
  if (followupItems) packets[idx].followupItems = followupItems;
  persistPackets(packets);
}
