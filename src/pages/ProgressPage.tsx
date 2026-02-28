import { BarChart3, TrendingDown, TrendingUp, Bell, Calendar } from 'lucide-react';

const weeklyData = [
  { day: 'Mon', count: 3 },
  { day: 'Tue', count: 5 },
  { day: 'Wed', count: 2 },
  { day: 'Thu', count: 4 },
  { day: 'Fri', count: 1 },
  { day: 'Sat', count: 2 },
  { day: 'Sun', count: 1 },
];

const maxCount = Math.max(...weeklyData.map((d) => d.count));

export default function ProgressPage() {
  const totalThisWeek = weeklyData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Progress & Reminders
        </h2>
        <p className="mt-1 text-muted-foreground">
          Track trends and stay consistent with your plan.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <BarChart3 className="h-4 w-4" />
            This Week
          </div>
          <p className="font-display text-3xl font-bold text-foreground">{totalThisWeek}</p>
          <p className="text-xs text-muted-foreground mt-1">behavior entries logged</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 text-success text-sm mb-2">
            <TrendingDown className="h-4 w-4" />
            Trend
          </div>
          <p className="font-display text-3xl font-bold text-success">↓ 23%</p>
          <p className="text-xs text-muted-foreground mt-1">fewer incidents vs last week</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 text-primary text-sm mb-2">
            <Calendar className="h-4 w-4" />
            Streak
          </div>
          <p className="font-display text-3xl font-bold text-primary">5 days</p>
          <p className="text-xs text-muted-foreground mt-1">consistent logging</p>
        </div>
      </div>

      {/* Simple Bar Chart */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h3 className="font-display font-bold text-foreground mb-4">Weekly Overview</h3>
        <div className="flex items-end gap-3 h-40">
          {weeklyData.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-semibold text-foreground">{d.count}</span>
              <div
                className="w-full rounded-lg gradient-hero transition-all duration-500"
                style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: '8px' }}
              />
              <span className="text-xs text-muted-foreground">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reminders */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-secondary" />
          <h3 className="font-display font-bold text-foreground">Reminders</h3>
        </div>
        <ul className="space-y-3">
          <li className="flex items-start gap-3 text-sm">
            <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Complete Module 3: Identifying Triggers</p>
              <p className="text-muted-foreground">You're almost there — just one section left!</p>
            </div>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <div className="h-2 w-2 rounded-full bg-secondary mt-1.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Log today's behaviors</p>
              <p className="text-muted-foreground">Keeping a consistent log helps your agency team support you better.</p>
            </div>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <div className="h-2 w-2 rounded-full bg-accent mt-1.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Review coaching tip: Transitions</p>
              <p className="text-muted-foreground">Based on your recent logs, this topic might be helpful.</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
