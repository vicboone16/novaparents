/**
 * "Is This Reinforcing?" Tool
 * ────────────────────────────
 * Updated: dual labels, inline ⓘ, confidence, alignment feedback.
 * No numeric scores shown to parents.
 */

import { useState, useEffect } from 'react';
import {
  HelpCircle, CheckCircle2, AlertTriangle, XCircle, ArrowRight, BookOpen, RotateCcw, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  checkReinforcement,
  FUNCTION_LABELS,
  FUNCTION_CLINICAL_TERMS,
  FUNCTION_INFO,
  type BehaviorFunction,
  type ReinforcementResult,
} from '@/lib/analysis';
import { getReplacementBehaviors, type ReplacementBehavior } from '@/lib/dal';
import { getCurrentUser } from '@/lib/dal';
import { logEvent } from '@/lib/engagement';

const FUNCTION_OPTIONS: { value: BehaviorFunction; label: string; description: string }[] = [
  { value: 'attention', label: FUNCTION_LABELS.attention, description: 'Adult looked, talked, reacted, comforted' },
  { value: 'escape', label: FUNCTION_LABELS.escape, description: 'Demand stopped, break given, task removed' },
  { value: 'tangible', label: FUNCTION_LABELS.tangible, description: 'Got the toy, screen, food, etc.' },
  { value: 'sensory', label: FUNCTION_LABELS.sensory, description: 'Environment changed, self-stimulated' },
];

