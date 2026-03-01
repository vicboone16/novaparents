/**
 * Agency Audit Dashboard
 * ──────────────────────
 * Protected by server-side RBAC — only agency_admin users can access.
 * Shows per-Learner engagement scores, time spent, integrity flags, and progress.
 */

import { useEffect, useState } from 'react';
import { Shield, Clock, AlertTriangle, BarChart3, CheckCircle2, ChevronDown, ChevronUp, Eye, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/hooks/useUserRole';
import { getPacketsByStatus, getPackets, type WeeklySnapshot } from '@/lib/evidence';
import {
  getAllEvents,
  getAllFlags,
  getAllTimings,
  computeCoachScore,
  getRubric,
  type EngagementEvent,
  type IntegrityFlag,
  type LessonTimingRecord,
  type CoachScore,
} from '@/lib/engagement';

interface CoachSummary {
  userId: string;
  events: EngagementEvent[];
  flags: IntegrityFlag[];
  timings: Record<string, LessonTimingRecord>;
  score: CoachScore;
  packets: WeeklySnapshot[];
}

const TOTAL_LESSONS = 11;

export default function AuditDashboardPage() {
  const { role, loading: roleLoading, isAgencyAdmin } = useUserRole();
  const [coaches, setCoaches] = useState<CoachSummary[]>([]);
  const [expandedCoach, setExpandedCoach] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [pendingPackets, setPendingPackets] = useState<WeeklySnapshot[]>([]);
  const rubric = getRubric();

  useEffect(() => {
    if (!isAgencyAdmin) return;

    async function load() {
      const allEvents = getAllEvents();
      const allFlags = getAllFlags();
      const allTimings = getAllTimings();

      const userIds = [...new Set(allEvents.map(e => e.userId))];
      const summaries: CoachSummary[] = [];
      
      for (const userId of userIds) {
        const events = allEvents.filter(e => e.userId === userId);
        const flags = allFlags.filter(f => f.userId === userId);
        const score = computeCoachScore(userId, TOTAL_LESSONS);
        const packets = await getPackets(userId);
        summaries.push({ userId, events, flags, timings: allTimings, score, packets });
      }

      setCoaches(summaries);
      
      const pending = await getPacketsByStatus('pending_review');
      setPendingPackets(pending);
    }
    load();
  }, [isAgencyAdmin]);

  if (roleLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse text-muted-foreground font-display">Verifying access…</div>
      </div>
    );
  }

  if (!isAgencyAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <Lock className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground mb-2">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">This page is only available to agency administrators.</p>
        </div>
      </div>
    );
  }

  function formatDuration(sec: number): string {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  }

  function severityBadge(severity: string) {
    const styles: Record<string, string> = {
      low: 'bg-warning/10 text-warning',
      med: 'bg-secondary/10 text-secondary',
      high: 'bg-destructive/10 text-destructive',
    };
    return styles[severity] || styles.low;
  }

  const totalFlags = coaches.reduce((s, c) => s + c.flags.length, 0);
  const avgScore = coaches.length
    ? Math.round(coaches.reduce((s, c) => s + c.score.totalScore, 0) / coaches.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="font-display text-2xl font-bold text-foreground">Agency Audit Dashboard</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Caregiver Training engagement audit — per-Learner scoring, integrity flags, and progress.
        </p>
      </div>

      {/* Pending Packets Alert */}
      {pendingPackets.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <div>
            <p className="font-display font-bold text-foreground text-sm">{pendingPackets.length} Weekly Snapshot(s) Pending Review</p>
            <p className="text-xs text-muted-foreground">These snapshots need BCBA/admin review before billing eligibility is confirmed.</p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Coaches</p>
          <p className="font-display text-2xl font-bold text-foreground mt-1">{coaches.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg Score</p>
          <p className="font-display text-2xl font-bold text-primary mt-1">{avgScore}/100</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Flags</p>
          <p className="font-display text-2xl font-bold text-destructive mt-1">{totalFlags}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Billing Eligible</p>
          <p className="font-display text-2xl font-bold text-success mt-1">
            {coaches.filter(c => c.score.billingEligible).length}/{coaches.length}
          </p>
        </div>
      </div>

      {/* Scoring Rubric */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <button
          onClick={() => setExpandedSection(expandedSection === 'rubric' ? null : 'rubric')}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="font-display font-bold text-foreground text-sm flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-primary" /> Scoring Rubric
          </h3>
          {expandedSection === 'rubric' ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {expandedSection === 'rubric' && (
          <div className="mt-4 space-y-2">
            {rubric.map((r, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                <span className="text-xs font-bold text-primary bg-primary/10 rounded px-2 py-0.5 shrink-0">
                  {Math.round(r.weight * 100)}%
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.description}</p>
                </div>
              </div>
            ))}
            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
              Billing eligibility threshold: ≥60/100. Scoring is fully deterministic.
            </div>
          </div>
        )}
      </div>

      {/* Per-Coach Detail */}
      {coaches.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Eye className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p>No engagement data yet. Coaches will appear here as they use the training.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coaches.map((coach) => {
            const isExpanded = expandedCoach === coach.userId;
            const completions = coach.events.filter(e => e.eventType === 'lesson_complete');
            const uniqueCompletions = new Set(completions.map(e => e.meta.lessonKey as string));
            const totalTime = Object.values(coach.timings).reduce((s, t) => s + (t.durationSec ?? 0), 0);
            const pageViews = coach.events.filter(e => e.eventType === 'page_view');
            const sessions = coach.events.filter(e => e.eventType === 'session_start');
            const highFlags = coach.flags.filter(f => f.severity === 'high').length;

            return (
              <div key={coach.userId} className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                <button
                  onClick={() => setExpandedCoach(isExpanded ? null : coach.userId)}
                  className="w-full text-left p-4 flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-display font-bold text-foreground text-sm truncate">
                        Coach: {coach.userId.slice(0, 8)}…
                      </h4>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${coach.score.billingEligible ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {coach.score.billingEligible ? 'Eligible' : 'Not Eligible'}
                      </span>
                      {highFlags > 0 && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-destructive/10 text-destructive flex items-center gap-0.5">
                          <AlertTriangle className="h-3 w-3" /> {highFlags} high
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Score: <strong className="text-foreground">{coach.score.totalScore}/100</strong></span>
                      <span>Lessons: <strong className="text-foreground">{uniqueCompletions.size}/{TOTAL_LESSONS}</strong></span>
                      <span>Time: <strong className="text-foreground">{formatDuration(totalTime)}</strong></span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4">
                    {/* Score Breakdown */}
                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Score Breakdown</h5>
                      <div className="space-y-2">
                        {coach.score.breakdown.map((b, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs text-foreground w-32 shrink-0">{b.category}</span>
                            <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                              <div className="h-full rounded-full gradient-hero transition-all" style={{ width: `${b.score}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-foreground w-12 text-right">{b.score}/100</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Weekly Snapshots */}
                    {coach.packets.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Weekly Snapshots</h5>
                        <div className="space-y-1.5">
                          {coach.packets.slice(0, 5).map(p => (
                            <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs">
                              <span className="text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
                              <span className={`rounded-full px-2 py-0.5 font-bold ${
                                p.status === 'approved' ? 'bg-success/10 text-success' :
                                p.status === 'pending_review' ? 'bg-warning/10 text-warning' :
                                p.status === 'needs_followup' ? 'bg-secondary/10 text-secondary' :
                                'bg-muted text-muted-foreground'
                              }`}>{p.status.replace('_', ' ')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Activity Summary */}
                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Activity Summary</h5>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="rounded-lg bg-muted/50 p-3 text-center">
                          <p className="font-display text-lg font-bold text-foreground">{sessions.length}</p>
                          <p className="text-[10px] text-muted-foreground">Sessions</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3 text-center">
                          <p className="font-display text-lg font-bold text-foreground">{pageViews.length}</p>
                          <p className="text-[10px] text-muted-foreground">Page Views</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3 text-center">
                          <p className="font-display text-lg font-bold text-foreground">{uniqueCompletions.size}</p>
                          <p className="text-[10px] text-muted-foreground">Completions</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3 text-center">
                          <p className="font-display text-lg font-bold text-foreground">{coach.events.filter(e => e.eventType === 'reflection_submitted' || e.eventType === 'micro_quiz_submit').length}</p>
                          <p className="text-[10px] text-muted-foreground">Interactions</p>
                        </div>
                      </div>
                    </div>

                    {/* Integrity Flags */}
                    {coach.flags.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-destructive" /> Integrity Flags ({coach.flags.length})
                        </h5>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {coach.flags.map((flag) => (
                            <div key={flag.id} className="flex items-start gap-2 rounded-lg bg-muted/30 p-2.5 text-xs">
                              <span className={`rounded px-1.5 py-0.5 font-bold uppercase text-[10px] shrink-0 ${severityBadge(flag.severity)}`}>
                                {flag.severity}
                              </span>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground">{flag.reasonCode}</p>
                                <p className="text-muted-foreground truncate">{flag.reason}</p>
                                <p className="text-muted-foreground/60 mt-0.5">{new Date(flag.timestamp).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lesson Timings */}
                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Lesson Timings
                      </h5>
                      <div className="space-y-1">
                        {Object.entries(coach.timings)
                          .filter(([_, t]) => t.completedAt)
                          .sort((a, b) => a[0].localeCompare(b[0]))
                          .map(([key, t]) => (
                            <div key={key} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs">
                              <span className="font-medium text-foreground">Lesson {key}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground">{formatDuration(t.durationSec ?? 0)}</span>
                                {t.hadInteraction ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                                ) : (
                                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                                )}
                              </div>
                            </div>
                          ))}
                        {Object.values(coach.timings).filter(t => t.completedAt).length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No completed lessons yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
