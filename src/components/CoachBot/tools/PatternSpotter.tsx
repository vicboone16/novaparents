/**
 * Pattern Spotter™
 * ────────────────
 * Analyzes saved structured logs to find patterns.
 */

import { useMemo } from 'react';
import { Eye, TrendingUp, Clock, Target, ArrowRight, Users } from 'lucide-react';

export function PatternSpotterTool() {
  const abcLogs = loadLocal('bd_behavior_log');
  const freqLogs = loadLocal('bd_frequency_log');
  const translatorHistory = loadLocal('bd_translator_history');
  const reinforcementHistory = loadLocal('bd_reinforcement_history');

  const analysis = useMemo(() => {
    if (abcLogs.length < 2 && translatorHistory.length < 2) return null;

    // Most common behavior
    const behaviors = [...abcLogs.map((l: any) => l.behavior), ...translatorHistory.map((t: any) => t.behavior)].filter(Boolean);
    const behaviorCounts = countItems(behaviors);
    const topBehavior = behaviorCounts[0];

    // Most common antecedent/trigger
    const triggers = abcLogs.map((l: any) => l.antecedent).filter(Boolean);
    const triggerCounts = countItems(triggers);
    const topTrigger = triggerCounts[0];

    // Most common function
    const functions = translatorHistory.map((t: any) => t.topFunction).filter(Boolean);
    const fnCounts = countItems(functions);
    const topFunction = fnCounts[0];

    // Most common time of day
    const times = abcLogs.map((l: any) => l.time).filter(Boolean);
    const timeSlots = times.map((t: string) => {
      const hour = parseInt(t.split(':')[0]);
      if (hour < 12) return 'Morning';
      if (hour < 17) return 'Afternoon';
      return 'Evening';
    });
    const timeCounts = countItems(timeSlots);
    const topTime = timeCounts[0];

    // Adult response patterns (from reinforcement checks)
    const likelihoods = reinforcementHistory.map((r: any) => r.likelihood).filter(Boolean);
    const reinforcedCount = likelihoods.filter((l: string) => l === 'yes').length;
    const totalChecks = likelihoods.length;

    return { topBehavior, topTrigger, topFunction, topTime, reinforcedCount, totalChecks };
  }, [abcLogs, translatorHistory, reinforcementHistory]);

  const totalData = abcLogs.length + freqLogs.length + translatorHistory.length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-accent/5 border border-accent/20 p-3">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="h-4 w-4 text-accent" />
          <h4 className="font-display font-bold text-foreground text-sm">Pattern Spotter™</h4>
        </div>
        <p className="text-[10px] text-muted-foreground">Patterns from your {totalData} logged entries and analyses.</p>
      </div>

      {!analysis ? (
        <div className="text-center py-8 text-muted-foreground">
          <Eye className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Need at least 2 entries to spot patterns.</p>
          <p className="text-xs mt-1">Keep logging ABC data and using the Translator!</p>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {analysis.topBehavior && (
            <PatternCard icon={Target} label="Most Frequent Behavior" value={analysis.topBehavior.item} count={`${analysis.topBehavior.count} occurrences`} />
          )}
          {analysis.topTrigger && (
            <PatternCard icon={ArrowRight} label="Most Common Trigger" value={analysis.topTrigger.item} count={`${analysis.topTrigger.count} times`} />
          )}
          {analysis.topFunction && (
            <PatternCard icon={TrendingUp} label="Most Identified Function" value={analysis.topFunction.item} count={`${analysis.topFunction.count} analyses`} />
          )}
          {analysis.topTime && (
            <PatternCard icon={Clock} label="Most Common Time" value={analysis.topTime.item} count={`${analysis.topTime.count} entries`} />
          )}

          {analysis.totalChecks > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-secondary" /> Adult Response Insight
              </h4>
              <p className="text-sm text-foreground">
                {analysis.reinforcedCount > 0
                  ? `In ${analysis.reinforcedCount} of ${analysis.totalChecks} checks, your response likely reinforced the behavior. This is completely normal — awareness is the first step!`
                  : `Great awareness! Out of ${analysis.totalChecks} checks, you're making thoughtful response choices.`
                }
              </p>
              <p className="text-[10px] text-muted-foreground italic">
                Remember: reinforcement happens to everyone. The goal is awareness, not perfection. 💛
              </p>
            </div>
          )}

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
            <h4 className="text-xs font-semibold text-foreground">📚 Suggested Next Step</h4>
            <p className="text-sm text-foreground">
              {analysis.topFunction
                ? `Focus on the "${analysis.topFunction.item}" modules in Nova Academy to deepen your understanding.`
                : 'Continue logging to build a clearer picture of patterns over time.'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PatternCard({ icon: Icon, label, value, count }: { icon: React.ElementType; label: string; value: string; count: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
        <p className="text-[10px] text-muted-foreground">{count}</p>
      </div>
    </div>
  );
}

function loadLocal(key: string): any[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function countItems(items: string[]): { item: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const normalized = item.toLowerCase().trim();
    if (normalized) counts[normalized] = (counts[normalized] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([item, count]) => ({ item, count }));
}
