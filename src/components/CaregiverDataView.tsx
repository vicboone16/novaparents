/**
 * Caregiver Data View
 * ───────────────────
 * Shows parent-logged behavior data (ABC, Frequency, Duration) in a read-only
 * summary view. This data is tagged as "caregiver-collected" and kept separate
 * from staff/RBT clinical data collection.
 *
 * Intended to appear under the client/student's profile in NovaTrack core
 * and also in the Caregiver Training tab.
 */

import { PenLine, Hash, Clock, TrendingUp, Users } from 'lucide-react';

interface CaregiverDataViewProps {
  compact?: boolean;
}

export function CaregiverDataView({ compact = false }: CaregiverDataViewProps) {
  const abcLogs = loadLocal('bd_behavior_log');
  const freqLogs = loadLocal('bd_frequency_log');
  const durLogs = loadLocal('bd_duration_log');

  const totalLogs = abcLogs.length + freqLogs.length + durLogs.length;

  // Compute simple trend data
  const last7Days = getLast7DaysCounts(abcLogs);

  if (compact) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-secondary" />
          <h4 className="font-display font-bold text-foreground text-sm">Caregiver Data</h4>
          <span className="ml-auto rounded-full bg-secondary/10 text-secondary px-2 py-0.5 text-[10px] font-bold">
            Separate from clinical
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <MiniStat icon={PenLine} label="ABC" value={abcLogs.length} />
          <MiniStat icon={Hash} label="Frequency" value={freqLogs.length} />
          <MiniStat icon={Clock} label="Duration" value={durLogs.length} />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Parent-reported data. Not factored into clinical data collection or staff charts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-secondary" />
          <h3 className="font-display text-lg font-bold text-foreground">Caregiver-Reported Data</h3>
        </div>
        <span className="rounded-full bg-secondary/10 text-secondary px-3 py-1 text-[10px] font-bold">
          Separate from staff data
        </span>
      </div>

      <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-3 text-xs text-foreground flex items-start gap-2">
        <Users className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
        <span>
          This data is logged by the caregiver/parent and kept <strong>separate</strong> from RBT/staff clinical data.
          It is not factored into clinical frequency charts, duration graphs, or data collection totals.
          It can be exported separately for review.
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={PenLine} label="ABC Logs" value={abcLogs.length} color="text-primary" />
        <StatCard icon={Hash} label="Frequency" value={freqLogs.length} color="text-secondary" />
        <StatCard icon={Clock} label="Duration" value={durLogs.length} color="text-accent" />
      </div>

      {/* 7-day trend */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h4 className="font-display font-bold text-foreground text-sm">7-Day Logging Trend</h4>
        </div>
        <div className="flex items-end gap-3 h-24">
          {last7Days.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-semibold text-foreground">{d.count}</span>
              <div
                className="w-full rounded-lg gradient-hero transition-all duration-500"
                style={{ height: `${d.count > 0 ? Math.max((d.count / Math.max(...last7Days.map(x => x.count), 1)) * 100, 8) : 4}%`, minHeight: '4px' }}
              />
              <span className="text-[9px] text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent ABC entries */}
      {abcLogs.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent ABC Entries</h4>
          {abcLogs.slice(0, 5).map((e: any) => (
            <div key={e.id} className="rounded-lg bg-muted/30 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{e.behavior}</span>
                <span className="text-[10px] text-muted-foreground">{e.date}</span>
              </div>
              {e.antecedent && <p className="text-xs text-muted-foreground"><strong>Before:</strong> {e.antecedent}</p>}
              {e.consequence && <p className="text-xs text-muted-foreground"><strong>Response:</strong> {e.consequence}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Recent Frequency entries */}
      {freqLogs.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Frequency Entries</h4>
          {freqLogs.slice(0, 5).map((e: any) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
              <span className="text-sm font-semibold text-foreground">{e.behavior}</span>
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">{e.count}× / {e.period}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent Duration entries */}
      {durLogs.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Duration Entries</h4>
          {durLogs.slice(0, 5).map((e: any) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
              <span className="text-sm font-semibold text-foreground">{e.behavior}</span>
              <span className="rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[10px] font-bold">{e.durationMin}m</span>
            </div>
          ))}
        </div>
      )}

      {totalLogs === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No caregiver data logged yet.</p>
          <p className="text-xs mt-1">Log ABC, Frequency, or Duration data to see it here.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
      <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
      <p className="font-display text-xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <p className="font-display text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function loadLocal(key: string): any[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function getLast7DaysCounts(logs: any[]) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = logs.filter((l: any) => l.date === dateStr).length;
    result.push({ label: days[d.getDay()], count });
  }
  return result;
}