export function ReinforcementChecker() {
  const [userId, setUserId] = useState('');
  const [library, setLibrary] = useState<ReplacementBehavior[]>([]);

  const [whatHappened, setWhatHappened] = useState('');
  const [whatYouDid, setWhatYouDid] = useState('');
  const [whatLearnerGot, setWhatLearnerGot] = useState<BehaviorFunction[]>([]);
  const [saveToPacket, setSaveToPacket] = useState(true);
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null);

  const [result, setResult] = useState<ReinforcementResult | null>(null);
  const [linkedSkills, setLinkedSkills] = useState<ReplacementBehavior[]>([]);

  useEffect(() => {
    getCurrentUser().then(u => { if (u) setUserId(u.id); });
    getReplacementBehaviors().then(setLibrary);
  }, []);

  function toggleFunction(fn: BehaviorFunction) {
    setWhatLearnerGot(prev =>
      prev.includes(fn) ? prev.filter(f => f !== fn) : [...prev, fn]
    );
  }

  function handleCheck() {
    const res = checkReinforcement({ whatHappened, whatYouDid, whatLearnerGot });
    setResult(res);

    const relevant = res.matchedFunctions;
    const skills = library.filter(rb => relevant.includes(rb.function)).slice(0, 3);
    setLinkedSkills(skills);

    if (saveToPacket && userId) {
      logEvent(userId, 'behavior_log_created', {
        logId: crypto.randomUUID(),
        source: 'reinforcement_check',
        likelihood: res.likelihood,
        matchedFunctions: res.matchedFunctions,
      });

      const history = loadLocal('bd_reinforcement_history');
      history.unshift({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        whatHappened,
        whatYouDid,
        whatLearnerGot,
        likelihood: res.likelihood,
      });
      saveLocal('bd_reinforcement_history', history.slice(0, 100));
    }
  }

  function handleReset() {
    setWhatHappened(''); setWhatYouDid(''); setWhatLearnerGot([]);
    setResult(null); setLinkedSkills([]);
  }

  const canCheck = whatHappened.trim().length > 0 && whatYouDid.trim().length > 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="rounded-xl bg-secondary/10 border border-secondary/20 p-4">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle className="h-5 w-5 text-secondary" />
          <h3 className="font-display text-lg font-bold text-foreground">Reinforcement Check™</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Quickly check if your response may have accidentally strengthened the behavior.
        </p>
      </div>

      {/* ─── Inputs ────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
          <label className="text-sm font-semibold text-foreground">What happened?</label>
          <p className="text-[10px] text-muted-foreground">Describe the behavior you saw.</p>
          <Textarea
            placeholder="e.g., My Learner started screaming and throwing toys when I said it was time to turn off the iPad…"
            rows={3}
            value={whatHappened}
            onChange={e => setWhatHappened(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
          <label className="text-sm font-semibold text-foreground">What did you say or do?</label>
          <p className="text-[10px] text-muted-foreground">Describe your response in the moment.</p>
          <Textarea
            placeholder="e.g., I said 'fine, 5 more minutes' and walked away…"
            rows={3}
            value={whatYouDid}
            onChange={e => setWhatYouDid(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
          <div>
            <label className="text-sm font-semibold text-foreground">What did the Learner get?</label>
            <p className="text-[10px] text-muted-foreground">Select all that apply.</p>
          </div>
          <div className="space-y-2">
            {FUNCTION_OPTIONS.map(opt => (
              <div key={opt.value}>
                <button
                  onClick={() => toggleFunction(opt.value)}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    whatLearnerGot.includes(opt.value)
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-muted/20 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={whatLearnerGot.includes(opt.value)}
                      onCheckedChange={() => toggleFunction(opt.value)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.description}</p>
                      <p className="text-[10px] text-muted-foreground/70">
                        Also known as: {FUNCTION_CLINICAL_TERMS[opt.value]}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedInfo(expandedInfo === opt.value ? null : opt.value); }}
                      className="text-primary hover:text-primary/80"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </button>
                {expandedInfo === opt.value && (
                  <div className="bg-muted/50 rounded-lg p-3 mt-1 animate-fade-in">
                    <p className="text-[10px] text-foreground font-medium mb-1">{FUNCTION_INFO[opt.value].summary}</p>
                    <ul className="space-y-0.5">
                      {FUNCTION_INFO[opt.value].bullets.map((b, i) => (
                        <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span> {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Save toggle + Check button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={saveToPacket} onCheckedChange={setSaveToPacket} />
            <span className="text-xs text-muted-foreground">Save to Evidence Packet</span>
          </div>
          <div className="flex gap-2">
            {result && (
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
            <Button size="sm" onClick={handleCheck} disabled={!canCheck} className="gap-1.5">
              <HelpCircle className="h-4 w-4" /> Check
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Results ───────────────────────────────────── */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Likelihood badge */}
          <div className={`rounded-xl border p-5 space-y-3 ${likelihoodStyle(result.likelihood)}`}>
            <div className="flex items-center gap-2">
              {likelihoodIcon(result.likelihood)}
              <h4 className="font-display font-bold text-lg text-foreground">{result.label}</h4>
            </div>
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
              result.confidence === 'high' ? 'bg-success/10 text-success' :
              result.confidence === 'moderate' ? 'bg-warning/10 text-warning' :
              'bg-muted text-muted-foreground'
            }`}>
              {result.confidence} confidence
            </span>
            <p className="text-sm text-foreground/80">{result.explanation}</p>
          </div>

          {/* Function-Response Alignment */}
          {result.alignmentFeedback && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5 text-primary" /> Does your response match the function?
              </h4>
              <p className="text-sm text-muted-foreground">{result.alignmentFeedback}</p>
            </div>
          )}

          {/* What to do instead */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
            <h4 className="font-display font-bold text-foreground flex items-center gap-1.5 text-sm">
              <ArrowRight className="h-4 w-4 text-primary" /> What to Do Instead Next Time
            </h4>
            <ul className="space-y-2">
              {result.whatToDoInstead.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold mt-0.5">
                    {i + 1}
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Low/Mixed: link to Translator */}
          {(result.likelihood === 'possibly' || result.confidence === 'low' || result.confidence === 'mixed') && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-2">Want a deeper analysis?</p>
              <Button size="sm" variant="outline" onClick={() => window.location.href = '/toolkit?tab=translator'} className="gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" /> Translate the Behavior
              </Button>
            </div>
          )}

          {/* Linked replacement behaviors */}
          {linkedSkills.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
              <h4 className="font-display font-bold text-foreground flex items-center gap-1.5 text-sm">
                <BookOpen className="h-4 w-4 text-accent" /> Related Replacement Behaviors
              </h4>
              <div className="space-y-3">
                {linkedSkills.map(skill => (
                  <div key={skill.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{skill.trigger}</span>
                      <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">
                        {FUNCTION_LABELS[skill.function as BehaviorFunction] || skill.function}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{skill.definition}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {skill.teachingSteps.slice(0, 2).map((step, i) => (
                        <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground">
                          {step}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────

function likelihoodStyle(l: 'yes' | 'possibly' | 'unlikely'): string {
  switch (l) {
    case 'yes': return 'border-destructive/30 bg-destructive/5';
    case 'possibly': return 'border-warning/30 bg-warning/5';
    case 'unlikely': return 'border-success/30 bg-success/5';
  }
}

function likelihoodIcon(l: 'yes' | 'possibly' | 'unlikely') {
  switch (l) {
    case 'yes': return <XCircle className="h-5 w-5 text-destructive" />;
    case 'possibly': return <AlertTriangle className="h-5 w-5 text-warning" />;
    case 'unlikely': return <CheckCircle2 className="h-5 w-5 text-success" />;
  }
}

function loadLocal(key: string): any[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function saveLocal(key: string, data: any[]) {
  localStorage.setItem(key, JSON.stringify(data));
}
