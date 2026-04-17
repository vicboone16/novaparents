/**
 * Parent Progress — Weekly points graph
 */

import { useEffect, useState, useCallback } from 'react';
import { useParentChild } from '@/hooks/useParentChild';
import { getWeekInsights, type ParentInsight } from '@/lib/parent-insights-dal';
import { usePageFocusRefresh } from '@/hooks/usePageFocusRefresh';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function ParentProgressPage() {
  const { childId, childName } = useParentChild();
  const [insights, setInsights] = useState<ParentInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!childId) { setLoading(false); return; }
    getWeekInsights(childId, 7).then((data) => {
      setInsights(data);
      setLoading(false);
    });
  }, [childId]);

  useEffect(() => { load(); }, [load]);
  usePageFocusRefresh(load);

  const chartData = (() => {
    const days: { label: string; points: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const match = insights.find((ins) => ins.insight_date === dateStr);
      days.push({ label: dayLabel, points: match?.points_earned ?? 0 });
    }
    return days;
  })();

  const totalWeekPoints = chartData.reduce((s, d) => s + d.points, 0);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="rounded-2xl bg-muted h-32" />
        <div className="rounded-xl bg-muted h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="rounded-2xl gradient-hero p-5 text-primary-foreground shadow-soft">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6" />
          <div>
            <h2 className="font-display text-lg font-bold">{childName}'s Week</h2>
            <p className="text-sm opacity-80">{totalWeekPoints} points this week</p>
          </div>
        </div>
      </section>

      {/* Chart */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <h3 className="font-display text-sm font-bold text-foreground mb-4">Daily Points</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: 13,
                }}
              />
              <Line
                type="monotone"
                dataKey="points"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Encouragement */}
      {totalWeekPoints === 0 ? (
        <section className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
          <p className="text-sm text-muted-foreground">
            No data for this week yet. Check back as the week progresses! 🌱
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-soft text-center">
          <p className="text-sm text-foreground font-medium">
            Great week! {childName} is building positive habits every day. 🌟
          </p>
        </section>
      )}
    </div>
  );
}
