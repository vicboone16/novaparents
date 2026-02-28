import { useState, useEffect } from 'react';
import { BookOpen, CheckCircle2, Lock, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Lesson {
  title: string;
  content: string;
  actionStep: string;
  reflection: string;
}

interface Module {
  id: number;
  title: string;
  description: string;
  lessons: Lesson[];
}

const modules: Module[] = [
  {
    id: 1, title: 'Understanding Behavior', description: 'Learn why behavior happens and what it communicates.',
    lessons: [
      { title: 'Behavior Is Communication', content: 'All behavior serves a purpose. When a child acts out, they are communicating a need — for attention, escape, a tangible item, or sensory input.', actionStep: 'Today, when you see a challenging behavior, pause and ask: "What is my client trying to tell me?"', reflection: 'What need do you think was behind the last challenging behavior you saw?' },
      { title: 'The Four Functions', content: 'Behavior generally falls into four functions: Attention, Escape, Tangible, and Sensory. Understanding which function drives a behavior helps you respond effectively.', actionStep: 'Pick one behavior you see often and try to identify its function.', reflection: 'Which function do you think applies most to your client?' },
    ],
  },
  {
    id: 2, title: 'The ABCs of Behavior', description: 'Antecedent, Behavior, Consequence — the building blocks.',
    lessons: [
      { title: 'What Are ABCs?', content: 'A = Antecedent (what happens before), B = Behavior (what the person does), C = Consequence (what happens after). This framework helps you see patterns.', actionStep: 'Write down one ABC sequence from today.', reflection: 'Was the consequence reinforcing the behavior or discouraging it?' },
      { title: 'Finding Patterns', content: 'When you track ABCs over time, patterns emerge. You might notice behaviors happen at specific times, places, or after particular triggers.', actionStep: 'Review your behavior log and look for repeating antecedents.', reflection: 'Did you notice any patterns? What surprised you?' },
    ],
  },
  {
    id: 3, title: 'Identifying Triggers', description: 'Recognize what sets off challenging behaviors.',
    lessons: [
      { title: 'Common Triggers', content: 'Triggers include transitions, demands, sensory overload, hunger, fatigue, and changes in routine. Knowing triggers lets you prepare.', actionStep: 'List 3 situations where challenging behavior tends to happen.', reflection: 'Can you modify any of these triggers to prevent the behavior?' },
    ],
  },
  { id: 4, title: 'Replacement Behaviors', description: 'Teach alternatives that meet the same need.', lessons: [{ title: 'Coming Soon', content: 'This module is being prepared.', actionStep: 'Stay tuned!', reflection: '' }] },
  { id: 5, title: 'Reinforcement Strategies', description: 'Effective ways to encourage positive behavior.', lessons: [{ title: 'Coming Soon', content: 'This module is being prepared.', actionStep: 'Stay tuned!', reflection: '' }] },
  { id: 6, title: 'Managing Crisis Moments', description: 'Stay calm and respond effectively during escalation.', lessons: [{ title: 'Coming Soon', content: 'This module is being prepared.', actionStep: 'Stay tuned!', reflection: '' }] },
  { id: 7, title: 'Building Routines', description: 'Create structure that prevents challenging behaviors.', lessons: [{ title: 'Coming Soon', content: 'This module is being prepared.', actionStep: 'Stay tuned!', reflection: '' }] },
  { id: 8, title: 'Celebrating Progress', description: "Recognize growth — yours and your client's.", lessons: [{ title: 'Coming Soon', content: 'This module is being prepared.', actionStep: 'Stay tuned!', reflection: '' }] },
];

const PROGRESS_KEY = 'bd_curriculum_progress';

function loadProgress(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch { return {}; }
}

function saveProgress(p: Record<string, boolean>) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

export default function CurriculumPage() {
  const [progress, setProgress] = useState(loadProgress);
  const [viewing, setViewing] = useState<{ moduleId: number; lessonIdx: number } | null>(null);

  useEffect(() => { saveProgress(progress); }, [progress]);

  function completedCount(mod: Module) {
    return mod.lessons.filter((_, i) => progress[`${mod.id}-${i}`]).length;
  }

  function isModuleUnlocked(mod: Module) {
    if (mod.id === 1) return true;
    const prev = modules.find(m => m.id === mod.id - 1);
    if (!prev) return true;
    return completedCount(prev) === prev.lessons.length;
  }

  function markComplete(moduleId: number, lessonIdx: number) {
    setProgress(p => ({ ...p, [`${moduleId}-${lessonIdx}`]: true }));
  }

  const totalCompleted = modules.reduce((sum, m) => sum + completedCount(m), 0);
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);

  // Lesson View
  if (viewing) {
    const mod = modules.find(m => m.id === viewing.moduleId)!;
    const lesson = mod.lessons[viewing.lessonIdx];
    const key = `${mod.id}-${viewing.lessonIdx}`;
    const done = !!progress[key];

    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={() => setViewing(null)} className="flex items-center gap-1 text-sm text-primary font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back to Modules
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Module {mod.id}</p>
          <h2 className="font-display text-xl font-bold text-foreground">{lesson.title}</h2>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-4">
          <p className="text-sm text-foreground leading-relaxed">{lesson.content}</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <h4 className="font-display font-bold text-primary text-sm mb-1">✏️ Action Step</h4>
          <p className="text-sm text-foreground">{lesson.actionStep}</p>
        </div>
        {lesson.reflection && (
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
            <h4 className="font-display font-bold text-accent text-sm mb-1">💭 Reflection</h4>
            <p className="text-sm text-foreground">{lesson.reflection}</p>
          </div>
        )}
        <div className="flex items-center justify-between pt-2">
          {viewing.lessonIdx > 0 && (
            <Button variant="outline" size="sm" onClick={() => setViewing({ ...viewing, lessonIdx: viewing.lessonIdx - 1 })}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
          )}
          <div className="flex-1" />
          {!done ? (
            <Button size="sm" onClick={() => markComplete(mod.id, viewing.lessonIdx)}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Complete
            </Button>
          ) : viewing.lessonIdx < mod.lessons.length - 1 ? (
            <Button size="sm" onClick={() => setViewing({ ...viewing, lessonIdx: viewing.lessonIdx + 1 })}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <span className="text-sm font-semibold text-success flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Module Complete!
            </span>
          )}
        </div>
      </div>
    );
  }

  // Module List
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Behavior Decoded™</h2>
        <p className="mt-1 text-sm text-muted-foreground">Complete each module at your own pace.</p>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl bg-muted p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Your Progress</span>
          <span className="text-sm font-bold text-primary">{totalCompleted} of {totalLessons} lessons</span>
        </div>
        <div className="h-3 rounded-full bg-border overflow-hidden">
          <div className="h-full rounded-full gradient-hero transition-all duration-500" style={{ width: `${(totalCompleted / totalLessons) * 100}%` }} />
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-3">
        {modules.map((mod) => {
          const unlocked = isModuleUnlocked(mod);
          const completed = completedCount(mod);
          const allDone = completed === mod.lessons.length;
          return (
            <button
              key={mod.id}
              disabled={!unlocked}
              onClick={() => unlocked && setViewing({ moduleId: mod.id, lessonIdx: 0 })}
              className={`w-full text-left flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:shadow-soft disabled:cursor-not-allowed ${!unlocked ? 'opacity-50' : allDone ? 'border-success/20' : ''}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                {!unlocked ? <Lock className="h-5 w-5 text-muted-foreground" /> :
                  allDone ? <CheckCircle2 className="h-5 w-5 text-success" /> :
                    <BookOpen className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-display font-bold text-foreground text-sm">Module {mod.id}: {mod.title}</h4>
                  {allDone && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-success/10 text-success">Done</span>}
                  {unlocked && !allDone && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary">{completed}/{mod.lessons.length}</span>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{mod.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
