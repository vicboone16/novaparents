/**
 * Function Finder™
 * ────────────────
 * Guided yes/no deterministic prompts → ranked function(s) + suggested data.
 * Updated: dual labels, inline ⓘ, mixed/confidence display.
 */

import { useState } from 'react';
import { Search, Info, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FUNCTION_LABELS, FUNCTION_CLINICAL_TERMS, FUNCTION_INFO, type BehaviorFunction } from '@/lib/analysis';

interface Question {
  id: string;
  text: string;
  info: string;
  yesBoost: Partial<Record<BehaviorFunction, number>>;
}

const QUESTIONS: Question[] = [
  { id: 'q1', text: 'Did the behavior happen when an adult was busy or not paying attention?',
    info: 'This includes being on the phone, talking to someone else, or being in another room.',
    yesBoost: { attention: 3 } },
  { id: 'q2', text: 'Did the behavior happen when a demand or task was given?',
    info: 'Demands include homework, chores, getting dressed, brushing teeth, transitions, or stopping a preferred activity.',
    yesBoost: { escape: 3 } },
  { id: 'q3', text: 'Did the behavior happen when an item or activity was denied or taken away?',
    info: 'Examples: told no to a toy, screen turned off, food denied, turn not given.',
    yesBoost: { tangible: 3 } },
  { id: 'q4', text: 'Does the behavior happen even when the Learner is alone?',
    info: 'If the behavior happens with no one around, it may meet a sensory or internal need.',
    yesBoost: { sensory: 3 } },
  { id: 'q5', text: 'Did the Learner get attention (positive or negative) after the behavior?',
    info: 'This includes talking, yelling, comforting, lecturing, making eye contact, or picking them up. Even negative attention counts.',
    yesBoost: { attention: 2 } },
  { id: 'q6', text: 'Was the demand removed, reduced, or delayed after the behavior?',
    info: 'If you stopped asking, gave a break, or said "fine, never mind," the demand was removed.',
    yesBoost: { escape: 2 } },
  { id: 'q7', text: 'Did the Learner get the item or activity they wanted?',
    info: 'If they got the screen, toy, food, or activity during or after the behavior — even after a delay.',
    yesBoost: { tangible: 2 } },
  { id: 'q8', text: 'Does the behavior involve repetitive movements, sounds, or sensory seeking?',
    info: 'Rocking, flapping, humming, chewing, spinning, mouthing objects, covering ears.',
    yesBoost: { sensory: 2 } },
];

