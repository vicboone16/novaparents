/**
 * Behavior Lab™ — Reusable Game Engine
 * Renders intro → gameplay → results from a LabGameConfig.
 * Deterministic scoring. localStorage persistence.
 */

import { useState, useMemo } from 'react';
import { ArrowLeft, Play, CheckCircle2, RotateCcw, ArrowRight, Lightbulb, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LabGameConfig, LabQuestion, LabAttemptLocal } from '@/lib/lab/lab-types';
import { calculateXp } from '@/lib/lab/lab-types';
import { saveLocalAttempt, getStreakDays } from '@/lib/lab/lab-store';

interface Props {
  game: LabGameConfig;
  onBack: () => void;
  onNext?: () => void;
}

export default function LabGameEngine({ game, onBack, onNext }: Props) {
  const [phase, setPhase] = useState<'intro' | 'play' | 'results'>('intro');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [reorderState, setReorderState] = useState<Record<number, string[]>>({});
  const [showHint, setShowHint] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [scorePercent, setScorePercent] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [mistakes, setMistakes] = useState<{ question: string; given: string; correct: string }[]>([]);
  const [startedAt] = useState(new Date().toISOString());

  const questions = game.questions;
  const isReorder = questions.some(q => q.correct_order);
  const totalQ = questions.length;

  // Shuffle options for display (but keep answer reference stable)
  const shuffledOptions = useMemo(() => {
    return questions.map(q => {
      if (q.correct_order) {
        // Shuffle the correct_order for reorder games
        const shuffled = [...q.correct_order].sort(() => Math.random() - 0.5);
        return shuffled;
      }
      return [...q.options].sort(() => Math.random() - 0.5);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id]);

  function handleSelect(qIdx: number, option: string) {
    setAnswers(prev => ({ ...prev, [qIdx]: option }));
  }

  function moveItem(qIdx: number, fromIndex: number, toIndex: number) {
    setReorderState(prev => {
      const current = prev[qIdx] || shuffledOptions[qIdx];
      const updated = [...current];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return { ...prev, [qIdx]: updated };
    });
  }

  function handleSubmit() {
    let correct = 0;
    const mistakeList: typeof mistakes = [];

    questions.forEach((q, i) => {
      if (q.correct_order) {
        const userOrder = reorderState[i] || shuffledOptions[i];
        const isCorrect = q.correct_order.every((item, idx) => item === userOrder[idx]);
        if (isCorrect) correct++;
        else mistakeList.push({ question: q.scenario, given: userOrder.join(' → '), correct: q.correct_order.join(' → ') });
      } else {
        const userAnswer = answers[i];
        if (userAnswer === q.answer) correct++;
        else mistakeList.push({ question: q.prompt || q.scenario, given: userAnswer || '(none)', correct: q.answer });
      }
    });

    const pct = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 100;
    const currentStreak = getStreakDays();
    const xp = calculateXp(pct, game.difficulty, currentStreak > 0);

    setScorePercent(pct);
    setXpEarned(xp);
    setMistakes(mistakeList);

    const attempt: LabAttemptLocal = {
      game_id: game.id,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      score_percent: pct,
      xp_earned: xp,
      skill_tags: game.skill_tags,
      difficulty: game.difficulty,
      mistakes_summary: mistakeList,
      streak_count: 0,
    };
    saveLocalAttempt(attempt);
    setPhase('results');
  }

  function restart() {
    setAnswers({});
    setReorderState({});
    setCurrentQ(0);
    setShowHint(false);
    setPhase('intro');
  }

  const answeredCount = isReorder
    ? Object.keys(reorderState).length || totalQ // reorder is always "answered"
    : Object.keys(answers).length;

  // ─── INTRO ────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back to Lab
        </button>
        <div className="rounded-2xl gradient-hero p-6 text-primary-foreground text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: game.difficulty_dots }).map((_, i) => (
              <span key={i} className="h-2 w-2 rounded-full bg-primary-foreground/60" />
            ))}
          </div>
          <h3 className="font-display text-xl font-bold">{game.screens.intro.headline}</h3>
          <p className="text-sm text-primary-foreground/80">{game.screens.intro.body}</p>
          <p className="text-[10px] text-primary-foreground/60">~{Math.ceil(game.est_seconds / 60)} min · {game.difficulty}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{game.goal}</p>
          </div>
          {game.skill_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {game.skill_tags.map(tag => (
                <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{tag}</span>
              ))}
            </div>
          )}
        </div>
        <Button onClick={() => setPhase('play')} className="w-full gap-1.5" disabled={totalQ === 0}>
          <Play className="h-4 w-4" /> {game.screens.intro.cta || 'Start'}
        </Button>
      </div>
    );
  }

  // ─── GAMEPLAY ─────────────────────────
  if (phase === 'play') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-sm text-primary font-semibold flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Exit
          </button>
          <p className="text-xs text-muted-foreground">
            {isReorder ? `${currentQ + 1}/${totalQ}` : `${answeredCount}/${totalQ} answered`}
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((isReorder ? currentQ + 1 : answeredCount) / totalQ) * 100}%` }}
          />
        </div>

        {/* Hint toggle */}
        {game.micro_tip && (
          <button
            onClick={() => setShowHint(!showHint)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Info className="h-3.5 w-3.5" /> {showHint ? 'Hide hint' : 'Show hint'}
          </button>
        )}
        {showHint && (
          <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs text-muted-foreground">
            {game.micro_tip}
          </div>
        )}

        {/* Questions */}
        {isReorder ? (
          <ReorderQuestion
            question={questions[currentQ]}
            items={reorderState[currentQ] || shuffledOptions[currentQ]}
            onMove={(from, to) => moveItem(currentQ, from, to)}
          />
        ) : (
          questions.map((q, qi) => (
            <McqQuestion
              key={qi}
              index={qi}
              question={q}
              options={shuffledOptions[qi]}
              selected={answers[qi]}
              onSelect={(opt) => handleSelect(qi, opt)}
            />
          ))
        )}

        {/* Navigation for reorder */}
        {isReorder && (
          <div className="flex gap-2">
            {currentQ > 0 && (
              <Button variant="outline" onClick={() => setCurrentQ(c => c - 1)} className="flex-1">
                Previous
              </Button>
            )}
            {currentQ < totalQ - 1 ? (
              <Button onClick={() => setCurrentQ(c => c + 1)} className="flex-1">
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} className="flex-1 gap-1">
                <CheckCircle2 className="h-4 w-4" /> Submit
              </Button>
            )}
          </div>
        )}

        {/* Submit for MCQ */}
        {!isReorder && (
          <Button onClick={handleSubmit} disabled={answeredCount < totalQ} className="w-full gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Submit Answers
          </Button>
        )}
      </div>
    );
  }

  // ─── RESULTS ──────────────────────────
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-2xl border border-primary/20 bg-card p-6 text-center space-y-3">
        {/* Score ring */}
        <div className="relative mx-auto h-24 w-24">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={scorePercent >= 80 ? 'hsl(var(--success))' : scorePercent >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${(scorePercent / 100) * 264} 264`}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-bold text-foreground">{scorePercent}%</span>
          </div>
        </div>

        <p className="text-sm font-semibold text-foreground">+{xpEarned} XP</p>
        <p className="text-xs text-muted-foreground">
          Practiced: {game.skill_tags.join(', ')}
        </p>

        {/* Micro tip */}
        <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs text-muted-foreground text-left">
          <span className="font-semibold text-primary">Tip: </span>{game.micro_tip}
        </div>

        {/* Mistakes / rationales */}
        {questions.map((q, qi) => {
          const userAnswer = isReorder
            ? (reorderState[qi] || shuffledOptions[qi]).join(' → ')
            : answers[qi];
          const correctAnswer = isReorder ? q.correct_order!.join(' → ') : q.answer;
          const isCorrect = userAnswer === correctAnswer;

          return (
            <div key={qi} className={`rounded-lg p-3 text-left text-xs ${isCorrect ? 'bg-success/5' : 'bg-destructive/5'}`}>
              <p className="font-semibold text-foreground">{qi + 1}. {q.prompt || q.scenario}</p>
              {!isCorrect && (
                <p className="text-destructive mt-1">Not quite — {q.explain}</p>
              )}
              {isCorrect && <p className="text-success mt-1">✓ Correct</p>}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={restart} className="flex-1 gap-1">
          <RotateCcw className="h-3.5 w-3.5" /> Try Again
        </Button>
        {onNext ? (
          <Button onClick={onNext} className="flex-1 gap-1">
            <ArrowRight className="h-3.5 w-3.5" /> Next Drill
          </Button>
        ) : (
          <Button onClick={onBack} className="flex-1 gap-1">
            <ArrowRight className="h-3.5 w-3.5" /> Back to Lab
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────

function McqQuestion({ index, question, options, selected, onSelect }: {
  index: number;
  question: LabQuestion;
  options: string[];
  selected?: string;
  onSelect: (opt: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
      <p className="text-sm font-semibold text-foreground">
        {index + 1}. {question.prompt || question.scenario}
      </p>
      {question.prompt && (
        <p className="text-xs text-muted-foreground italic">{question.scenario}</p>
      )}
      <div className="space-y-2">
        {options.map((opt, ai) => (
          <button
            key={ai}
            onClick={() => onSelect(opt)}
            className={`w-full text-left rounded-lg border p-3 text-sm transition-all ${
              selected === opt
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-muted/20 hover:bg-muted/40'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReorderQuestion({ question, items, onMove }: {
  question: LabQuestion;
  items: string[];
  onMove: (from: number, to: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
      <p className="text-sm font-semibold text-foreground">{question.scenario}</p>
      <p className="text-[10px] text-muted-foreground">Tap arrows to reorder:</p>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={item}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm"
          >
            <span className="shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
              {idx + 1}
            </span>
            <span className="flex-1 text-foreground">{item}</span>
            <div className="flex flex-col gap-0.5">
              {idx > 0 && (
                <button
                  onClick={() => onMove(idx, idx - 1)}
                  className="text-xs text-muted-foreground hover:text-primary px-1"
                >▲</button>
              )}
              {idx < items.length - 1 && (
                <button
                  onClick={() => onMove(idx, idx + 1)}
                  className="text-xs text-muted-foreground hover:text-primary px-1"
                >▼</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
