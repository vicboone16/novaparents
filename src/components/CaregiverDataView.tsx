/**
 * Caregiver Data View
 * ───────────────────
 * Shows parent-logged behavior data (ABC, Frequency, Duration) with
 * configurable date ranges: 7d, 14d, custom.
 */

import { useState, useMemo } from 'react';
import { PenLine, Hash, Clock, TrendingUp, Users, CalendarIcon } from 'lucide-react';
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type RangePreset = '7d' | '14d' | 'custom';

interface CaregiverDataViewProps {
  compact?: boolean;
}

export function CaregiverDataView({ compact = false }: CaregiverDataViewProps) {
  const [rangePreset, setRangePreset] = useState<RangePreset>('7d');
  const [customFrom, setCustomFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [customTo, setCustomTo] = useState<Date | undefined>(new Date());

  const allAbc = loadLocal('bd_behavior_log');
  const allFreq = loadLocal('bd_frequency_log');
  const allDur = loadLocal('bd_duration_log');

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (rangePreset === '7d') return { from: subDays(now, 6), to: now };
    if (rangePreset === '14d') return { from: subDays(now, 13), to: now };
    return { from: customFrom || subDays(now, 30), to: customTo || now };
  }, [rangePreset, customFrom, customTo]);

  function inRange(dateStr: string) {
    const d = new Date(dateStr);
    return !isBefore(d, startOfDay(from)) && !isAfter(d, endOfDay(to));
  }

  const abcLogs = allAbc.filter((l: any) => inRange(l.date));
  const freqLogs = allFreq.filter((l: any) => inRange(l.date));
  const durLogs = allDur.filter((l: any) => inRange(l.date));
  const totalLogs = abcLogs.length + freqLogs.length + durLogs.length;

  const dayCount = rangePreset === '7d' ? 7 : rangePreset === '14d' ? 14 : Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1;
  const trendDays = getTrendData(allAbc, from, Math.min(dayCount, 31));

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
          <MiniStat icon={PenLine} label="ABC" value={allAbc.length} />
          <MiniStat icon={Hash} label="Frequency" value={allFreq.length} />
          <MiniStat icon={Clock} label="Duration" value={allDur.length} />
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
        </span>
      </div>

      {/* Date range picker */}
      <div className="flex flex-wrap items-center gap-2">
        {(['7d', '14d', 'custom'] as RangePreset[]).map(p => (
          <Button
            key={p}
            size="sm"
            variant={rangePreset === p ? 'default' : 'outline'}
            onClick={() => setRangePreset(p)}
            className="text-xs"
          >
            {p === '7d' ? '7 Days' : p === '14d' ? '14 Days' : 'Custom'}
          </Button>
        ))}

        {rangePreset === 'custom' && (
          <div className="flex items-center gap-1.5 ml-1">
            <DatePicker date={customFrom} onChange={setCustomFrom} label="From" />
            <span className="text-xs text-muted-foreground">–</span>
            <DatePicker date={customTo} onChange={setCustomTo} label="To" />
          </div>
        )}

        <span className="ml-auto text-[10px] text-muted-foreground">
          {format(from, 'MMM d')} – {format(to, 'MMM d, yyyy')}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={PenLine} label="ABC Logs" value={abcLogs.length} color="text-primary" />
        <StatCard icon={Hash} label="Frequency" value={freqLogs.length} color="text-secondary" />
        <StatCard icon={Clock} label="Duration" value={durLogs.length} color="text-accent" />
      </div>

      {/* Trend chart */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h4 className="font-display font-bold text-foreground text-sm">Logging Trend</h4>
        </div>
        <div className="flex items-end gap-1 h-24 overflow-x-auto">
          {trendDays.map((d, i) => (
            <div key={i} className="flex-1 min-w-[18px] flex flex-col items-center gap-1">
              <span className="text-[9px] font-semibold text-foreground">{d.count || ''}</span>
              <div
                className="w-full rounded-lg gradient-hero transition-all duration-500"
                style={{
                  height: `${d.count > 0 ? Math.max((d.count / Math.max(...trendDays.map(x => x.count), 1)) * 100, 8) : 4}%`,
                  minHeight: '4px',
                }}
              />
              <span className="text-[8px] text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent ABC */}
      {abcLogs.length > 0 && (
        <LogSection title="Recent ABC Entries">
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
        </LogSection>
      )}

      {/* Recent Frequency */}
      {freqLogs.length > 0 && (
        <LogSection title="Recent Frequency Entries">
          {freqLogs.slice(0, 5).map((e: any) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
              <span className="text-sm font-semibold text-foreground">{e.behavior}</span>
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">{e.count}× / {e.period}</span>
            </div>
          ))}
        </LogSection>
      )}

      {/* Recent Duration */}
      {durLogs.length > 0 && (
        <LogSection title="Recent Duration Entries">
          {durLogs.slice(0, 5).map((e: any) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
              <span className="text-sm font-semibold text-foreground">{e.behavior}</span>
              <span className="rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[10px] font-bold">{e.durationMin}m</span>
            </div>
          ))}
        </LogSection>
      )}

      {totalLogs === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No caregiver data in this range.</p>
          <p className="text-xs mt-1">Log ABC, Frequency, or Duration data to see it here.</p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────

function DatePicker({ date, onChange, label }: { date: Date | undefined; onChange: (d: Date | undefined) => void; label: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('text-xs gap-1', !date && 'text-muted-foreground')}>
          <CalendarIcon className="h-3 w-3" />
          {date ? format(date, 'MMM d') : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onChange}
          disabled={d => isAfter(d, new Date())}
          initialFocus
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
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

function LogSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</h4>
      {children}
    </div>
  );
}

function loadLocal(key: string): any[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function getTrendData(logs: any[], fromDate: Date, days: number) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const dateStr = d.toISOString().split('T')[0];
    const count = logs.filter((l: any) => l.date === dateStr).length;
    result.push({ label: days <= 14 ? dayNames[d.getDay()] : format(d, 'M/d'), count });
  }
  return result;
}
