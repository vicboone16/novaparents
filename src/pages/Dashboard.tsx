/**
 * Coach Dashboard (Home)
 * ──────────────────────
 * Why Loop: first-time → 2-card onboarding; returning → guided next step.
 * Hero integrates progress ring with welcome message.
 */

import { useEffect, useState } from 'react';
import {
  BookOpen, PenLine, Lightbulb, ArrowRight,
  Package, CheckCircle2, AlertTriangle, Clock, Zap, Brain, User, Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/dal';
import { useUserAccess } from '@/contexts/UserAccessContext';
import { getLocalLearners, type LocalLearner } from '@/components/IndependentLearnerForm';
import { Button } from '@/components/ui/button';
import { fetchSnapshots, getStatusDisplay, type WeeklySnapshot, type SnapshotStatus } from '@/lib/snapshots';
import { getMyTrainingProgress } from '@/lib/parent-training-dal';
import { getStreak, recordActivity, getStreakMilestone, checkStreakRecovery, recoverStreak, STREAK_RECOVERY_COST, type UserStreak } from '@/lib/streaks';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

const ONBOARDING_KEY = 'bd_onboarding_complete';
const GROWTH_LEVELS = [
  { level: 1, name: 'Observer', xpNeeded: 0, emoji: '👀' },
  { level: 2, name: 'Behavior Detective', xpNeeded: 100, emoji: '🔍' },
  { level: 3, name: 'Reinforcement Reader', xpNeeded: 250, emoji: '📖' },
  { level: 4, name: 'Pattern Spotter', xpNeeded: 500, emoji: '🧩' },
  { level: 5, name: 'Confident Coach', xpNeeded: 1000, emoji: '🌟' },
];

const snapshotStatusConfig: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  draft: { label: 'Saved', cls: 'bg-muted text-muted-foreground', icon: Package },
  submitted: { label: 'Submitted', cls: 'bg-warning/10 text-warning', icon: Clock },
  pending_review: { label: 'Pending Review', cls: 'bg-warning/10 text-warning', icon: Clock },
  reviewed: { label: 'Reviewed', cls: 'bg-success/10 text-success', icon: CheckCircle2 },
  returned: { label: 'Returned', cls: 'bg-secondary/10 text-secondary', icon: AlertTriangle },
};

function getLocalLessonCount(): number {
  try {
    const progress = JSON.parse(localStorage.getItem('bd_curriculum_progress') || '{}');
    return Object.keys(progress).filter(k => progress[k]).length;
  } catch { return 0; }
}

function getLabGamesCompleted(): number {
  try {
    const data = JSON.parse(localStorage.getItem('bd_lab_progress') || '{}');
    return Object.keys(data).length;
  } catch { return 0; }
}

function getCurrentLevel(xp: number) {
  for (let i = GROWTH_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= GROWTH_LEVELS[i].xpNeeded) return GROWTH_LEVELS[i];
  }
  return GROWTH_LEVELS[0];
}

function getNextLevel(xp: number) {
  const current = getCurrentLevel(xp);
  return GROWTH_LEVELS.find(l => l.xpNeeded > current.xpNeeded) || null;
}

function getRecentInsight(): string {
  const insights = [
    'Escape behaviors often happen during transitions — a visual timer can help.',
    "Negative attention still counts as attention. Even saying 'stop' is a response.",
    'When a behavior works for both the Learner and the adult, it gets stronger faster.',
    'Consistency is more important than perfection. Small shifts add up.',
    'Replacement skills work best when they get the same result as the behavior.',
  ];
  const day = Math.floor(Date.now() / 86400000);
  return insights[day % insights.length];
}

