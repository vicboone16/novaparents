/**
 * Progress Page
 * ─────────────
 * Dual view: Learner Progress + Coach Growth
 */

import { useState, useEffect } from 'react';
import { BarChart3, TrendingDown, Calendar, Bell, Award, BookOpen, PenLine } from 'lucide-react';
import { getCurrentUser } from '@/lib/dal';
import { getAllEvents, computeCoachScore, getRubric } from '@/lib/engagement';

const TOTAL_LESSONS = 11;

export default function ProgressPage() {
  const [userId, setUserId] = useState('');
  const [tab, setTab] = useState<'learner' | 'coach'>('learner');

  useEffect(() => { getCurrentUser().then(u => { if (u) setUserId(u.id); }); }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Progress</h2>
        <p className="mt-1 text-sm text-muted-foreground">Track Learner trends and your Coach growth.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('learner')}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${
            tab === 'learner' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          Learner Progress
        </button>
        <button
          onClick={() => setTab('coach')}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${
            tab === 'coach' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          Coach Growth
        </button>
      </div>

      {tab === 'learner' ? <LearnerProgress /> : <CoachGrowth userId={userId} />}
    </div>
  );
}

function LearnerProgress() {
  // Load behavior logs from localStorage
  const behaviorLogs = (() => { try { return JSON.parse(localStorage.getItem('bd_behavior_log') || '[]'); } catch { return []; } })();
  const freqLogs = (() => { try { return JSON.parse(localStorage.getItem('bd_frequency_log') || '[]'); } catch { return []; } })();
  const durLogs = (() => { try { return JSON.parse(localStorage.getItem('bd_duration_log') || '[]'); } catch { return []; } })();

  const totalLogs = behaviorLogs.length + freqLogs.length + durLogs.length;

  // Simple weekly grouping
  const today = new Date();
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyData = weekDays.map((day, i) => {
    const target = new Date(today);
    const diff = (today.getDay() || 7) - (i + 1);
    target.setDate(today.getDate() - diff);
    const dateStr = target.toISOString().split('T')[0];
    const count = behaviorLogs.filter((l: any) => l.date === dateStr).length;
    return { day, count };
  });
  const maxCount = Math.max(...weeklyData.map(d => d.count), 1);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={PenLine} label="Total Data Logs" value={String(totalLogs)} color="text-primary" />
        <StatCard icon={BarChart3} label="ABC Entries" value={String(behaviorLogs.length)} color="text-secondary" />
        <StatCard icon={Calendar} label="Logging Streak" value="—" color="text-accent" sub="Syncs with backend" />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="font-display font-bold text-foreground mb-4">Weekly Behavior Log</h3>
        <div className="flex items-end gap-3 h-32">
          {weeklyData.map(d => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-semibold text-foreground">{d.count}</span>
              <div className="w-full rounded-lg gradient-hero transition-all duration-500" style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: '4px' }} />
              <span className="text-[10px] text-muted-foreground">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-4 w-4 text-secondary" />
          <h3 className="font-display font-bold text-foreground text-sm">Reminders</h3>
        </div>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
            <p className="text-muted-foreground">Log today's behaviors to keep your data current.</p>
          </li>
          <li className="flex items-start gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-secondary mt-1.5 shrink-0" />
            <p className="text-muted-foreground">Create a Weekly Snapshot when you have enough data.</p>
          </li>
        </ul>
      </div>
    </div>
  );
}

function CoachGrowth({ userId }: { userId: string }) {
  if (!userId) return null;

  const score = computeCoachScore(userId, TOTAL_LESSONS);
  const rubric = getRubric();
  const events = getAllEvents().filter(e => e.userId === userId);
  const lessonsCompleted = new Set(events.filter(e => e.eventType === 'lesson_complete').map(e => e.meta.lessonKey as string)).size;
  const reflections = events.filter(e => e.eventType === 'reflection_submitted').length;
  const quizzes = events.filter(e => e.eventType === 'micro_quiz_submit').length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Score card */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card text-center">
        <Award className="h-8 w-8 text-primary mx-auto mb-2" />
        <p className="font-display text-4xl font-bold text-foreground">{score.totalScore}</p>
        <p className="text-sm text-muted-foreground">Coach Engagement Score</p>
        <span className={`inline-block mt-2 rounded-full px-3 py-1 text-xs font-bold ${score.billingEligible ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
          {score.billingEligible ? 'Eligible' : 'In Progress'}
        </span>
      </div>

      {/* Breakdown */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
        <h3 className="font-display font-bold text-foreground text-sm">Score Breakdown</h3>
        {score.breakdown.map((b, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground">{b.category} <span className="text-muted-foreground">({Math.round(rubric[i].weight * 100)}%)</span></span>
              <span className="font-semibold text-foreground">{b.score}/100</span>
            </div>
            <div className="h-2 rounded-full bg-border overflow-hidden">
              <div className="h-full rounded-full gradient-hero transition-all" style={{ width: `${b.score}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Activity stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={BookOpen} label="Lessons" value={`${lessonsCompleted}/${TOTAL_LESSONS}`} color="text-primary" />
        <StatCard icon={PenLine} label="Reflections" value={String(reflections)} color="text-accent" />
        <StatCard icon={BarChart3} label="Quizzes" value={String(quizzes)} color="text-secondary" />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, sub }: { icon: React.ElementType; label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
      <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
      <p className="font-display text-xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {sub && <p className="text-[9px] text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  );
}
