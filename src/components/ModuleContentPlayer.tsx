/**
 * Module Content Player
 * ─────────────────────
 * Screen-by-screen viewer driven by academy_module_versions.content JSON.
 * Flow: intro → teach → misconceptions → practice → reflection → close
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, BookOpen, AlertTriangle, HelpCircle, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { upsertProgress, type ModuleProgress } from '@/lib/academy-dal';
import { recordActivity } from '@/lib/streaks';

interface Screen {
  key: string;
  type: 'intro' | 'teach' | 'example' | 'tip';
  title: string;
  body?: string;
  bullets?: string[];
}

interface Misconception {
  myth: string;
  reality: string;
}

interface PracticeQuestion {
  question: string;
  answers: string[];
  correctIndex: number;
  rationale?: string;
}

interface ModuleContent {
  screens?: Screen[];
  misconceptions?: Misconception[];
  practice?: PracticeQuestion[];
  reflection?: string;
  close?: { label: string; tool?: string };
}

interface Props {
  moduleId: string;
  moduleVersionId: string;
  moduleTitle: string;
  content: ModuleContent;
  estMinutes: number;
  userId: string;
  existingProgress?: ModuleProgress | null;
  onClose: () => void;
  onComplete: () => void;
}

type Phase = 'screens' | 'misconceptions' | 'practice' | 'reflection' | 'close';

export function ModuleContentPlayer({
  moduleId, moduleVersionId, moduleTitle, content, estMinutes,
  userId, existingProgress, onClose, onComplete,
}: Props) {
  const screens = content.screens || [];
  const misconceptions = content.misconceptions || [];
  const practice = content.practice || [];
  const reflectionPrompt = content.reflection || '';
  const closeCta = content.close || { label: 'Back to Academy' };

  // Build ordered phases
  const phases: Phase[] = [];
  if (screens.length > 0) phases.push('screens');
  if (misconceptions.length > 0) phases.push('misconceptions');
  if (practice.length > 0) phases.push('practice');
  if (reflectionPrompt) phases.push('reflection');
  phases.push('close');

  const [currentPhase, setCurrentPhase] = useState<Phase>(phases[0]);
  const [screenIndex, setScreenIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, number>>({});
  const [practiceSubmitted, setPracticeSubmitted] = useState(false);
  const [reflectionText, setReflectionText] = useState(existingProgress?.reflection_response || '');
  const [saving, setSaving] = useState(false);

  // Mark started on mount
  useEffect(() => {
    if (!existingProgress || existingProgress.status === 'not_started') {
      upsertProgress({
        user_id: userId,
        module_id: moduleId,
        module_version_id: moduleVersionId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      });
    }
  }, []);

  function nextPhase() {
    const idx = phases.indexOf(currentPhase);
    if (idx < phases.length - 1) {
      setCurrentPhase(phases[idx + 1]);
    }
  }

  function prevPhase() {
    const idx = phases.indexOf(currentPhase);
    if (idx > 0) {
      if (phases[idx - 1] === 'screens') setScreenIndex(screens.length - 1);
      setCurrentPhase(phases[idx - 1]);
    }
  }

  async function handleComplete() {
    setSaving(true);
    const xp = 10 + estMinutes;
    const practiceResults = practice.map((q, i) => ({
      question: q.question,
      correct: practiceAnswers[i] === q.correctIndex,
    }));
    await upsertProgress({
      user_id: userId,
      module_id: moduleId,
      module_version_id: moduleVersionId,
      status: 'completed',
      completed_at: new Date().toISOString(),
      xp_earned: xp,
      reflection_response: reflectionText || null,
      practice_results: practiceResults,
      screens_viewed: screens.map(s => s.key),
    });
    // Record streak activity
    recordActivity(userId).catch(() => {});
    setSaving(false);
    onComplete();
  }

  // Progress indicator
  const phaseIdx = phases.indexOf(currentPhase);
  const totalSteps = phases.length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-1 text-sm text-primary font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <p className="text-[10px] text-muted-foreground">
          {phaseIdx + 1} of {totalSteps}
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${((phaseIdx + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Phase: Screens */}
      {currentPhase === 'screens' && screens[screenIndex] && (
        <ScreenView
          screen={screens[screenIndex]}
          index={screenIndex}
          total={screens.length}
          onNext={() => {
            if (screenIndex < screens.length - 1) setScreenIndex(screenIndex + 1);
            else nextPhase();
          }}
          onPrev={() => {
            if (screenIndex > 0) setScreenIndex(screenIndex - 1);
            else onClose();
          }}
        />
      )}

      {/* Phase: Misconceptions */}
      {currentPhase === 'misconceptions' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h3 className="font-display text-lg font-bold">Common Misconceptions</h3>
          </div>
          {misconceptions.map((m, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
              <p className="text-sm text-destructive font-semibold flex items-center gap-1.5">
                <span className="text-xs">✗</span> {m.myth}
              </p>
              <p className="text-sm text-success font-semibold flex items-center gap-1.5">
                <span className="text-xs">✓</span> {m.reality}
              </p>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" onClick={prevPhase} className="flex-1 gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button onClick={nextPhase} className="flex-1 gap-1">
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Phase: Practice */}
      {currentPhase === 'practice' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-foreground">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-bold">Practice</h3>
          </div>
          {practice.map((q, qi) => (
            <div key={qi} className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
              <p className="text-sm font-semibold text-foreground">{qi + 1}. {q.question}</p>
              <div className="space-y-1.5">
                {q.answers.map((a, ai) => {
                  const selected = practiceAnswers[qi] === ai;
                  const isCorrect = practiceSubmitted && ai === q.correctIndex;
                  const isWrong = practiceSubmitted && selected && ai !== q.correctIndex;
                  return (
                    <button
                      key={ai}
                      onClick={() => !practiceSubmitted && setPracticeAnswers(prev => ({ ...prev, [qi]: ai }))}
                      disabled={practiceSubmitted}
                      className={`w-full text-left rounded-lg border p-3 text-sm transition-all ${
                        isCorrect ? 'border-success bg-success/5 ring-1 ring-success' :
                        isWrong ? 'border-destructive bg-destructive/5' :
                        selected ? 'border-primary bg-primary/5 ring-1 ring-primary' :
                        'border-border bg-muted/20 hover:bg-muted/40'
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
              {practiceSubmitted && q.rationale && (
                <p className={`text-xs mt-1 ${practiceAnswers[qi] === q.correctIndex ? 'text-success' : 'text-muted-foreground'}`}>
                  {practiceAnswers[qi] === q.correctIndex ? '✓ ' : 'Not quite — '}{q.rationale}
                </p>
              )}
            </div>
          ))}
          {!practiceSubmitted ? (
            <Button
              onClick={() => setPracticeSubmitted(true)}
              disabled={Object.keys(practiceAnswers).length < practice.length}
              className="w-full gap-1"
            >
              <CheckCircle2 className="h-4 w-4" /> Check Answers
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={prevPhase} className="flex-1 gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
              <Button onClick={nextPhase} className="flex-1 gap-1">
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Phase: Reflection */}
      {currentPhase === 'reflection' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-foreground">
            <MessageSquare className="h-5 w-5 text-accent" />
            <h3 className="font-display text-lg font-bold">Reflect</h3>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
            <p className="text-sm text-foreground">{reflectionPrompt}</p>
            <Textarea
              value={reflectionText}
              onChange={e => setReflectionText(e.target.value)}
              placeholder="Take a moment to reflect…"
              rows={4}
              className="text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={prevPhase} className="flex-1 gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button onClick={nextPhase} className="flex-1 gap-1">
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Phase: Close */}
      {currentPhase === 'close' && (
        <div className="space-y-4">
          <div className="rounded-2xl gradient-hero p-6 text-primary-foreground text-center space-y-3">
            <Sparkles className="h-10 w-10 mx-auto opacity-80" />
            <h3 className="font-display text-xl font-bold">Great Work!</h3>
            <p className="text-sm text-primary-foreground/80">
              You've completed {moduleTitle}. +{10 + estMinutes} XP earned.
            </p>
          </div>
          <Button onClick={handleComplete} disabled={saving} className="w-full gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> {saving ? 'Saving…' : closeCta.label}
          </Button>
          <Button variant="outline" onClick={prevPhase} className="w-full gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Go Back
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Screen View ─────────────────────────────────────────

function ScreenView({ screen, index, total, onNext, onPrev }: {
  screen: Screen; index: number; total: number;
  onNext: () => void; onPrev: () => void;
}) {
  const Icon = screen.type === 'intro' ? BookOpen :
               screen.type === 'tip' ? Sparkles :
               screen.type === 'example' ? HelpCircle : BookOpen;

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl p-6 space-y-3 ${
        screen.type === 'intro' ? 'gradient-hero text-primary-foreground' :
        'border border-border bg-card shadow-card'
      }`}>
        <Icon className={`h-8 w-8 mx-auto ${screen.type === 'intro' ? 'opacity-80' : 'text-primary'}`} />
        <h3 className={`font-display text-xl font-bold text-center ${
          screen.type === 'intro' ? '' : 'text-foreground'
        }`}>
          {screen.title}
        </h3>
        {screen.body && (
          <p className={`text-sm text-center ${
            screen.type === 'intro' ? 'text-primary-foreground/80' : 'text-muted-foreground'
          }`}>
            {screen.body}
          </p>
        )}
        {screen.bullets && screen.bullets.length > 0 && (
          <ul className={`space-y-1.5 text-sm ${
            screen.type === 'intro' ? 'text-primary-foreground/80' : 'text-foreground'
          }`}>
            {screen.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-current shrink-0 opacity-60" />
                {b}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">{index + 1} of {total} screens</p>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onPrev} className="flex-1 gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> {index === 0 ? 'Exit' : 'Back'}
        </Button>
        <Button onClick={onNext} className="flex-1 gap-1">
          {index === total - 1 ? 'Continue' : 'Next'} <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
