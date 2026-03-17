/**
 * Weekly Snapshot Preview Dialog
 * ──────────────────────────────
 * Shows all data that will be bundled into the snapshot before submission.
 */

import { useState } from 'react';
import {
  Package, Send, BookOpen, PenLine, Hash, Clock, ClipboardList,
  Shield, CheckCircle2, AlertTriangle, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildWeeklySnapshot, type WeeklySnapshot } from '@/lib/evidence';

interface Props {
  userId: string;
  open: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
  submitting: boolean;
}

export function EvidencePacketPreview({ userId, open, onClose, onConfirmSubmit, submitting }: Props) {
  if (!open || !userId) return null;

  const packet = buildWeeklySnapshot(userId);

  const totalLogs = packet.behaviorLogsCount + packet.frequencyLogsCount + packet.durationLogsCount;

  // Load actual log entries for preview
  const abcLogs = loadLocal('bd_behavior_log');
  const freqLogs = loadLocal('bd_frequency_log');
  const durLogs = loadLocal('bd_duration_log');
  const implLogs = loadLocal('bd_implementation_log');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="relative w-full sm:max-w-lg max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl safe-area-bottom">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-bold text-foreground">Weekly Snapshot Preview</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <SummaryCard icon={BookOpen} label="Lessons" value={packet.lessonsCompleted.length} color="text-primary" />
            <SummaryCard icon={PenLine} label="Data Logs" value={totalLogs} color="text-secondary" />
            <SummaryCard icon={Shield} label="Score" value={packet.integrityScore} color="text-accent" />
          </div>

          {/* Billing Eligibility */}
          <div className={`flex items-center gap-2 rounded-xl p-3 text-sm font-semibold ${
            packet.billingEligible
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-warning/10 text-warning border border-warning/20'
          }`}>
            {packet.billingEligible ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {packet.billingEligible ? 'Meets billing eligibility threshold' : 'Does not yet meet billing eligibility (score ≥60 required)'}
          </div>

          {/* Lessons Completed */}
          <Section title="Lessons Completed" icon={BookOpen} count={packet.lessonsCompleted.length}>
            {packet.lessonsCompleted.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No lessons completed yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {packet.lessonsCompleted.map(key => (
                  <span key={key} className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[10px] font-bold">
                    Lesson {key}
                  </span>
                ))}
              </div>
            )}
          </Section>

          {/* ABC Logs */}
          <Section title="ABC Logs" icon={PenLine} count={abcLogs.length}>
            {abcLogs.slice(0, 5).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                <span className="text-foreground font-medium truncate mr-2">{e.behavior}</span>
                <span className="text-muted-foreground shrink-0">{e.date}</span>
              </div>
            ))}
            {abcLogs.length > 5 && <p className="text-[10px] text-muted-foreground mt-1">+{abcLogs.length - 5} more</p>}
          </Section>

          {/* Frequency Logs */}
          <Section title="Frequency Logs" icon={Hash} count={freqLogs.length}>
            {freqLogs.slice(0, 5).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                <span className="text-foreground font-medium truncate mr-2">{e.behavior} ({e.count}×)</span>
                <span className="text-muted-foreground shrink-0">{e.date}</span>
              </div>
            ))}
            {freqLogs.length > 5 && <p className="text-[10px] text-muted-foreground mt-1">+{freqLogs.length - 5} more</p>}
          </Section>

          {/* Duration Logs */}
          <Section title="Duration Logs" icon={Clock} count={durLogs.length}>
            {durLogs.slice(0, 5).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                <span className="text-foreground font-medium truncate mr-2">{e.behavior} ({e.durationMin}m)</span>
                <span className="text-muted-foreground shrink-0">{e.date}</span>
              </div>
            ))}
            {durLogs.length > 5 && <p className="text-[10px] text-muted-foreground mt-1">+{durLogs.length - 5} more</p>}
          </Section>

          {/* Implementation Logs */}
          <Section title="Implementation Logs" icon={ClipboardList} count={implLogs.length}>
            {implLogs.slice(0, 5).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                <span className="text-foreground font-medium truncate mr-2">{e.strategy}</span>
                <span className="text-muted-foreground shrink-0">{e.date}</span>
              </div>
            ))}
            {implLogs.length > 5 && <p className="text-[10px] text-muted-foreground mt-1">+{implLogs.length - 5} more</p>}
          </Section>

          {/* Integrity Flags */}
          <Section title="Integrity Flags" icon={AlertTriangle} count={packet.flagsSummary.high + packet.flagsSummary.med + packet.flagsSummary.low}>
            <div className="flex gap-3 text-xs">
              <span className="text-destructive font-semibold">{packet.flagsSummary.high} High</span>
              <span className="text-warning font-semibold">{packet.flagsSummary.med} Med</span>
              <span className="text-muted-foreground font-semibold">{packet.flagsSummary.low} Low</span>
            </div>
          </Section>

          {/* Reflections + Quizzes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="font-display text-lg font-bold text-foreground">{packet.reflectionsSubmitted}</p>
              <p className="text-[10px] text-muted-foreground">Reflections</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="font-display text-lg font-bold text-foreground">{packet.quizScores.length}</p>
              <p className="text-[10px] text-muted-foreground">Quizzes</p>
            </div>
          </div>

          {/* Active Time */}
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="font-display text-lg font-bold text-foreground">
              {Math.floor(packet.totalActiveTimeSec / 60)}m {packet.totalActiveTimeSec % 60}s
            </p>
            <p className="text-[10px] text-muted-foreground">Total Active Time</p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-border bg-card px-5 py-4 rounded-b-2xl flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={onConfirmSubmit} disabled={submitting} className="flex-1 gap-1.5">
            <Send className="h-4 w-4" />
            {submitting ? 'Submitting…' : 'Confirm & Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, count, children }: { title: string; icon: React.ElementType; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-primary" /> {title}
        </h4>
        <span className="text-[10px] font-bold text-muted-foreground">{count}</span>
      </div>
      {count === 0 ? <p className="text-xs text-muted-foreground italic">None recorded.</p> : children}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center shadow-card">
      <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
      <p className="font-display text-xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function loadLocal(key: string): any[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
