/**
 * My Insights Page
 * ────────────────
 * Backend-powered list of Weekly Snapshots from public.weekly_snapshots view.
 */

import { useState, useEffect } from 'react';
import {
  BarChart3, Plus, TrendingUp, Brain, Sparkles,
  FileText, Download, Link2, Loader2, User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  fetchSnapshots,
  computeTrends,
  generatePatternNotes,
  checkAgencyLink,
  getStatusDisplay,
  type WeeklySnapshot,
  type AgencyLinkInfo,
} from '@/lib/snapshots';
import { supabase } from '@/integrations/supabase/client';

export default function InsightsPage() {
  const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<WeeklySnapshot | null>(null);
  const [agencyLink, setAgencyLink] = useState<AgencyLinkInfo>({ isLinked: false });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const [snaps, link] = await Promise.all([
          fetchSnapshots(),
          checkAgencyLink(),
        ]);
        setSnapshots(snaps);
        setAgencyLink(link);
      }
    } catch {
      // handled gracefully
    }
    setLoading(false);
  }

  const trends = computeTrends(snapshots);
  const patternNotes = generatePatternNotes(snapshots);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">My Insights</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your weekly snapshots and progress.</p>
        </div>
        <Link to="/insights/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Create Snapshot
          </Button>
        </Link>
      </div>

      {/* Section 1: Weekly Snapshots */}
      <section className="space-y-3">
        <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Weekly Snapshots
        </h3>

        {snapshots.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card space-y-3">
            <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">No snapshots yet.</p>
            <p className="text-xs text-muted-foreground/70">
              Create your first Weekly Snapshot to start tracking.
            </p>
            <Link to="/insights/new">
              <Button size="sm" className="gap-1.5 mt-2">
                <Plus className="h-4 w-4" /> Create Snapshot
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {snapshots.slice(0, 12).map(snap => {
              const cfg = getStatusDisplay(snap.status);
              const isOwn = snap.coachUserId === currentUserId;
              return (
                <button
                  key={snap.id}
                  onClick={() => setSelectedSnapshot(selectedSnapshot?.id === snap.id ? null : snap)}
                  className="w-full rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-soft transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-foreground truncate flex-1 mr-2">
                      {snap.title || 'Weekly Snapshot'}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{new Date(snap.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {isOwn ? (
                      <span className="flex items-center gap-1 text-primary">
                        <User className="h-3 w-3" /> Created by you
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-accent">
                        <User className="h-3 w-3" /> From your support team
                      </span>
                    )}
                  </div>

                  {/* Expanded detail */}
                  {selectedSnapshot?.id === snap.id && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2 animate-fade-in">
                      <DetailRow label="Status" value={cfg.label} />
                      {snap.description && <DetailRow label="Notes" value={snap.description} />}
                      {snap.evidenceSummary && <DetailRow label="Summary" value={snap.evidenceSummary} />}
                      {snap.caregiverName && <DetailRow label="Caregiver" value={`${snap.caregiverName}${snap.caregiverRelationship ? ` (${snap.caregiverRelationship})` : ''}`} />}
                      {snap.activeSeconds != null && snap.activeSeconds > 0 && (
                        <DetailRow label="Time in form" value={`${Math.round(snap.activeSeconds / 60)}m`} />
                      )}
                      {snap.submittedAt && (
                        <DetailRow label="Submitted" value={new Date(snap.submittedAt).toLocaleDateString()} />
                      )}
                      <DetailRow label="Created" value={new Date(snap.createdAt).toLocaleString()} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 2: Overview */}
      <section className="space-y-3">
        <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Overview
        </h3>

        {!trends ? (
          <div className="rounded-xl border border-border bg-card p-5 shadow-card text-center">
            <p className="text-sm text-muted-foreground">Create a snapshot to see your overview.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Snapshots" value={String(trends.totalSnapshots)} />
            <StatCard label="Drafts" value={String(trends.draftCount)} />
            <StatCard label="Submitted" value={String(trends.submittedCount)} />
            <StatCard label="Reviewed" value={String(trends.reviewedCount)} />
          </div>
        )}
      </section>

      {/* Section 3: Pattern Notes */}
      <section className="space-y-3">
        <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
          <Brain className="h-4 w-4 text-accent" /> Pattern Notes
        </h3>

        {patternNotes.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-5 shadow-card text-center">
            <p className="text-sm text-muted-foreground">Create snapshots to see patterns.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {patternNotes.map((note, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4">
                <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{note}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 4: Exports */}
      <section className="space-y-2">
        <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
          <Download className="h-4 w-4 text-muted-foreground" /> Exports
        </h3>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Download className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              {agencyLink.isLinked ? (
                <>
                  <p className="text-sm font-semibold text-foreground">Download for your records</p>
                  <p className="text-xs text-muted-foreground">Optional — your snapshots are also shared with your support team.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-foreground">Export Snapshot</p>
                  <p className="text-xs text-muted-foreground">PDF and CSV downloads coming soon.</p>
                </>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-1.5" disabled>
            <Download className="h-3.5 w-3.5" /> Export (coming soon)
          </Button>
        </div>

        {!agencyLink.isLinked && (
          <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/10 p-3">
            <Link2 className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Link to an agency to share snapshots with your support team (optional).
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between text-xs gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">{label}</p>
      <p className="font-display text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
