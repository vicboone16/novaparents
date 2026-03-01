/**
 * Parent Behavior Translator
 * ──────────────────────────
 * Structured ABC input → deterministic function ranking →
 * suggested response + replacement skills from library.
 * Updated: +2 scoring, inline ⓘ, adult reflection, alignment feedback.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, ArrowRight, Pin, Play, Save, ChevronDown, ChevronUp,
  CheckCircle2, Target, Lightbulb, BookOpen, RotateCcw, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  scoreFunctions,
  ANTECEDENT_OPTIONS,
  BEHAVIOR_OPTIONS,
  CONSEQUENCE_OPTIONS,
  FUNCTION_LABELS,
  FUNCTION_CLINICAL_TERMS,
  FUNCTION_INFO,
  DEMAND_INFO,
  ATTENTION_INTENSE_INFO,
  type FunctionInput,
  type FunctionResult,
  type StructuredToggles,
  type AdultReliefSelections,
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

const CONSEQUENCE_TOGGLES: { key: keyof StructuredToggles; label: string; fn: BehaviorFunction }[] = [
  { key: 'attentionGiven', label: 'Attention given', fn: 'attention' },
  { key: 'demandRemoved', label: 'Demand reduced / paused', fn: 'escape' },
  { key: 'accessProvided', label: 'Access to preferred item / activity', fn: 'tangible' },
  { key: 'sensoryChange', label: 'Sensory / environment change', fn: 'sensory' },
];

const ADULT_RELIEF_OPTIONS: { key: keyof AdultReliefSelections; label: string }[] = [
  { key: 'arguingStopped', label: 'The arguing stopped' },
  { key: 'noiseStopped', label: 'The noise stopped' },
  { key: 'taskEnded', label: 'The task ended' },
  { key: 'feltRelief', label: 'I felt relief / calm' },
  { key: 'nothingChanged', label: 'Nothing changed' },
];

export function BehaviorTranslator() {
  const navigate = useNavigate();
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
    attentionIntense: false,
    demandContext: false,
  });

  const [adultRelief, setAdultRelief] = useState<AdultReliefSelections>({
    arguingStopped: false,
    noiseStopped: false,
    taskEnded: false,
    feltRelief: false,
    nothingChanged: false,
  });

  // Inline info state
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null);

  // Filters
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
      adultRelief,
    };

    const res = scoreFunctions(input);
    setResult(res);

    const filtered = library.filter(rb => {
      if (rb.function !== res.topFunction) return false;
      if (commLevel && rb.commLevel !== commLevel) return false;
      if (setting && rb.setting !== setting) return false;
      if (ageBand && rb.ageBand !== ageBand) return false;
      return true;
    });

    const skills = filtered.length > 0
      ? filtered
      : library.filter(rb => rb.function === res.topFunction);

    setMatchedSkills(skills.slice(0, 5));

    if (saveToPacket && userId) {
      logEvent(userId, 'behavior_log_created', {
        logId: crypto.randomUUID(),
        source: 'translator',
        topFunction: res.topFunction,
        confidence: res.overallConfidence,
        behavior,
      });

      const history = loadLocal('bd_translator_history');
      history.unshift({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        antecedent,
        behavior,
        consequence,
        topFunction: res.topFunction,
        confidence: res.overallConfidence,
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
    const prefill = { behavior, antecedent, consequence, setting: setting || '' };
    sessionStorage.setItem('bd_prefill_abc', JSON.stringify(prefill));
    navigate('/log');
  }

  function handleReset() {
    setAntecedent(''); setAntecedentCat('');
    setBehavior(''); setBehaviorCat('');
    setConsequence(''); setConsequenceCat('');
    setToggles({ attentionGiven: false, demandRemoved: false, accessProvided: false, sensoryChange: false, attentionIntense: false, demandContext: false });
    setAdultRelief({ arguingStopped: false, noiseStopped: false, taskEnded: false, feltRelief: false, nothingChanged: false });
    setResult(null); setMatchedSkills([]);
  }

  const canAnalyze = behavior.trim().length > 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="rounded-xl gradient-hero p-4 text-primary-foreground">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5" />
          <h3 className="font-display text-lg font-bold">Translate the Behavior™</h3>
        </div>
        <p className="text-sm text-primary-foreground/80">
          Describe what happened and we'll help identify what the behavior might be communicating.
        </p>
      </div>

      {/* ─── Step 1: Antecedent ──────────────────────── */}
      <div className="space-y-4">
        <FieldGroup label="Step 1: What happened right before?" sub="(Antecedent)">
          <Select value={antecedentCat} onValueChange={setAntecedentCat}>
            <SelectTrigger className="mb-2"><SelectValue placeholder="Select a category (optional)" /></SelectTrigger>
            <SelectContent>
              {ANTECEDENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <InlineInfo
            id="demand"
            expanded={expandedInfo}
            onToggle={setExpandedInfo}
            content={DEMAND_INFO}
          />
          <Textarea
            placeholder="Describe what was happening before the behavior…"
            rows={2}
            value={antecedent}
            onChange={e => setAntecedent(e.target.value)}
          />
          {/* Demand context toggle */}
          <div className="flex items-center gap-2 mt-2">
            <Checkbox
              checked={toggles.demandContext}
              onCheckedChange={(v) => setToggles(t => ({ ...t, demandContext: !!v }))}
            />
            <span className="text-xs text-foreground">Was there a demand?</span>
            <InlineInfoButton id="demand-toggle" expanded={expandedInfo} onToggle={setExpandedInfo} />
          </div>
          {expandedInfo === 'demand-toggle' && (
            <InlineInfoPanel content={DEMAND_INFO} />
          )}
        </FieldGroup>

        {/* ─── Step 2: Behavior ──────────────────────── */}
        <FieldGroup label="Step 2: What did the Learner do?" sub="(Behavior)">
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

        {/* ─── Step 3: Consequences (multi-select) ──── */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
          <div>
            <label className="text-sm font-semibold text-foreground">Step 3: What happened after?</label>
            <p className="text-[10px] text-muted-foreground">Select all that apply.</p>
          </div>

          <div className="space-y-2">
            {CONSEQUENCE_TOGGLES.map(ct => (
              <div key={ct.key}>
                <button
                  onClick={() => setToggles(t => ({ ...t, [ct.key]: !t[ct.key] }))}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    toggles[ct.key]
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-muted/20 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox checked={!!toggles[ct.key]} onCheckedChange={(v) => setToggles(t => ({ ...t, [ct.key]: !!v }))} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{ct.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Also known as: {FUNCTION_CLINICAL_TERMS[ct.fn]}
                      </p>
                    </div>
                    <InlineInfoButton id={`consequence-${ct.fn}`} expanded={expandedInfo} onToggle={setExpandedInfo} />
                  </div>
                </button>
                {expandedInfo === `consequence-${ct.fn}` && (
                  <InlineInfoPanel content={FUNCTION_INFO[ct.fn]} />
                )}
              </div>
            ))}
          </div>

          {/* Attention intensity toggle */}
          {toggles.attentionGiven && (
            <div className="mt-2 ml-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!!toggles.attentionIntense}
                  onCheckedChange={(v) => setToggles(t => ({ ...t, attentionIntense: !!v }))}
                />
                <span className="text-xs text-foreground">Was attention extended or intense?</span>
                <InlineInfoButton id="attention-intense" expanded={expandedInfo} onToggle={setExpandedInfo} />
              </div>
              {expandedInfo === 'attention-intense' && (
                <InlineInfoPanel content={ATTENTION_INTENSE_INFO} />
              )}
            </div>
          )}

          {/* Free text consequence */}
          <Textarea
            placeholder="Any other details about what happened after…"
            rows={2}
            value={consequence}
            onChange={e => setConsequence(e.target.value)}
            className="mt-2"
          />
        </div>

        {/* ─── Step 4: Adult Reflection (optional) ──── */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
          <div>
            <label className="text-sm font-semibold text-foreground">Step 4: Quick reflection (optional)</label>
            <p className="text-[10px] text-muted-foreground">
              Sometimes behavior changes things for adults too. Did your response make anything easier for you?
            </p>
          </div>
          <div className="space-y-2">
            {ADULT_RELIEF_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setAdultRelief(a => ({ ...a, [opt.key]: !a[opt.key] }))}
                className={`w-full text-left rounded-lg border p-3 transition-all ${
                  adultRelief[opt.key]
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-muted/20 hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox checked={adultRelief[opt.key]} onCheckedChange={() => setAdultRelief(a => ({ ...a, [opt.key]: !a[opt.key] }))} />
                  <span className="text-sm text-foreground">{opt.label}</span>
                </div>
              </button>
            ))}
          </div>
          {(adultRelief.arguingStopped || adultRelief.noiseStopped || adultRelief.taskEnded || adultRelief.feltRelief) && (
            <p className="text-[10px] text-muted-foreground italic bg-muted/50 rounded-lg p-2">
              Noticing this doesn't mean you did anything wrong. It just helps us understand the full behavior loop.
            </p>
          )}
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
              <Target className="h-4 w-4" /> Analyze
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Results ───────────────────────────────────── */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Clarification question */}
          {result.needsClarification && result.clarificationQuestion && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-2">
              <p className="text-sm text-foreground">{result.clarificationQuestion}</p>
            </div>
          )}

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
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${confidenceStyle(result.overallConfidence)}`}>
                  {result.overallConfidence} confidence
                </span>
              </div>
              <div>
                <p className="font-display font-bold text-lg text-foreground">
                  {result.isMixed ? 'Mixed Function' : result.rankings[0].label}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Also known as: {result.rankings[0].clinicalTerm}
                </p>
              </div>
              {result.secondaryFunction && !result.isMixed && (
                <p className="text-xs text-muted-foreground">
                  Secondary: {FUNCTION_LABELS[result.secondaryFunction]}
                </p>
              )}
              <p className="text-sm text-muted-foreground">{result.explanation}</p>
            </div>

            {/* Micro-feedback */}
            {result.topFunction === 'attention' && (
              <p className="text-[10px] text-muted-foreground italic bg-muted/30 rounded-lg p-2">
                💡 Attention isn't always positive — negative attention (arguing, lecturing) can still strengthen behavior.
              </p>
            )}

            {/* Full ranking bars (no numeric scores shown to parents) */}
            {showRankings && (
              <div className="space-y-2">
                {result.rankings.map(r => {
                  const maxScore = Math.max(...result.rankings.map(x => x.score), 1);
                  return (
                    <div key={r.function} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground font-medium">{r.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${confidenceStyle(r.confidence)}`}>
                          {r.confidence}
                        </span>
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

          {/* Function-Response Alignment */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5 text-primary" /> Does your response match the function?
            </h4>
            <p className="text-sm text-muted-foreground">{result.alignmentFeedback}</p>
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
                        {FUNCTION_LABELS[skill.function as BehaviorFunction] || skill.function}
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

function InlineInfoButton({ id, expanded, onToggle }: { id: string; expanded: string | null; onToggle: (id: string | null) => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(expanded === id ? null : id); }}
      className="text-primary hover:text-primary/80 transition-colors"
      aria-label="More info"
    >
      <Info className="h-3.5 w-3.5" />
    </button>
  );
}

function InlineInfo({ id, expanded, onToggle, content }: {
  id: string; expanded: string | null; onToggle: (id: string | null) => void;
  content: { summary: string; bullets: string[] };
}) {
  return (
    <>
      <button
        onClick={() => onToggle(expanded === id ? null : id)}
        className="text-[10px] text-primary flex items-center gap-0.5"
      >
        <Info className="h-3 w-3" /> {expanded === id ? 'Hide info' : 'More info'}
      </button>
      {expanded === id && <InlineInfoPanel content={content} />}
    </>
  );
}

function InlineInfoPanel({ content }: { content: { summary: string; bullets: string[] } }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 mt-1 animate-fade-in">
      <p className="text-[10px] text-foreground font-medium mb-1">{content.summary}</p>
      <ul className="space-y-0.5">
        {content.bullets.map((b, i) => (
          <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
            <span className="text-primary mt-0.5">•</span> {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function confidenceStyle(c: 'high' | 'moderate' | 'low' | 'mixed'): string {
  switch (c) {
    case 'high': return 'bg-success/10 text-success';
    case 'moderate': return 'bg-warning/10 text-warning';
    case 'mixed': return 'bg-secondary/10 text-secondary';
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
