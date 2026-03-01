/**
 * My Insights Page
 * ────────────────
 * Calm, Apple Fitness-inspired view of weekly snapshots, trends, and pattern notes.
 */

import { useState, useEffect } from 'react';
import { BarChart3, Plus, TrendingUp, TrendingDown, Minus, Brain, Sparkles, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '@/lib/dal';
import { Button } from '@/components/ui/button';
import {
  getSnapshotsForUser,
  computeTrends,
  generatePatternNotes,
  FUNCTION_OPTIONS,
  type WeeklySnapshot,
  type SnapshotStatus,
} from '@/lib/snapshots';

const statusConfig: Record<SnapshotStatus, { label: string; cls: string }> = {
  saved: { label: 'Saved', cls: 'bg-muted text-muted-foreground' },
  pending_review: { label: 'Pending Review', cls: 'bg-warning/10 text-warning' },
  reviewed: { label: 'Reviewed', cls: 'bg-success/10 text-success' },
  returned: { label: 'Returned', cls: 'bg-secondary/10 text-secondary' },
};

export default function InsightsPage() {
  const [userId, setUserId] = useState('');
  const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<WeeklySnapshot | null>(null);

  useEffect(() => {
    getCurrentUser().then(u => {
      if (u) {
        setUserId(u.id);
        setSnapshots(getSnapshotsForUser(u.id));
      }
    });
  }, []);

  const trends = computeTrends(snapshots);
  const patternNotes = generatePatternNotes(snapshots);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">My Insights</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your weekly snapshots and trends.</p>
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
              Create your first Weekly Snapshot to start tracking patterns.
            </p>
            <Link to="/insights/new">
              <Button size="sm" className="gap-1.5 mt-2">
                <Plus className="h-4 w-4" /> Create Snapshot
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {snapshots.slice(0, 8).map(snap => {
              const cfg = statusConfig[snap.status];
              const totalLogs = snap.abcCount + snap.frequencyTotal;
              return (
                <button
                  key={snap.id}
                  onClick={() => setSelectedSnapshot(selectedSnapshot?.id === snap.id ? null : snap)}
                  className="w-full rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-soft transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-foreground">
                      {formatWeekLabel(snap.weekStart, snap.weekEnd)}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{snap.abcCount} ABC</span>
                    <span>{snap.frequencyTotal} freq</span>
                    <span>{snap.intensityAvg > 0 ? `${snap.intensityAvg} avg` : '—'}</span>
                  </div>

                  {/* Expanded detail */}
                  {selectedSnapshot?.id === snap.id && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2 animate-fade-in">
                      <DetailRow label="Duration (min)" value={String(snap.durationMinutesTotal)} />
                      <DetailRow label="Functions" value={snap.topFunctions.map(f => FUNCTION_OPTIONS.find(o => o.value === f)?.label || f).join(', ') || '—'} />
                      <DetailRow label="Triggers" value={snap.topTriggers.join(', ') || '—'} />
                      <DetailRow label="Tools Used" value={snap.toolsUsed.join(', ') || '—'} />
                      <DetailRow label="Games Completed" value={String(snap.gamesCompleted)} />
                      {snap.parentNotes && (
                        <div className="mt-2">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Notes</p>
                          <p className="text-xs text-foreground mt-0.5">{snap.parentNotes}</p>
                        </div>
                      )}
                      {snap.sharedAt && (
                        <p className="text-[10px] text-muted-foreground">Shared {new Date(snap.sharedAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 2: Trends */}
      <section className="space-y-3">
        <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Trends
        </h3>

        {!trends ? (
          <div className="rounded-xl border border-border bg-card p-5 shadow-card text-center">
            <p className="text-sm text-muted-foreground">Save 2+ snapshots to see trends.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <TrendCard
              title="Frequency (4 wk)"
              values={trends.freqTrend}
              format={(v) => String(v)}
            />
            <TrendCard
              title="Intensity (4 wk)"
              values={trends.intensityTrend}
              format={(v) => v.toFixed(1)}
            />
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Most Common "Why"</p>
              <p className="font-display text-sm font-bold text-foreground">
                {trends.topFunction
                  ? FUNCTION_OPTIONS.find(o => o.value === trends.topFunction)?.label || trends.topFunction
                  : '—'}
              </p>
            </div>
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
            <p className="text-sm text-muted-foreground">Create snapshots and tag functions/triggers to see patterns.</p>
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

      {/* Export placeholder */}
      <section className="rounded-xl border border-border bg-muted/30 p-4 text-center">
        <p className="text-xs text-muted-foreground">📄 Export (coming soon) — PDF and CSV downloads</p>
      </section>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}

function TrendCard({ title, values, format }: { title: string; values: number[]; format: (v: number) => string }) {
  const latest = values[0] ?? 0;
  const prev = values[1] ?? 0;
  const direction = latest > prev ? 'up' : latest < prev ? 'down' : 'flat';
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const color = direction === 'down' ? 'text-success' : direction === 'up' ? 'text-secondary' : 'text-muted-foreground';

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">{title}</p>
      <div className="flex items-center gap-2">
        <p className="font-display text-lg font-bold text-foreground">{format(latest)}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="flex gap-1 mt-2">
        {values.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded bg-primary/20"
            style={{ height: `${Math.max(4, (v / (Math.max(...values, 1))) * 24)}px` }}
          />
        )).reverse()}
      </div>
    </div>
  );
}

function formatWeekLabel(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(s)} – ${fmt(e)}`;
}
