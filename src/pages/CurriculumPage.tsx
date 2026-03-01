import { useState, useEffect, useCallback } from 'react';
import { BookOpen, CheckCircle2, Lock, ArrowLeft, ArrowRight, Sparkles, Clock, MessageSquare, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getCurrentUser } from '@/lib/dal';
import {
  logModuleOpen,
  logLessonOpen,
  logLessonComplete as logLessonCompleteEvent,
  logReflectionSubmitted,
  logMicroQuizSubmit,
  recordLessonOpen,
  recordInteraction,
  canCompleteLesson,
  recordLessonComplete,
  evaluateLessonCompletion,
  getSessionId,
} from '@/lib/engagement';

// ─── Quiz type ───────────────────────────────────────────

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Lesson {
  title: string;
  content: string;
  actionStep: string;
  reflection: string;
  quiz?: QuizQuestion[];
}

interface Module {
  id: number;
  title: string;
  description: string;
  lessons: Lesson[];
}

// ─── Module data with micro-quizzes ─────────────────────

const modules: Module[] = [
  {
    id: 1, title: 'Understanding Behavior', description: 'Learn why behavior happens and what it communicates.',
    lessons: [
      {
        title: 'Behavior Is Communication',
        content: 'All behavior serves a purpose. When a child acts out, they are communicating a need — for attention, escape, a tangible item, or sensory input.',
        actionStep: 'Today, when you see a challenging behavior, pause and ask: "What is my Learner trying to tell me?"',
        reflection: 'What need do you think was behind the last challenging behavior you saw?',
        quiz: [
          { question: 'When a Learner acts out, they are most likely:', options: ['Being defiant on purpose', 'Communicating an unmet need', 'Trying to annoy adults', 'Not aware of what they are doing'], correctIndex: 1, explanation: 'All behavior serves a purpose — the Learner is communicating a need for attention, escape, a tangible item, or sensory input.' },
        ],
      },
      {
        title: 'The Four Functions',
        content: 'Behavior generally falls into four functions: Attention, Escape, Tangible, and Sensory. Understanding which function drives a behavior helps you respond effectively.',
        actionStep: 'Pick one behavior you see often and try to identify its function.',
        reflection: 'Which function do you think applies most to your Learner?',
        quiz: [
          { question: 'Which of the following is NOT one of the four functions of behavior?', options: ['Attention', 'Escape', 'Punishment', 'Sensory'], correctIndex: 2, explanation: 'The four functions are Attention, Escape, Tangible, and Sensory. Punishment is a consequence, not a function of behavior.' },
          { question: 'A Learner covers their ears in a loud room. This behavior likely serves which function?', options: ['Attention', 'Tangible', 'Sensory', 'Escape'], correctIndex: 2, explanation: 'Covering ears in response to loud noise is a sensory-driven behavior — the Learner is trying to regulate sensory input.' },
        ],
      },
    ],
  },
  {
    id: 2, title: 'The ABCs of Behavior', description: 'Antecedent, Behavior, Consequence — the building blocks.',
    lessons: [
      {
        title: 'What Are ABCs?',
        content: 'A = Antecedent (what happens before), B = Behavior (what the person does), C = Consequence (what happens after). This framework helps you see patterns.',
        actionStep: 'Write down one ABC sequence from today.',
        reflection: 'Was the consequence reinforcing the behavior or discouraging it?',
        quiz: [
          { question: 'In the ABC framework, what does the "A" stand for?', options: ['Action', 'Antecedent', 'Assessment', 'Approach'], correctIndex: 1, explanation: 'A = Antecedent — what happens right before the behavior occurs.' },
        ],
      },
      {
        title: 'Finding Patterns',
        content: 'When you track ABCs over time, patterns emerge. You might notice behaviors happen at specific times, places, or after particular triggers.',
        actionStep: 'Review your behavior log and look for repeating antecedents.',
        reflection: 'Did you notice any patterns? What surprised you?',
        quiz: [
          { question: 'Why is tracking ABCs over time important?', options: ['To collect data for reports', 'To identify patterns and triggers', 'To prove the Learner misbehaves', 'To satisfy agency requirements'], correctIndex: 1, explanation: 'Tracking ABCs reveals patterns — you can identify when, where, and why behaviors occur most often.' },
        ],
      },
    ],
  },
  {
    id: 3, title: 'Identifying Triggers', description: 'Recognize what sets off challenging behaviors.',
    lessons: [
      {
        title: 'Common Triggers',
        content: 'Triggers include transitions, demands, sensory overload, hunger, fatigue, and changes in routine. Knowing triggers lets you prepare.',
        actionStep: 'List 3 situations where challenging behavior tends to happen.',
        reflection: 'Can you modify any of these triggers to prevent the behavior?',
        quiz: [
          { question: 'Which of these is a common trigger for challenging behavior?', options: ['A predictable routine', 'Transitions between activities', 'A calm environment', 'Getting enough sleep'], correctIndex: 1, explanation: 'Transitions are one of the most common triggers — moving from a preferred to a non-preferred activity often causes difficulty.' },
          { question: 'What is the main benefit of identifying triggers?', options: ['Blaming the Learner', 'Avoiding all demands', 'Preparing and preventing behaviors', 'Documenting for records'], correctIndex: 2, explanation: 'Knowing triggers lets you prepare strategies and environmental changes that can prevent challenging behaviors before they start.' },
        ],
      },
    ],
  },
  { id: 4, title: 'Replacement Behaviors', description: 'Teach alternatives that meet the same need.', lessons: [{ title: 'Coming Soon', content: 'This module is being prepared.', actionStep: 'Stay tuned!', reflection: '', quiz: [] }] },
  { id: 5, title: 'Reinforcement Strategies', description: 'Effective ways to encourage positive behavior.', lessons: [{ title: 'Coming Soon', content: 'This module is being prepared.', actionStep: 'Stay tuned!', reflection: '', quiz: [] }] },
  { id: 6, title: 'Managing Crisis Moments', description: 'Stay calm and respond effectively during escalation.', lessons: [{ title: 'Coming Soon', content: 'This module is being prepared.', actionStep: 'Stay tuned!', reflection: '', quiz: [] }] },
  { id: 7, title: 'Building Routines', description: 'Create structure that prevents challenging behaviors.', lessons: [{ title: 'Coming Soon', content: 'This module is being prepared.', actionStep: 'Stay tuned!', reflection: '', quiz: [] }] },
  { id: 8, title: 'Celebrating Progress', description: "Recognize growth — yours and your Learner's.", lessons: [{ title: 'Coming Soon', content: 'This module is being prepared.', actionStep: 'Stay tuned!', reflection: '', quiz: [] }] },
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
  const [userId, setUserId] = useState<string>('');
  const [reflectionText, setReflectionText] = useState('');
  const [reflectionSubmitted, setReflectionSubmitted] = useState(false);
  const [completionCheck, setCompletionCheck] = useState<{ allowed: boolean; reason?: string; remainingSec?: number } | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number | null>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<number, boolean>>({});

  useEffect(() => {
    getCurrentUser().then(u => { if (u) setUserId(u.id); });
  }, []);

  useEffect(() => { saveProgress(progress); }, [progress]);

  // Track lesson open + reset state when viewing changes
  useEffect(() => {
    if (viewing && userId) {
      recordLessonOpen(viewing.moduleId, viewing.lessonIdx);
      logLessonOpen(userId, viewing.moduleId, viewing.lessonIdx);
      setReflectionText('');
      setReflectionSubmitted(false);
      setCompletionCheck(null);
      setQuizAnswers({});
      setQuizSubmitted({});
    }
  }, [viewing?.moduleId, viewing?.lessonIdx, userId]);

  // Countdown timer for minimum time
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  function completedCount(mod: Module) {
    return mod.lessons.filter((_, i) => progress[`${mod.id}-${i}`]).length;
  }

  function isModuleUnlocked(mod: Module) {
    if (mod.id === 1) return true;
    const prev = modules.find(m => m.id === mod.id - 1);
    if (!prev) return true;
    return completedCount(prev) === prev.lessons.length;
  }

  function handleModuleOpen(mod: Module) {
    if (userId) logModuleOpen(userId, mod.id);
    setViewing({ moduleId: mod.id, lessonIdx: 0 });
  }

  function handleReflectionSubmit() {
    if (!viewing || !userId || !reflectionText.trim()) return;
    recordInteraction(viewing.moduleId, viewing.lessonIdx);
    logReflectionSubmitted(userId, viewing.moduleId, viewing.lessonIdx);
    setReflectionSubmitted(true);
  }

  function handleQuizAnswer(qIdx: number, optionIdx: number) {
    if (quizSubmitted[qIdx]) return;
    setQuizAnswers(prev => ({ ...prev, [qIdx]: optionIdx }));
  }

  function handleQuizSubmit(qIdx: number) {
    if (!viewing || !userId) return;
    setQuizSubmitted(prev => ({ ...prev, [qIdx]: true }));
    recordInteraction(viewing.moduleId, viewing.lessonIdx);
    logMicroQuizSubmit(userId, viewing.moduleId, viewing.lessonIdx);
  }

  function handleMarkComplete() {
    if (!viewing || !userId) return;
    const check = canCompleteLesson(viewing.moduleId, viewing.lessonIdx);
    setCompletionCheck(check);

    if (!check.allowed) {
      if (check.remainingSec) setCountdown(check.remainingSec);
      return;
    }

    recordLessonComplete(viewing.moduleId, viewing.lessonIdx);
    logLessonCompleteEvent(userId, viewing.moduleId, viewing.lessonIdx);
    evaluateLessonCompletion(userId, getSessionId() || '', viewing.moduleId, viewing.lessonIdx);
    setProgress(p => ({ ...p, [`${viewing.moduleId}-${viewing.lessonIdx}`]: true }));
    setCompletionCheck(null);
  }

  const totalCompleted = modules.reduce((sum, m) => sum + completedCount(m), 0);
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);

  // ─── Lesson View ───────────────────────────────────────
  if (viewing) {
    const mod = modules.find(m => m.id === viewing.moduleId)!;
    const lesson = mod.lessons[viewing.lessonIdx];
    const key = `${mod.id}-${viewing.lessonIdx}`;
    const done = !!progress[key];
    const quizzes = lesson.quiz || [];

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

        {/* Micro-Quizzes */}
        {quizzes.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-display font-bold text-foreground text-sm flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-secondary" /> Knowledge Check
            </h4>
            {quizzes.map((q, qIdx) => {
              const selected = quizAnswers[qIdx] ?? null;
              const submitted = !!quizSubmitted[qIdx];
              const isCorrect = submitted && selected === q.correctIndex;

              return (
                <div key={qIdx} className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
                  <p className="text-sm font-semibold text-foreground">{q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, oIdx) => {
                      let optClass = 'border-border bg-muted/30 hover:bg-muted/60 cursor-pointer';
                      if (selected === oIdx && !submitted) {
                        optClass = 'border-primary bg-primary/10 ring-1 ring-primary cursor-pointer';
                      } else if (submitted && oIdx === q.correctIndex) {
                        optClass = 'border-success bg-success/10';
                      } else if (submitted && selected === oIdx && oIdx !== q.correctIndex) {
                        optClass = 'border-destructive bg-destructive/10';
                      } else if (submitted) {
                        optClass = 'border-border bg-muted/20 opacity-60';
                      }

                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleQuizAnswer(qIdx, oIdx)}
                          disabled={submitted}
                          className={`w-full text-left rounded-lg border p-3 text-sm transition-all ${optClass}`}
                        >
                          <span className="font-medium text-foreground">{String.fromCharCode(65 + oIdx)}.</span>{' '}
                          <span className="text-foreground">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                  {!submitted ? (
                    <Button size="sm" variant="outline" onClick={() => handleQuizSubmit(qIdx)} disabled={selected === null}>
                      Submit Answer
                    </Button>
                  ) : (
                    <div className={`rounded-lg p-3 text-sm ${isCorrect ? 'bg-success/10 border border-success/20' : 'bg-warning/10 border border-warning/20'}`}>
                      <p className="font-semibold text-foreground">{isCorrect ? '✅ Correct!' : '❌ Not quite.'}</p>
                      <p className="text-muted-foreground mt-1">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Reflection */}
        {lesson.reflection && (
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-5 space-y-3">
            <h4 className="font-display font-bold text-accent text-sm mb-1 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" /> Reflection
            </h4>
            <p className="text-sm text-foreground">{lesson.reflection}</p>
            {!reflectionSubmitted ? (
              <>
                <Textarea
                  placeholder="Type your reflection here…"
                  rows={3}
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  className="mt-2"
                />
                <Button size="sm" variant="outline" onClick={handleReflectionSubmit} disabled={!reflectionText.trim()}>
                  Submit Reflection
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-success font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Reflection submitted
              </div>
            )}
          </div>
        )}

        {/* Completion check feedback */}
        {completionCheck && !completionCheck.allowed && (
          <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 text-sm text-foreground flex items-start gap-2">
            <Clock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p>{completionCheck.reason}</p>
              {countdown > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Time remaining: {countdown}s</p>
              )}
            </div>
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
            <Button size="sm" onClick={handleMarkComplete}>
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

  // ─── Module List ───────────────────────────────────────
  return (
    <div className="space-y-5">

      <div className="rounded-xl bg-muted p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Your Progress</span>
          <span className="text-sm font-bold text-primary">{totalCompleted} of {totalLessons} lessons</span>
        </div>
        <div className="h-3 rounded-full bg-border overflow-hidden">
          <div className="h-full rounded-full gradient-hero transition-all duration-500" style={{ width: `${(totalCompleted / totalLessons) * 100}%` }} />
        </div>
      </div>

      <div className="space-y-3">
        {modules.map((mod) => {
          const unlocked = isModuleUnlocked(mod);
          const completed = completedCount(mod);
          const allDone = completed === mod.lessons.length;
          return (
            <button
              key={mod.id}
              disabled={!unlocked}
              onClick={() => unlocked && handleModuleOpen(mod)}
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
