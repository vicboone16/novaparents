/**
 * Weekly Snapshot Builder
 * ──────────────────────
 * Creates a row in public.coach_evidence_packets.
 * Flow: Week Picker → Build → Preview → Save (draft) / Submit
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeft, ArrowRight, Calendar, Save, Send,
  Loader2, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  getRecentWeeks,
  defaultSnapshotTitle,
  createSnapshot,
  checkAgencyLink,
  getMyLearners,
  FUNCTION_OPTIONS,
  TRIGGER_OPTIONS,
  type AgencyLinkInfo,
} from '@/lib/snapshots';
import { supabase } from '@/integrations/supabase/client';

type Step = 'week' | 'build' | 'preview';

export default function SnapshotBuilderPage() {
  const [step, setStep] = useState<Step>('week');
  const [agencyLink, setAgencyLink] = useState<AgencyLinkInfo>({ isLinked: false });
  const [learners, setLearners] = useState<{ clientId: string; agencyId: string }[]>([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const weeks = getRecentWeeks(8);
  const [selectedWeek, setSelectedWeek] = useState(weeks[0]);

  const [form, setForm] = useState({
    title: defaultSnapshotTitle(weeks[0].label),
    description: '',
    topFunctions: [] as string[],
    topTriggers: [] as string[],
    caregiverName: '',
    caregiverRelationship: '',
  });

  const [expandedInfo, setExpandedInfo] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [link, learnerList] = await Promise.all([
        checkAgencyLink(),
        getMyLearners(),
      ]);
      setAgencyLink(link);
      setLearners(learnerList);
      if (link.clientId) setSelectedLearnerId(link.clientId);
      else if (learnerList.length > 0) setSelectedLearnerId(learnerList[0].clientId);
    })();
  }, []);

  function handleSelectWeek(week: typeof weeks[0]) {
    setSelectedWeek(week);
    setForm(f => ({ ...f, title: defaultSnapshotTitle(week.label) }));
    setStep('build');
  }

  function toggleMulti(field: 'topFunctions' | 'topTriggers', value: string) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter(v => v !== value)
        : [...f[field], value],
    }));
  }

  function buildEvidenceSummary(): string {
    const parts: string[] = [];
    if (form.topFunctions.length > 0) {
      const labels = form.topFunctions.map(v => FUNCTION_OPTIONS.find(o => o.value === v)?.label || v);
      parts.push(`Functions: ${labels.join(', ')}`);
    }
    if (form.topTriggers.length > 0) {
      const labels = form.topTriggers.map(v => TRIGGER_OPTIONS.find(o => o.value === v)?.label || v);
      parts.push(`Triggers: ${labels.join(', ')}`);
    }
    return parts.join(' | ');
  }

  function getAgencyIdForLearner(): string | null {
    const match = learners.find(l => l.clientId === selectedLearnerId);
    return match?.agencyId || agencyLink.agencyId || null;
  }

  async function handleSave() {
    if (!selectedLearnerId) {
      toast({ title: 'Select a Learner', description: 'Please choose a learner before saving.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    setErrorDetail(null);

    const result = await createSnapshot({
      agencyId: getAgencyIdForLearner(),
      studentId: selectedLearnerId,
      title: form.title,
      description: form.description,
      evidenceSummary: buildEvidenceSummary(),
      caregiverName: form.caregiverName || undefined,
      caregiverRelationship: form.caregiverRelationship || undefined,
      status: 'draft',
    });

    setSaving(false);
    if (result.success) {
      toast({ title: '✅ Snapshot Saved', description: `"${form.title}" saved as draft.` });
      navigate('/insights');
    } else {
      setErrorDetail(result.error || 'Unknown error');
      toast({ title: 'Save Failed', description: result.error || 'Could not save snapshot.', variant: 'destructive' });
    }
  }

  async function handleSubmit() {
    if (!selectedLearnerId) {
      toast({ title: 'Select a Learner', description: 'Please choose a learner before submitting.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    setErrorDetail(null);

    const result = await createSnapshot({
      agencyId: getAgencyIdForLearner(),
      studentId: selectedLearnerId,
      title: form.title,
      description: form.description,
      evidenceSummary: buildEvidenceSummary(),
      caregiverName: form.caregiverName || undefined,
      caregiverRelationship: form.caregiverRelationship || undefined,
      status: 'submitted',
    });

    setSubmitting(false);
    if (result.success) {
      toast({ title: '📤 Snapshot Submitted', description: `"${form.title}" submitted for review.` });
      navigate('/insights');
    } else {
      setErrorDetail(result.error || 'Unknown error');
      toast({ title: 'Submit Failed', description: result.error || 'Could not submit snapshot.', variant: 'destructive' });
    }
  }

  // ─── Step: Week Picker ─────────────────────────────────
  if (step === 'week') {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/insights')} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Create Weekly Snapshot</h2>
            <p className="text-sm text-muted-foreground">Pick the week to summarize.</p>
          </div>
        </div>

        {/* Learner selector */}
        {learners.length > 1 && (
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Learner</label>
            <select
              value={selectedLearnerId}
              onChange={e => setSelectedLearnerId(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
            >
              {learners.map(l => (
                <option key={l.clientId} value={l.clientId}>{l.clientId.slice(0, 8)}…</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          {weeks.map(week => (
            <button
              key={week.start}
              onClick={() => handleSelectWeek(week)}
              className="w-full flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-soft transition-all"
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">{week.label}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Step: Build ───────────────────────────────────────
  if (step === 'build') {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('week')} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Build Snapshot</h2>
            <p className="text-xs text-muted-foreground">{selectedWeek.label}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Title</label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Weekly Snapshot — Week of..."
            />
          </div>

          {/* Functions */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Top Functions (Why)</p>
            <div className="flex flex-wrap gap-2">
              {FUNCTION_OPTIONS.map(opt => (
                <div key={opt.value} className="space-y-1">
                  <button
                    onClick={() => toggleMulti('topFunctions', opt.value)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                      form.topFunctions.includes(opt.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {opt.label}
                    <button
                      onClick={e => { e.stopPropagation(); setExpandedInfo(expandedInfo === opt.value ? null : opt.value); }}
                      className="ml-0.5 opacity-60 hover:opacity-100"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </button>
                  {expandedInfo === opt.value && (
                    <div className="rounded-lg bg-muted/50 border border-border px-3 py-2 text-[11px] text-muted-foreground animate-fade-in">
                      <p className="font-semibold text-foreground">{opt.alt}</p>
                      <p className="mt-0.5">{opt.example}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Triggers */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Top Triggers</p>
            <div className="flex flex-wrap gap-2">
              {TRIGGER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => toggleMulti('topTriggers', opt.value)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    form.topTriggers.includes(opt.value)
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Caregiver info (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Caregiver Name (optional)</label>
              <Input
                value={form.caregiverName}
                onChange={e => setForm(f => ({ ...f, caregiverName: e.target.value }))}
                placeholder="e.g. Maria"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Relationship (optional)</label>
              <Input
                value={form.caregiverRelationship}
                onChange={e => setForm(f => ({ ...f, caregiverRelationship: e.target.value }))}
                placeholder="e.g. Mother"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">Notes</p>
            <Textarea
              placeholder="Anything you'd like to add about this week…"
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>

        <Button className="w-full gap-1.5" onClick={() => setStep('preview')}>
          Preview Snapshot <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // ─── Step: Preview ─────────────────────────────────────
  const summaryText = buildEvidenceSummary();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('build')} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Preview</h2>
          <p className="text-xs text-muted-foreground">{selectedWeek.label}</p>
        </div>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-soft space-y-4">
        <h3 className="font-display text-base font-bold text-foreground">{form.title}</h3>

        {summaryText && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Evidence Summary</p>
            <p className="text-sm text-foreground">{summaryText}</p>
          </div>
        )}

        {form.topFunctions.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Functions</p>
            <div className="flex flex-wrap gap-1.5">
              {form.topFunctions.map(f => (
                <span key={f} className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[10px] font-bold">
                  {FUNCTION_OPTIONS.find(o => o.value === f)?.label || f}
                </span>
              ))}
            </div>
          </div>
        )}

        {form.topTriggers.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Triggers</p>
            <div className="flex flex-wrap gap-1.5">
              {form.topTriggers.map(t => (
                <span key={t} className="rounded-full bg-secondary/10 text-secondary px-2.5 py-0.5 text-[10px] font-bold">
                  {TRIGGER_OPTIONS.find(o => o.value === t)?.label || t}
                </span>
              ))}
            </div>
          </div>
        )}

        {form.description && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Notes</p>
            <p className="text-sm text-foreground">{form.description}</p>
          </div>
        )}

        {form.caregiverName && (
          <div className="text-xs text-muted-foreground">
            Caregiver: {form.caregiverName}{form.caregiverRelationship ? ` (${form.caregiverRelationship})` : ''}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          className="w-full gap-1.5"
          onClick={handleSave}
          disabled={saving || submitting}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save Weekly Snapshot'}
        </Button>

        {agencyLink.isLinked ? (
          <Button
            variant="outline"
            className="w-full gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            onClick={handleSubmit}
            disabled={saving || submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? 'Submitting…' : 'Submit Weekly Snapshot'}
          </Button>
        ) : (
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Link to an agency to share with your support team (optional).
            </p>
          </div>
        )}
      </div>

      {/* Error detail */}
      {errorDetail && <ErrorDetail error={errorDetail} />}
    </div>
  );
}

function ErrorDetail({ error }: { error: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-xs text-destructive font-semibold">
        ⚠️ Something went wrong
        {open ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>
      {open && (
        <pre className="mt-2 text-[10px] text-destructive/80 whitespace-pre-wrap break-all font-mono bg-destructive/5 rounded p-2">
          {error}
        </pre>
      )}
    </div>
  );
}
