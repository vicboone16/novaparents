/**
 * Nova Academy™
 * ─────────────
 * "Small skills. Big shifts."
 * Skill paths, progress ring, streak, XP, lesson shells.
 */

import { useState, useMemo } from 'react';
import { BookOpen, Flame, Star, ChevronRight, CheckCircle2, Lock, Play, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurriculumProgress, markLessonComplete } from '@/lib/dal';
import { logEvent } from '@/lib/engagement';
import { getCurrentUser } from '@/lib/dal';
import { useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────

interface Lesson {
  id: string;
  title: string;
  description: string;
  type: 'lesson' | 'quiz' | 'interactive';
}

interface SkillPath {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  lessons: Lesson[];
}

// ─── Skill Paths ─────────────────────────────────────────

const SKILL_PATHS: SkillPath[] = [
  { id: 'foundations', title: 'Foundations', subtitle: 'The basics of behavior', emoji: '🧱', lessons: [
    { id: 'f1', title: 'What Is Behavior?', description: 'Everything a person does — visible and invisible.', type: 'lesson' },
    { id: 'f2', title: 'The ABCs', description: 'Antecedent, Behavior, Consequence — the building blocks.', type: 'lesson' },
    { id: 'f3', title: 'Behavior as Communication', description: 'All behavior is trying to tell us something.', type: 'lesson' },
    { id: 'f-quiz', title: 'Foundations Quiz', description: 'Test your understanding of behavior basics.', type: 'quiz' },
  ]},
  { id: 'functions', title: 'Functions of Behavior', subtitle: 'Why behaviors happen', emoji: '🎯', lessons: [
    { id: 'fn1', title: 'Attention', description: 'When behavior is maintained by social responses.', type: 'lesson' },
    { id: 'fn2', title: 'Escape', description: 'When behavior helps avoid or delay something.', type: 'lesson' },
    { id: 'fn3', title: 'Tangible', description: 'When behavior is about getting something specific.', type: 'lesson' },
    { id: 'fn4', title: 'Sensory', description: 'When behavior meets an internal or sensory need.', type: 'lesson' },
    { id: 'fn-quiz', title: 'Functions Quiz', description: 'Identify the function in real scenarios.', type: 'quiz' },
  ]},
  { id: 'reinforcement', title: 'Reinforcement Mastery', subtitle: 'What strengthens behavior', emoji: '💪', lessons: [
    { id: 'r1', title: 'Positive vs Negative Reinforcement', description: 'Adding something vs removing something.', type: 'lesson' },
    { id: 'r2', title: 'What Strengthens Behavior?', description: 'Understanding the reinforcement cycle.', type: 'lesson' },
    { id: 'r3', title: 'Adult Reinforcement Awareness', description: 'How adults get reinforced too.', type: 'lesson' },
    { id: 'r-quiz', title: 'Reinforcement Quiz', description: 'Spot reinforcement in everyday situations.', type: 'quiz' },
  ]},
  { id: 'loop', title: 'The Behavior Loop™', subtitle: 'Learner ↔ adult cycles', emoji: '🔄', lessons: [
    { id: 'l1', title: 'Understanding the Loop', description: 'How learner and adult behavior reinforce each other.', type: 'lesson' },
    { id: 'l2', title: 'Breaking the Loop', description: 'Strategies to interrupt unhelpful cycles.', type: 'lesson' },
    { id: 'l-interactive', title: 'Who Was Reinforced?', description: 'Interactive scenarios to test your understanding.', type: 'interactive' },
  ]},
  { id: 'replacement', title: 'Replacement Builder™', subtitle: 'Teaching new skills', emoji: '🔧', lessons: [
    { id: 'rb1', title: 'What Is a Replacement Behavior?', description: 'A better way to get the same thing.', type: 'lesson' },
    { id: 'rb2', title: 'Matching Function to Skill', description: 'The replacement must serve the same purpose.', type: 'lesson' },
    { id: 'rb3', title: 'Teaching Steps', description: 'Model → prompt → practice → reinforce.', type: 'lesson' },
  ]},
  { id: 'data', title: 'Data Detective™', subtitle: 'Making sense of patterns', emoji: '📊', lessons: [
    { id: 'd1', title: 'Why Track Data?', description: 'Data tells the story behavior can\'t.', type: 'lesson' },
    { id: 'd2', title: 'ABC vs Frequency vs Duration', description: 'When to use which type of data collection.', type: 'lesson' },
    { id: 'd3', title: 'Reading Your Patterns', description: 'What your data is telling you.', type: 'lesson' },
  ]},
  { id: 'transitions', title: 'Transition Planning', subtitle: 'Smooth changes', emoji: '🚦', lessons: [
    { id: 't1', title: 'Why Transitions Are Hard', description: 'Shifting from preferred to non-preferred.', type: 'lesson' },
    { id: 't2', title: 'Transition Strategies', description: 'Timers, warnings, choices, and visuals.', type: 'lesson' },
  ]},
  { id: 'regulation', title: 'Emotional Regulation', subtitle: 'Managing big feelings', emoji: '🧘', lessons: [
    { id: 'er1', title: 'Understanding Regulation', description: 'Why some feelings feel too big.', type: 'lesson' },
    { id: 'er2', title: 'Co-regulation First', description: 'You regulate, they learn to regulate.', type: 'lesson' },
    { id: 'er3', title: 'Teaching Self-Regulation', description: 'Building the skills over time.', type: 'lesson' },
  ]},
  { id: 'application', title: 'Real-Life Application', subtitle: 'Putting it all together', emoji: '🌎', lessons: [
    { id: 'app1', title: 'Home Scenarios', description: 'Applying skills at home.', type: 'lesson' },
    { id: 'app2', title: 'School Scenarios', description: 'Applying skills at school.', type: 'lesson' },
    { id: 'app3', title: 'Community Scenarios', description: 'Applying skills in public.', type: 'lesson' },
  ]},
  { id: 'mastery', title: 'Mastery Path', subtitle: 'Advanced scenarios', emoji: '🏆', lessons: [
    { id: 'm1', title: 'Complex Functions', description: 'When behavior serves multiple functions.', type: 'lesson' },
    { id: 'm2', title: 'Extinction Bursts', description: 'Why things get worse before they get better.', type: 'lesson' },
    { id: 'm3', title: 'Generalization', description: 'Making skills work everywhere.', type: 'lesson' },
    { id: 'm-final', title: 'Mastery Assessment', description: 'Prove your understanding.', type: 'quiz' },
  ]},
];

export default function NovaAcademyPage() {
  const [userId, setUserId] = useState('');
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [activePath, setActivePath] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser().then(u => { if (u) setUserId(u.id); });
    setProgress(getCurriculumProgress());
  }, []);

  const totalLessons = SKILL_PATHS.reduce((sum, p) => sum + p.lessons.length, 0);
  const completedCount = Object.keys(progress).filter(k => progress[k]).length;
  const xp = completedCount * 25;
  const level = Math.floor(xp / 100) + 1;
  const levelProgress = (xp % 100) / 100;

  // Streak (simplified — based on consecutive days with completions)
  const streak = getStreak();

  const selectedPath = SKILL_PATHS.find(p => p.id === activePath);

  function handleCompleteLesson(lessonId: string) {
    markLessonComplete(lessonId);
    setProgress(p => ({ ...p, [lessonId]: true }));
    if (userId) {
      logEvent(userId, 'lesson_completed', { lessonId });
    }
    setActiveLesson(null);
  }

  // ─── Active lesson view ────────────────────────────
  if (activeLesson && selectedPath) {
    const lesson = selectedPath.lessons.find(l => l.id === activeLesson);
    if (!lesson) return null;
    const isComplete = progress[lesson.id];

    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => setActiveLesson(null)} className="flex items-center gap-1 text-sm text-primary font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back to {selectedPath.title}
        </button>

        <div className="rounded-2xl border border-primary/20 bg-card p-6 shadow-soft space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{selectedPath.emoji}</span>
            <div>
              <h3 className="font-display font-bold text-foreground text-lg">{lesson.title}</h3>
              <p className="text-sm text-muted-foreground">{lesson.description}</p>
            </div>
          </div>

          {/* Lesson content placeholder */}
          <div className="rounded-xl bg-muted/30 p-8 text-center space-y-3">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
            <p className="text-sm text-muted-foreground">
              {lesson.type === 'quiz' ? 'Quiz content coming soon!' :
               lesson.type === 'interactive' ? 'Interactive content coming soon!' :
               'Lesson content coming soon!'}
            </p>
            <p className="text-xs text-muted-foreground">
              Full content will be added in a future update. For now, mark as complete to track your progress.
            </p>
          </div>

          {!isComplete ? (
            <Button onClick={() => handleCompleteLesson(lesson.id)} className="w-full gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Mark Complete (+25 XP)
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-success text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Completed!
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Path detail view ──────────────────────────────
  if (selectedPath) {
    const pathComplete = selectedPath.lessons.filter(l => progress[l.id]).length;
    const pathTotal = selectedPath.lessons.length;

    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => setActivePath(null)} className="flex items-center gap-1 text-sm text-primary font-semibold">
          <ArrowLeft className="h-4 w-4" /> All Skill Paths
        </button>

        <div className="rounded-2xl gradient-hero p-5 text-primary-foreground">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{selectedPath.emoji}</span>
            <div>
              <h3 className="font-display text-xl font-bold">{selectedPath.title}</h3>
              <p className="text-sm text-primary-foreground/80">{selectedPath.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 h-2 rounded-full bg-primary-foreground/20 overflow-hidden">
              <div className="h-full rounded-full bg-primary-foreground transition-all duration-500" style={{ width: `${(pathComplete / pathTotal) * 100}%` }} />
            </div>
            <span className="text-xs font-bold">{pathComplete}/{pathTotal}</span>
          </div>
        </div>

        <div className="space-y-2">
          {selectedPath.lessons.map((lesson, i) => {
            const done = progress[lesson.id];
            const prevDone = i === 0 || progress[selectedPath.lessons[i - 1].id];
            const locked = !prevDone && !done;

            return (
              <button
                key={lesson.id}
                onClick={() => !locked && setActiveLesson(lesson.id)}
                disabled={locked}
                className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                  done ? 'border-success/20 bg-success/5' :
                  locked ? 'border-border bg-muted/30 opacity-50' :
                  'border-border bg-card shadow-card hover:border-primary/30'
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  done ? 'bg-success/10' : locked ? 'bg-muted' : 'bg-primary/10'
                }`}>
                  {done ? <CheckCircle2 className="h-4 w-4 text-success" /> :
                   locked ? <Lock className="h-4 w-4 text-muted-foreground" /> :
                   <Play className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{lesson.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{lesson.description}</p>
                </div>
                {!locked && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Academy home ──────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="font-display text-2xl font-bold text-foreground">Nova Academy™</h2>
        <p className="text-sm text-muted-foreground">Small skills. Big shifts.</p>
      </div>

      {/* Progress ring + stats */}
      <div className="rounded-2xl gradient-hero p-5 text-primary-foreground">
        <div className="flex items-center gap-5">
          {/* Progress ring */}
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-20" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeDasharray={`${(completedCount / totalLessons) * 94.2} 94.2`}
                strokeLinecap="round" />
            </svg>
            <div className="text-center">
              <p className="font-display text-lg font-bold leading-none">L{level}</p>
              <p className="text-[9px] opacity-80">{Math.round(levelProgress * 100)}%</p>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex gap-4">
              <div>
                <p className="font-display text-xl font-bold">{xp}</p>
                <p className="text-[10px] opacity-80">XP</p>
              </div>
              <div>
                <p className="font-display text-xl font-bold flex items-center gap-1">
                  {streak} <Flame className="h-4 w-4" />
                </p>
                <p className="text-[10px] opacity-80">Day Streak</p>
              </div>
              <div>
                <p className="font-display text-xl font-bold">{completedCount}</p>
                <p className="text-[10px] opacity-80">Done</p>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-primary-foreground/20 overflow-hidden">
              <div className="h-full rounded-full bg-primary-foreground transition-all duration-500" style={{ width: `${(completedCount / totalLessons) * 100}%` }} />
            </div>
            <p className="text-[10px] opacity-80">{completedCount} of {totalLessons} lessons complete</p>
          </div>
        </div>
      </div>

      {/* Continue Learning */}
      {completedCount > 0 && completedCount < totalLessons && (
        <ContinueLearningCard paths={SKILL_PATHS} progress={progress} onSelect={(pathId) => setActivePath(pathId)} />
      )}

      {/* Skill Paths */}
      <div>
        <h3 className="font-display text-sm font-bold text-foreground mb-3">Skill Paths</h3>
        <div className="space-y-2">
          {SKILL_PATHS.map(path => {
            const done = path.lessons.filter(l => progress[l.id]).length;
            const total = path.lessons.length;
            const pct = total > 0 ? (done / total) * 100 : 0;

            return (
              <button
                key={path.id}
                onClick={() => setActivePath(path.id)}
                className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card hover:border-primary/30 hover:shadow-soft transition-all text-left"
              >
                <span className="text-2xl">{path.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{path.title}</p>
                  <p className="text-[10px] text-muted-foreground">{path.subtitle}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-semibold">{done}/{total}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────

function ContinueLearningCard({ paths, progress, onSelect }: {
  paths: SkillPath[]; progress: Record<string, boolean>; onSelect: (pathId: string) => void;
}) {
  // Find first incomplete path
  for (const path of paths) {
    const incomplete = path.lessons.find(l => !progress[l.id]);
    if (incomplete) {
      return (
        <button
          onClick={() => onSelect(path.id)}
          className="w-full rounded-xl border border-primary/20 bg-card p-4 shadow-soft flex items-center gap-3 hover:bg-primary/5 transition-all text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Play className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-primary font-semibold uppercase">Continue Learning</p>
            <p className="text-sm font-semibold text-foreground truncate">{incomplete.title}</p>
            <p className="text-[10px] text-muted-foreground">{path.title}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-primary shrink-0" />
        </button>
      );
    }
  }
  return null;
}

function getStreak(): number {
  try {
    const streakData = JSON.parse(localStorage.getItem('bd_streak') || '{"count":0,"lastDate":""}');
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (streakData.lastDate === today) return streakData.count;
    if (streakData.lastDate === yesterday) return streakData.count;
    return 0;
  } catch { return 0; }
}
