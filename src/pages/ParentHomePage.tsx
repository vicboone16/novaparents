/**
 * Parent Home — Daily Summary
 * Sections: headline, behavior summary, what this means,
 * what you can do, teacher note.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParentChild } from '@/hooks/useParentChild';
import { usePageFocusRefresh } from '@/hooks/usePageFocusRefresh';
import {
  getTodayInsight,
  getBehaviorTranslation,
  type ParentInsight,
  type BehaviorSummaryItem,
} from '@/lib/parent-insights-dal';
import {
  CheckCircle, CheckCircle2, AlertCircle, Minus,
  MessageCircle, Sparkles, Heart, Sun,
} from 'lucide-react';

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'improving') return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (trend === 'worsening') return <AlertCircle className="h-4 w-4 text-secondary" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function TrendLabel({ trend }: { trend: string }) {
  if (trend === 'improving') return <span className="text-[10px] font-semibold text-success">Improving</span>;
  if (trend === 'worsening') return <span className="text-[10px] font-semibold text-secondary">Needs support</span>;
  return <span className="text-[10px] font-semibold text-muted-foreground">Stable</span>;
}

export default function ParentHomePage() {
  const { childId, childName } = useParentChild();
  const [insight, setInsight] = useState<ParentInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallbackMeaning, setFallbackMeaning] = useState('');
  const [fallbackStrategies, setFallbackStrategies] = useState<string[]>([]);

  const load = useCallback(() => {
    if (!childId) { setLoading(false); return; }
    setLoading(true);
    getTodayInsight(childId).then(async (data) => {
      setInsight(data);
      if (!data?.what_this_means || !data?.what_you_can_do?.length) {
        const translation = await getBehaviorTranslation('general');
        setFallbackMeaning(translation.meaning);
        setFallbackStrategies(translation.strategies);
      }
      setLoading(false);
    });
  }, [childId]);

  useEffect(() => { load(); }, [load]);
  usePageFocusRefresh(load);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="rounded-2xl bg-muted h-32" />
        <div className="rounded-xl bg-muted h-24" />
        <div className="rounded-xl bg-muted h-20" />
      </div>
    );
  }

  const headline = insight?.headline || `Today's summary for ${childName} is being prepared ☀️`;
  const points = insight?.points_earned ?? null;
  const behaviors: BehaviorSummaryItem[] = insight?.behavior_summary || [];
  const meaning = insight?.what_this_means || fallbackMeaning;
  const strategies = insight?.what_you_can_do?.length ? insight.what_you_can_do : fallbackStrategies;
  const teacherNote = insight?.teacher_note;

  return (
    <div className="space-y-5">
      {/* 1. Daily Summary Hero */}
      <section className="rounded-2xl gradient-hero p-6 text-primary-foreground shadow-soft">
        <div className="flex items-start gap-3">
          <Sun className="h-7 w-7 shrink-0 mt-0.5 opacity-90" />
          <div className="space-y-1">
            <p className="font-display text-lg font-bold leading-snug">{headline}</p>
            {points !== null && (
              <div className="flex items-center gap-2 mt-2">
                <Sparkles className="h-4 w-4" />
                <span className="font-display text-2xl font-extrabold">{points}</span>
                <span className="text-sm opacity-80">points earned today</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. Behavior Summary */}
      {behaviors.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
          <h3 className="font-display text-sm font-bold text-foreground">
            How {childName} Did Today
          </h3>
          <div className="space-y-2.5">
            {behaviors.map((b, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                <TrendIcon trend={b.trend} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{b.label}</p>
                </div>
                <TrendLabel trend={b.trend} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. What This Means */}
      {meaning && (
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-soft space-y-2">
          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            What This Means
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{meaning}</p>
        </section>
      )}

      {/* 4. What You Can Do at Home */}
      {strategies.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
          <h3 className="font-display text-sm font-bold text-foreground">
            What You Can Do at Home
          </h3>
          <ul className="space-y-2">
            {strategies.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span className="text-sm text-foreground leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 7. Teacher Note */}
      {teacherNote && (
        <section className="rounded-xl border border-secondary/20 bg-secondary/5 p-4 shadow-soft space-y-2">
          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-secondary" />
            Note from the Team
          </h3>
          <p className="text-sm text-foreground leading-relaxed italic">"{teacherNote}"</p>
        </section>
      )}
    </div>
  );
}
