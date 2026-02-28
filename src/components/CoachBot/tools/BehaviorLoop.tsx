/**
 * The Behavior Loop™
 * ──────────────────
 * Interactive mini-module: explain learner ↔ adult reinforcement loops.
 * "Who was reinforced?" scenarios.
 */

import { useState } from 'react';
import { Repeat, CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Scenario {
  id: string;
  setup: string;
  learnerBehavior: string;
  adultResponse: string;
  outcome: string;
  answer: 'learner' | 'adult' | 'both' | 'neither';
  explanation: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: '1',
    setup: 'It\'s bedtime. Your Learner starts crying.',
    learnerBehavior: 'Learner cries and says "I\'m not tired!"',
    adultResponse: 'You let them stay up 15 more minutes.',
    outcome: 'The crying stops immediately.',
    answer: 'both',
    explanation: 'The Learner was reinforced — crying got extra screen/awake time. You were also reinforced — the crying stopped when you gave in. Next time, the Learner is more likely to cry, and you\'re more likely to give in.',
  },
  {
    id: '2',
    setup: 'Your Learner is doing homework.',
    learnerBehavior: 'Learner throws their pencil and yells "This is stupid!"',
    adultResponse: 'You calmly say "I know it\'s hard. Let\'s do one more, then take a break." You stay.',
    outcome: 'Learner grumbles but does one more problem. You give a break.',
    answer: 'neither',
    explanation: 'The Learner didn\'t get to escape the task (no escape reinforcement). You didn\'t remove the demand. The Learner was reinforced for doing the problem (earned the break), but the tantrum itself was not reinforced.',
  },
  {
    id: '3',
    setup: 'You\'re on the phone.',
    learnerBehavior: 'Learner starts pulling your arm and whining.',
    adultResponse: 'You stop your call, look at them, and say "What do you need?!"',
    outcome: 'They say "Play with me!" and you feel guilty.',
    answer: 'learner',
    explanation: 'The Learner was reinforced — whining and pulling got your full attention. Next time they need you, this behavior is more likely. Try teaching "excuse me" and pausing your call only for that.',
  },
  {
    id: '4',
    setup: 'At the grocery store.',
    learnerBehavior: 'Learner sees candy and starts screaming "I WANT IT!"',
    adultResponse: 'You calmly say "That\'s not on our list today" and keep walking.',
    outcome: 'Learner screams louder for 2 minutes, then stops.',
    answer: 'neither',
    explanation: 'The Learner did not get candy — the behavior was not reinforced. You didn\'t give in — you weren\'t reinforced for giving in. This was a hard moment but an effective response. The screaming may get worse briefly (extinction burst) before it improves.',
  },
  {
    id: '5',
    setup: 'Your Learner is supposed to clean their room.',
    learnerBehavior: 'Learner starts crying and says "I can\'t do it! It\'s too much!"',
    adultResponse: 'You say "You\'re right, forget it" and clean it yourself.',
    outcome: 'Learner calms down and goes to play.',
    answer: 'both',
    explanation: 'The Learner was reinforced — crying removed the demand and they got to play. You were reinforced — the crying stopped and the room got clean. But next time, the Learner knows crying works to escape tasks.',
  },
];

export function BehaviorLoopTool() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const scenario = SCENARIOS[currentIdx];
  const options: { value: string; label: string }[] = [
    { value: 'learner', label: 'The Learner' },
    { value: 'adult', label: 'The Adult' },
    { value: 'both', label: 'Both' },
    { value: 'neither', label: 'Neither' },
  ];

  function handleSelect(value: string) {
    if (showExplanation) return;
    setSelected(value);
    setShowExplanation(true);
    if (value === scenario.answer) setScore(s => s + 1);
  }

  function handleNext() {
    if (currentIdx >= SCENARIOS.length - 1) {
      setCompleted(true);
      return;
    }
    setCurrentIdx(i => i + 1);
    setSelected(null);
    setShowExplanation(false);
  }

  function handleRestart() {
    setCurrentIdx(0);
    setSelected(null);
    setShowExplanation(false);
    setScore(0);
    setCompleted(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-warning/5 border border-warning/20 p-3">
        <div className="flex items-center gap-2 mb-1">
          <Repeat className="h-4 w-4 text-warning" />
          <h4 className="font-display font-bold text-foreground text-sm">The Behavior Loop™</h4>
        </div>
        <p className="text-[10px] text-muted-foreground">Who was reinforced? Read each scenario and pick your answer.</p>
      </div>

      {completed ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3 animate-fade-in">
          <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
          <h4 className="font-display text-xl font-bold text-foreground">Complete!</h4>
          <p className="text-sm text-foreground">
            You got <strong>{score}</strong> out of <strong>{SCENARIOS.length}</strong> correct.
          </p>
          <p className="text-xs text-muted-foreground">
            {score === SCENARIOS.length ? 'Perfect! You really understand reinforcement loops. 🌟' :
             score >= 3 ? 'Great job! You\'re building strong awareness. 💛' :
             'Keep practicing — understanding loops takes time. You\'re already ahead by being here! 🧠'}
          </p>
          <Button onClick={handleRestart} variant="outline" className="gap-1.5">
            <RotateCcw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Scenario {currentIdx + 1} of {SCENARIOS.length}</span>
            <span>{score} correct</span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${((currentIdx + (showExplanation ? 1 : 0)) / SCENARIOS.length) * 100}%` }} />
          </div>

          {/* Scenario */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
            <p className="text-sm text-muted-foreground italic">{scenario.setup}</p>
            <div className="space-y-2">
              <div className="rounded-lg bg-primary/5 p-3">
                <p className="text-[10px] font-semibold text-primary uppercase">Learner</p>
                <p className="text-sm text-foreground">{scenario.learnerBehavior}</p>
              </div>
              <div className="rounded-lg bg-secondary/5 p-3">
                <p className="text-[10px] font-semibold text-secondary uppercase">Your Response</p>
                <p className="text-sm text-foreground">{scenario.adultResponse}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Outcome</p>
                <p className="text-sm text-foreground">{scenario.outcome}</p>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Who was reinforced?</p>
            <div className="grid grid-cols-2 gap-2">
              {options.map(opt => {
                const isCorrect = showExplanation && opt.value === scenario.answer;
                const isWrong = showExplanation && opt.value === selected && opt.value !== scenario.answer;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    disabled={showExplanation}
                    className={`rounded-xl border p-3 text-sm font-semibold text-center transition-all ${
                      isCorrect ? 'border-success bg-success/10 text-success' :
                      isWrong ? 'border-destructive bg-destructive/10 text-destructive' :
                      selected === opt.value ? 'border-primary bg-primary/5' :
                      'border-border hover:border-primary/30 hover:bg-muted/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div className="space-y-3 animate-fade-in">
              <div className={`rounded-xl border p-4 space-y-2 ${
                selected === scenario.answer ? 'border-success/20 bg-success/5' : 'border-warning/20 bg-warning/5'
              }`}>
                <p className="text-xs font-semibold text-foreground">
                  {selected === scenario.answer ? '✅ Correct!' : `Not quite — the answer is: ${options.find(o => o.value === scenario.answer)?.label}`}
                </p>
                <p className="text-sm text-foreground">{scenario.explanation}</p>
              </div>
              <Button onClick={handleNext} className="w-full gap-1.5">
                <ArrowRight className="h-4 w-4" /> {currentIdx < SCENARIOS.length - 1 ? 'Next Scenario' : 'See Results'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