export default function Dashboard() {
  const { data: accessData } = useUserAccess();
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [localLearners, setLocalLearners] = useState<LocalLearner[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Progress stats
  const [dbModulesCompleted, setDbModulesCompleted] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [streak, setStreak] = useState<UserStreak>({ currentStreak: 0, longestStreak: 0, lastActivityDate: null });
  const [recovering, setRecovering] = useState(false);

  const isFirstTime = !localStorage.getItem(ONBOARDING_KEY);
  const localLessons = getLocalLessonCount();
  const labGames = getLabGamesCompleted();

  // Combine XP sources
  const combinedXp = totalXp + (localLessons * 25);
  const level = getCurrentLevel(combinedXp);
  const nextLevel = getNextLevel(combinedXp);
  const levelProgress = nextLevel
    ? (combinedXp - level.xpNeeded) / (nextLevel.xpNeeded - level.xpNeeded)
    : 1;

  // Derive clients from context
  const clients = accessData?.students || [];

  useEffect(() => {
    if (accessData) {
      setUserName(accessData.displayName || accessData.email?.split('@')[0] || 'there');
      setUserId(accessData.userId);
    }
  }, [accessData]);

  useEffect(() => {
    getCurrentUser().then(async (user) => {
      if (user) {
        fetchSnapshots().then(snaps => setSnapshots(snaps));

        // Load DB-backed academy progress
        try {
          const progress = await getMyTrainingProgress(user.id);
          const completed = progress.filter(p => p.status === 'completed');
          setDbModulesCompleted(completed.length);
          setTotalXp(progress.reduce((sum, p) => sum + (p.xp_earned || 0), 0));
        } catch { /* ignore */ }

        // Load & record streak
        try {
          const s = await getStreak(user.id);
          setStreak(s);
          const hasActivity = localLessons > 0 || labGames > 0;
          if (hasActivity) {
            const updated = await recordActivity(user.id);
            setStreak(updated);
            const milestone = getStreakMilestone(updated.currentStreak);
            if (milestone) {
              toast({
                title: `${milestone.emoji} Streak Milestone!`,
                description: milestone.message,
              });
            }
          }
        } catch { /* ignore */ }
      }
    });
    setLocalLearners(getLocalLearners());
  }, []);

  function handleStartLearning() {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    navigate('/academy');
  }

  function handleQuickSupport() {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    navigate('/toolkit?tab=translator');
  }

  const latestSnapshot = snapshots[0] || null;
  const returnedSnapshot = snapshots.find(s => s.status === 'returned');
  const totalModules = dbModulesCompleted + localLessons;

  // ─── First-time: 2-card onboarding ────────────────
  if (isFirstTime) {
    return (
      <div className="space-y-5 animate-fade-in">
        {/* Welcome */}
        <section className="rounded-2xl gradient-hero p-6 text-primary-foreground shadow-soft text-center space-y-2">
          <h2 className="font-display text-xl font-bold">Welcome to Behavior Decoded™</h2>
          <p className="text-sm text-primary-foreground/80">
            Understanding behavior starts here. Let's take your first step.
          </p>
        </section>

        {/* Card 1: Start Learning */}
        <button
          onClick={handleStartLearning}
          className="w-full rounded-2xl border border-primary/20 bg-card p-5 shadow-soft hover:shadow-md transition-all text-left space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-foreground text-lg">🌟 Start Here</h3>
              <p className="text-sm text-muted-foreground">
                Understanding Why Behavior Happens
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">5 minutes</p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary shrink-0" />
          </div>
        </button>

        {/* Card 2: Quick Support */}
        <button
          onClick={handleQuickSupport}
          className="w-full rounded-2xl border border-secondary/20 bg-card p-5 shadow-soft hover:shadow-md transition-all text-left space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10">
              <Zap className="h-6 w-6 text-secondary" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-foreground text-lg">🔵 Need help right now?</h3>
              <p className="text-sm text-muted-foreground">
                Translate a behavior and get a plan
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-secondary shrink-0" />
          </div>
        </button>
      </div>
    );
  }

  // ─── Returning user dashboard ──────────────────────
  return (
    <div className="space-y-5">
      {/* Welcome + Progress Hero (merged) */}
      <section className="rounded-2xl gradient-hero p-5 text-primary-foreground shadow-soft">
        <div className="flex items-center gap-4">
          {/* Progress ring */}
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-20" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeDasharray={`${Math.min(levelProgress, 1) * 94.2} 94.2`}
                strokeLinecap="round" />
            </svg>
            <div className="text-center">
              <p className="font-display text-sm font-bold leading-none">L{level.level}</p>
              <p className="text-[8px] opacity-80">{Math.round(levelProgress * 100)}%</p>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-display text-lg font-bold leading-tight">Welcome back, {userName}!</h2>
            <p className="text-[11px] opacity-80 mt-0.5">{level.emoji} {level.name}</p>
            {nextLevel && (
              <p className="text-[10px] opacity-70 mt-0.5">{nextLevel.xpNeeded - combinedXp} XP to {nextLevel.name}</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mt-4 sm:grid-cols-5">
          <div className="rounded-xl bg-primary-foreground/10 p-2.5 text-center">
            <p className="font-display text-lg font-bold">
              <span className={streak.currentStreak > 0 ? 'animate-flame' : ''}>🔥</span> {streak.currentStreak}
            </p>
            <p className="text-[9px] opacity-80">Day Streak</p>
            {streak.longestStreak > 0 && (
              <p className="text-[8px] opacity-60">Best: {streak.longestStreak}</p>
            )}
          </div>
          <div className="rounded-xl bg-primary-foreground/10 p-2.5 text-center">
            <p className="font-display text-lg font-bold">{combinedXp}</p>
            <p className="text-[9px] opacity-80">XP</p>
          </div>
          <div className="rounded-xl bg-primary-foreground/10 p-2.5 text-center">
            <p className="font-display text-lg font-bold">{totalModules}</p>
            <p className="text-[9px] opacity-80">Modules</p>
          </div>
          <div className="rounded-xl bg-primary-foreground/10 p-2.5 text-center">
            <p className="font-display text-lg font-bold">{labGames}</p>
            <p className="text-[9px] opacity-80">Lab</p>
          </div>
          <div className="rounded-xl bg-primary-foreground/10 p-2.5 text-center">
            <p className="font-display text-lg font-bold">{snapshots.length}</p>
            <p className="text-[9px] opacity-80">Snapshots</p>
          </div>
        </div>
      </section>

      {/* Streak Recovery Banner */}
      {(() => {
        const recovery = checkStreakRecovery(streak, combinedXp);
        if (!recovery.canRecover) return null;
        return (
          <section className="rounded-xl border border-secondary/30 bg-secondary/5 p-4 space-y-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-lg">💔</span>
              <div className="flex-1">
                <p className="font-display font-bold text-foreground text-sm">Streak Lost!</p>
                <p className="text-xs text-muted-foreground">
                  You missed a day. Spend {STREAK_RECOVERY_COST} XP to restore your streak.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1.5"
              disabled={recovering}
              onClick={async () => {
                setRecovering(true);
                try {
                  const updated = await recoverStreak(userId);
                  setStreak(updated);
                  setTotalXp(prev => prev - STREAK_RECOVERY_COST);
                  toast({
                    title: '🔥 Streak Restored!',
                    description: `Your ${updated.currentStreak}-day streak is back! Keep going.`,
                  });
                } catch {
                  toast({ title: 'Error', description: 'Could not recover streak.', variant: 'destructive' });
                }
                setRecovering(false);
              }}
            >
              <Zap className="h-3.5 w-3.5" />
              {recovering ? 'Restoring…' : `Restore Streak (−${STREAK_RECOVERY_COST} XP)`}
            </Button>
          </section>
        );
      })()}

      {/* Returned snapshot notice */}
      {returnedSnapshot && (
        <section className="rounded-xl border border-secondary/30 bg-secondary/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-secondary" />
            <h3 className="font-display font-bold text-foreground text-sm">Snapshot Returned</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Your support team returned a snapshot: "{returnedSnapshot.title || 'Weekly Snapshot'}".
          </p>
          <Link to="/insights">
            <Button size="sm" variant="outline" className="w-full gap-1.5 mt-1">View in My Insights</Button>
          </Link>
        </section>
      )}

      {/* My Learners */}
      {(clients.length > 0 || localLearners.length > 0) && (
        <section className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> My Learner(s)
          </h3>
          <ul className="space-y-1.5">
            {clients.map(c => (
              <li key={c.id} className="flex items-center gap-2 text-sm text-foreground">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{c.first_name} {c.last_name}</span>
              </li>
            ))}
            {localLearners.map(l => (
              <li key={l.id} className="flex items-center gap-2 text-sm text-foreground">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{l.firstName} {l.lastName}</span>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Local</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Your Next Step + Quick Support */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/academy"
          className="rounded-xl border border-primary/20 bg-card p-4 shadow-soft hover:shadow-md transition-all space-y-2"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">🌿 Your Next Step</p>
              <p className="text-sm font-semibold text-foreground truncate">Continue Learning</p>
            </div>
            <ArrowRight className="h-4 w-4 text-primary shrink-0" />
          </div>
        </Link>

        <Link
          to="/toolkit?tab=translator"
          className="rounded-xl border border-secondary/20 bg-card p-4 shadow-soft hover:shadow-md transition-all space-y-2"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10">
              <Zap className="h-4 w-4 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary">⚡ Quick Support</p>
              <p className="text-sm font-semibold text-foreground truncate">Translate a Behavior</p>
            </div>
            <ArrowRight className="h-4 w-4 text-secondary shrink-0" />
          </div>
        </Link>
      </div>

      {/* Recent Insight */}
      <section className="rounded-xl border border-primary/20 bg-card p-4 shadow-soft">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">🧠 Recent Insight</span>
        </div>
        <p className="text-sm text-foreground italic">"{getRecentInsight()}"</p>
      </section>

      {/* Weekly Snapshot */}
      <Link to="/insights" className="block">
        <section className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3 hover:shadow-soft transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">Weekly Snapshot</span>
            </div>
            {latestSnapshot && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${(snapshotStatusConfig[latestSnapshot.status] || snapshotStatusConfig.draft).cls}`}>
                {(snapshotStatusConfig[latestSnapshot.status] || snapshotStatusConfig.draft).label}
              </span>
            )}
          </div>

          {latestSnapshot ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground truncate">{latestSnapshot.title || 'Weekly Snapshot'}</p>
              <p className="text-xs text-muted-foreground">
                Created {new Date(latestSnapshot.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Create your first Weekly Snapshot to track patterns and share progress.</p>
          )}

          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary">
            <ArrowRight className="h-3.5 w-3.5" /> View My Insights
          </div>
        </section>
      </Link>

      {/* Quick Actions */}
      <section>
        <h3 className="font-display text-sm font-bold text-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { to: '/log', icon: PenLine, label: 'Log Data', color: 'bg-secondary/10 text-secondary' },
            { to: '/insights/new', icon: Package, label: 'Weekly Snapshot', color: 'bg-primary/10 text-primary' },
            { to: '/toolkit?tab=reinforcing', icon: Lightbulb, label: 'Is This Reinforcing?', color: 'bg-accent/10 text-accent' },
          ].map((action, i) => (
            <Link
              key={i}
              to={action.to}
              className="flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl border border-border bg-card p-3 sm:p-4 shadow-card hover:shadow-soft transition-all text-center"
            >
              <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl ${action.color}`}>
                <action.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-foreground leading-tight">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
