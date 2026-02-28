/**
 * Parent Behavior Translator
 * ──────────────────────────
 * Structured ABC input → deterministic function ranking →
 * suggested response + replacement skills from library.
 */

import { useState, useEffect } from 'react';
import {
  Sparkles, ArrowRight, Pin, Play, Save, ChevronDown, ChevronUp,
  CheckCircle2, Target, Lightbulb, BookOpen, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  scoreFunctions,
  ANTECEDENT_OPTIONS,
  BEHAVIOR_OPTIONS,
  CONSEQUENCE_OPTIONS,
  type FunctionInput,
  type FunctionResult,
  type StructuredToggles,
  type BehaviorFunction,
} from '@/lib/analysis';
import { getReplacementBehaviors, type ReplacementBehavior } from '@/lib/dal';
import { getCurrentUser } from '@/lib/dal';
import { logEvent } from '@/lib/engagement';

const PINNED_KEY = 'bd_pinned_plans';

interface PinnedPlan {
  id: string;
  date: string;
  topFunction: string;
  behavior: string;
  suggestedResponse: string[];
  replacementSkills: string[];
}

export function BehaviorTranslator() {
  const [userId, setUserId] = useState('');
  const [library, setLibrary] = useState<ReplacementBehavior[]>([]);

  // Form state
  const [antecedent, setAntecedent] = useState('');
  const [antecedentCat, setAntecedentCat] = useState('');
  const [behavior, setBehavior] = useState('');
  const [behaviorCat, setBehaviorCat] = useState('');
  const [consequence, setConsequence] = useState('');
  const [consequenceCat, setConsequenceCat] = useState('');

  const [toggles, setToggles] = useState<StructuredToggles>({
    attentionGiven: false,
    demandRemoved: false,
    accessProvided: false,
    sensoryChange: false,
  });

  // Filters for replacement skills
  const [commLevel, setCommLevel] = useState('');
  const [setting, setSetting] = useState('');
  const [ageBand, setAgeBand] = useState('');

  const [saveToPacket, setSaveToPacket] = useState(true);
  const [result, setResult] = useState<FunctionResult | null>(null);
  const [matchedSkills, setMatchedSkills] = useState<ReplacementBehavior[]>([]);
  const [showRankings, setShowRankings] = useState(false);
  const [pinnedPlans, setPinnedPlans] = useState<PinnedPlan[]>(() => {
    try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]'); } catch { return []; }
  });

  useEffect(() => {
    getCurrentUser().then(u => { if (u) setUserId(u.id); });
    getReplacementBehaviors().then(setLibrary);
  }, []);

  function handleAnalyze() {
    const input: FunctionInput = {
      antecedent,
      antecedentCategory: antecedentCat,
      behavior,
      behaviorCategory: behaviorCat,
      consequence,
      consequenceCategory: consequenceCat,
      toggles,
    };

    const res = scoreFunctions(input);
    setResult(res);

    // Filter replacement skills by top function + optional filters
    const filtered = library.filter(rb => {
      if (rb.function !== res.topFunction) return false;
      if (commLevel && rb.commLevel !== commLevel) return false;
      if (setting && rb.setting !== setting) return false;
      if (ageBand && rb.ageBand !== ageBand) return false;
      return true;
    });

    // If no exact matches, fall back to just function match
    const skills = filtered.length > 0
      ? filtered
      : library.filter(rb => rb.function === res.topFunction);

    setMatchedSkills(skills.slice(0, 5));

    // Save to evidence packet engagement log
    if (saveToPacket && userId) {
      logEvent(userId, 'behavior_log_created', {
        logId: crypto.randomUUID(),
        source: 'translator',
        topFunction: res.topFunction,
        confidence: res.rankings[0].confidence,
        behavior,
      });

      // Also save to local translator history
      const history = loadLocal('bd_translator_history');
      history.unshift({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        antecedent,
        behavior,
        consequence,
        topFunction: res.topFunction,
        confidence: res.rankings[0].confidence,
        scores: res.rankings.map(r => ({ fn: r.function, score: r.score })),
      });
      saveLocal('bd_translator_history', history.slice(0, 100));
    }
  }

  function handlePinPlan() {
    if (!result) return;
    const plan: PinnedPlan = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      topFunction: result.topFunction,
      behavior,
      suggestedResponse: result.suggestedResponse,
      replacementSkills: matchedSkills.map(s => s.trigger),
    };
    const updated = [plan, ...pinnedPlans].slice(0, 20);
    setPinnedPlans(updated);
    localStorage.setItem(PINNED_KEY, JSON.stringify(updated));
  }

  function handleStartTracking() {
    // Prefill ABC log data
    const prefill = {
      behavior,
      antecedent,
      consequence,
      setting: setting || '',
    };
    sessionStorage.setItem('bd_prefill_abc', JSON.stringify(prefill));
    window.location.href = '/log';
  }

  function handleReset() {
    setAntecedent('');
    setAntecedentCat('');
    setBehavior('');
    setBehaviorCat('');
    setConsequence('');
    setConsequenceCat('');
    setToggles({ attentionGiven: false, demandRemoved: false, accessProvided: false, sensoryChange: false });
    setResult(null);
    setMatchedSkills([]);
  }

  const canAnalyze = behavior.trim().length > 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="rounded-xl gradient-hero p-4 text-primary-foreground">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5" />
          <h3 className="font-display text-lg font-bold">Parent Behavior Translator</h3>
        </div>
        <p className="text-sm text-primary-foreground/80">
          Describe what happened and get a function-based analysis with replacement skill ideas.
        </p>
      </div>

      {/* ─── Inputs ────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Antecedent */}
        <FieldGroup label="What happened right before?" sub="(Antecedent)">
          <Select value={antecedentCat} onValueChange={setAntecedentCat}>
            <SelectTrigger className="mb-2"><SelectValue placeholder="Select a category (optional)" /></SelectTrigger>
            <SelectContent>
              {ANTECEDENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Describe what was happening before the behavior…"
            rows={2}
            value={antecedent}
            onChange={e => setAntecedent(e.target.value)}
          />
        </FieldGroup>

        {/* Behavior */}
        <FieldGroup label="What did the Learner do?" sub="(Behavior)">
          <Select value={behaviorCat} onValueChange={setBehaviorCat}>
            <SelectTrigger className="mb-2"><SelectValue placeholder="Select a category (optional)" /></SelectTrigger>
            <SelectContent>
              {BEHAVIOR_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Describe the behavior you observed…"
            rows={2}
            value={behavior}
            onChange={e => setBehavior(e.target.value)}
          />
        </FieldGroup>

        {/* Consequence */}
        <FieldGroup label="What did the adult do right after?" sub="(Consequence)">
          <Select value={consequenceCat} onValueChange={setConsequenceCat}>
            <SelectTrigger className="mb-2"><SelectValue placeholder="Select a category (optional)" /></SelectTrigger>
            <SelectContent>
              {CONSEQUENCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Describe how you or others responded…"
            rows={2}
            value={consequence}
            onChange={e => setConsequence(e.target.value)}
          />
        </FieldGroup>

        {/* Structured toggles */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What happened as a result?</h4>
          <ToggleRow
            label="Attention given?"
            sub="Adult looked, talked, comforted, or reacted"
            checked={toggles.attentionGiven}
            onChange={v => setToggles(t => ({ ...t, attentionGiven: v }))}
          />
          <ToggleRow
            label="Demand removed / break given?"
            sub="Task stopped, reduced, or postponed"
            checked={toggles.demandRemoved}
            onChange={v => setToggles(t => ({ ...t, demandRemoved: v }))}
          />
          <ToggleRow
            label="Access provided?"
            sub="Learner got the item, activity, or screen"
            checked={toggles.accessProvided}
            onChange={v => setToggles(t => ({ ...t, accessProvided: v }))}
          />
          <ToggleRow
            label="Sensory change?"
            sub="Environment changed (quieter, moved, etc.)"
            checked={toggles.sensoryChange}
            onChange={v => setToggles(t => ({ ...t, sensoryChange: v }))}
          />
        </div>

        {/* Optional filters */}
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filter Replacement Skills (optional)</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Communication Level</label>
              <Select value={commLevel} onValueChange={setCommLevel}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre-verbal">Pre-verbal</SelectItem>
                  <SelectItem value="emerging">Emerging</SelectItem>
                  <SelectItem value="verbal">Verbal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Setting</label>
              <Select value={setting} onValueChange={setSetting}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Age Band</label>
              <Select value={ageBand} onValueChange={setAgeBand}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="early-childhood">Early Childhood</SelectItem>
                  <SelectItem value="school-age">School Age</SelectItem>
                  <SelectItem value="adolescent">Adolescent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Save toggle + Analyze button */}
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
            <Button size="sm" onClick={handleAnalyze} disabled={!canAnalyze} className="gap-1.5">
              <Target className="h-4 w-4" /> Analyze Behavior
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Results ───────────────────────────────────── */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Function ranking */}
          <div className="rounded-xl border border-primary/20 bg-card p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-foreground flex items-center gap-1.5">
                <Target className="h-4 w-4 text-primary" /> Likely Function
              </h4>
              <button
                onClick={() => setShowRankings(!showRankings)}
                className="text-xs text-primary font-semibold flex items-center gap-1"
              >
                {showRankings ? 'Hide' : 'Show'} all
                {showRankings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            {/* Top result */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${confidenceStyle(result.rankings[0].confidence)}`}>
                  {result.rankings[0].confidence} confidence
                </span>
                <span className="font-display font-bold text-lg text-foreground">{result.rankings[0].label}</span>
              </div>
              <p className="text-sm text-muted-foreground">{result.explanation}</p>
            </div>

            {/* Full ranking bars */}
            {showRankings && (
              <div className="space-y-2">
                {result.rankings.map(r => {
                  const maxScore = Math.max(...result.rankings.map(x => x.score), 1);
                  return (
                    <div key={r.function} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground font-medium">{r.label}</span>
                        <span className="text-muted-foreground">{r.score} pts ({r.confidence})</span>
                      </div>
                      <div className="h-2 rounded-full bg-border overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${functionBarColor(r.function)}`}
                          style={{ width: `${(r.score / maxScore) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Suggested response */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
            <h4 className="font-display font-bold text-foreground flex items-center gap-1.5 text-sm">
              <Lightbulb className="h-4 w-4 text-secondary" /> Suggested Response
            </h4>
            <ol className="space-y-2">
              {result.suggestedResponse.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary text-[10px] font-bold mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Replacement skills */}
          {matchedSkills.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
              <h4 className="font-display font-bold text-foreground flex items-center gap-1.5 text-sm">
                <BookOpen className="h-4 w-4 text-accent" /> Replacement Skill Ideas
              </h4>
              <div className="space-y-3">
                {matchedSkills.map(skill => (
                  <div key={skill.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{skill.trigger}</span>
                      <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">
                        {skill.function}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{skill.definition}</p>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">Teaching Steps:</p>
                      <ul className="space-y-0.5">
                        {skill.teachingSteps.slice(0, 3).map((step, i) => (
                          <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                            <CheckCircle2 className="h-3 w-3 text-success shrink-0 mt-0.5" />
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handlePinPlan} className="gap-1.5">
              <Pin className="h-3.5 w-3.5" /> Pin Plan
            </Button>
            <Button variant="outline" size="sm" onClick={handleStartTracking} className="gap-1.5">
              <Play className="h-3.5 w-3.5" /> Start Tracking
            </Button>
          </div>
        </div>
      )}

      {/* Pinned plans */}
      {pinnedPlans.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Pin className="h-3 w-3" /> Pinned Plans ({pinnedPlans.length})
          </h4>
          {pinnedPlans.slice(0, 5).map(plan => (
            <div key={plan.id} className="rounded-lg bg-muted/30 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{plan.behavior}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(plan.date).toLocaleDateString()}
                </span>
              </div>
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">
                {plan.topFunction}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────

function FieldGroup({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
      <div>
        <label className="text-sm font-semibold text-foreground">{label}</label>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, sub, checked, onChange }: {
  label: string; sub: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function confidenceStyle(c: 'high' | 'moderate' | 'low'): string {
  switch (c) {
    case 'high': return 'bg-success/10 text-success';
    case 'moderate': return 'bg-warning/10 text-warning';
    case 'low': return 'bg-muted text-muted-foreground';
  }
}

function functionBarColor(fn: BehaviorFunction): string {
  switch (fn) {
    case 'attention': return 'bg-primary';
    case 'escape': return 'bg-secondary';
    case 'tangible': return 'bg-accent';
    case 'sensory': return 'bg-warning';
  }
}

function loadLocal(key: string): any[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function saveLocal(key: string, data: any[]) {
  localStorage.setItem(key, JSON.stringify(data));
}