export function FunctionFinderTool() {
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [showResult, setShowResult] = useState(false);
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null);

  const answeredAll = QUESTIONS.every(q => answers[q.id] !== undefined && answers[q.id] !== null);

  function getScores() {
    const scores: Record<BehaviorFunction, number> = { attention: 0, escape: 0, tangible: 0, sensory: 0 };
    for (const q of QUESTIONS) {
      if (answers[q.id]) {
        for (const [fn, pts] of Object.entries(q.yesBoost)) {
          scores[fn as BehaviorFunction] += pts!;
        }
      }
    }
    return scores;
  }

  function handleAnalyze() {
    setShowResult(true);
  }

  const scores = getScores();
  const ranked = (Object.entries(scores) as [BehaviorFunction, number][]).sort((a, b) => b[1] - a[1]);
  const primary = ranked[0];
  const secondary = ranked[1];
  const diff = primary[1] - secondary[1];
  const isMixed = primary[1] > 0 && diff === 0;

  let confidence: string;
  if (isMixed) confidence = 'Mixed';
  else if (primary[1] >= 4 && diff >= 2) confidence = 'High';
  else if (primary[1] >= 3 && diff >= 1) confidence = 'Moderate';
  else confidence = 'Low';

  const dataToTrack: Record<BehaviorFunction, string> = {
    attention: 'Track ABC data focusing on who was present and what attention was given.',
    escape: 'Track ABC data focusing on what demand preceded the behavior and whether it was removed.',
    tangible: 'Track frequency of requests vs. behaviors, and note what item/activity was involved.',
    sensory: 'Track duration and time of day — note environment conditions (noise, light, activity level).',
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
        <div className="flex items-center gap-2 mb-1">
          <Search className="h-4 w-4 text-primary" />
          <h4 className="font-display font-bold text-foreground text-sm">Function Finder™</h4>
        </div>
        <p className="text-[10px] text-muted-foreground">Answer yes or no to each question. We'll identify the likely function.</p>
      </div>

      {!showResult ? (
        <div className="space-y-3">
          {QUESTIONS.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-border bg-card p-3 shadow-card space-y-2">
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold mt-0.5">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm text-foreground">{q.text}</p>
                  <button
                    onClick={() => setExpandedInfo(expandedInfo === q.id ? null : q.id)}
                    className="text-[10px] text-primary flex items-center gap-0.5 mt-1"
                  >
                    <Info className="h-3 w-3" /> {expandedInfo === q.id ? 'Hide' : 'More info'}
                  </button>
                  {expandedInfo === q.id && (
                    <p className="text-[10px] text-muted-foreground mt-1 bg-muted/50 rounded-lg p-2 animate-fade-in">{q.info}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 ml-7">
                <Button
                  size="sm"
                  variant={answers[q.id] === true ? 'default' : 'outline'}
                  onClick={() => setAnswers(a => ({ ...a, [q.id]: true }))}
                  className="text-xs px-4"
                >
                  Yes
                </Button>
                <Button
                  size="sm"
                  variant={answers[q.id] === false ? 'default' : 'outline'}
                  onClick={() => setAnswers(a => ({ ...a, [q.id]: false }))}
                  className="text-xs px-4"
                >
                  No
                </Button>
              </div>
            </div>
          ))}

          <Button onClick={handleAnalyze} disabled={!answeredAll} className="w-full gap-1.5">
            <Search className="h-4 w-4" /> Find Function
          </Button>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h4 className="font-display font-bold text-foreground">
                {isMixed ? 'Mixed Function' : `Primary: ${FUNCTION_LABELS[primary[0]]}`}
              </h4>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Also known as: {FUNCTION_CLINICAL_TERMS[primary[0]]}
            </p>
            {!isMixed && secondary[1] > 0 && (
              <p className="text-xs text-muted-foreground">
                Secondary: {FUNCTION_LABELS[secondary[0]]}
              </p>
            )}
            <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold ${
              confidence === 'High' ? 'bg-success/10 text-success' :
              confidence === 'Moderate' ? 'bg-warning/10 text-warning' :
              confidence === 'Mixed' ? 'bg-secondary/10 text-secondary' :
              'bg-muted text-muted-foreground'
            }`}>
              {confidence} confidence
            </span>

            {isMixed && (
              <p className="text-xs text-muted-foreground italic">
                It looks like this behavior may serve more than one purpose. When behaviors work in multiple ways, they can grow faster. Let's focus on the strongest pattern first.
              </p>
            )}

            {confidence === 'Low' && (
              <p className="text-xs text-muted-foreground italic">
                We don't have enough information yet to confidently identify the function. Consider tracking a few more instances.
              </p>
            )}
          </div>

          {/* Score bars (no numeric pts shown) */}
          <div className="space-y-2">
            {ranked.map(([fn, score]) => {
              const max = Math.max(...ranked.map(r => r[1]), 1);
              return (
                <div key={fn} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <div>
                      <span className="text-foreground font-medium">{FUNCTION_LABELS[fn]}</span>
                      <p className="text-[10px] text-muted-foreground/70">
                        Also known as: {FUNCTION_CLINICAL_TERMS[fn]}
                      </p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(score / max) * 100}%` }} />
                  </div>
                  {/* Inline ⓘ */}
                  <button
                    onClick={() => setExpandedInfo(expandedInfo === `result-${fn}` ? null : `result-${fn}`)}
                    className="text-[10px] text-primary flex items-center gap-0.5"
                  >
                    <Info className="h-3 w-3" /> {expandedInfo === `result-${fn}` ? 'Hide' : 'Learn more'}
                  </button>
                  {expandedInfo === `result-${fn}` && (
                    <div className="bg-muted/50 rounded-lg p-3 animate-fade-in">
                      <p className="text-[10px] text-foreground font-medium mb-1">{FUNCTION_INFO[fn].summary}</p>
                      <ul className="space-y-0.5">
                        {FUNCTION_INFO[fn].bullets.map((b, i) => (
                          <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                            <span className="text-primary mt-0.5">•</span> {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Data suggestion */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5 text-primary" /> Suggested Data to Collect
            </h4>
            <p className="text-sm text-foreground">{dataToTrack[primary[0]]}</p>
          </div>

          <Button variant="outline" onClick={() => { setShowResult(false); setAnswers({}); }} className="w-full">
            Start Over
          </Button>
        </div>
      )}
    </div>
  );
}
