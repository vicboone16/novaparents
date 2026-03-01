/**
 * Weekly Snapshot Builder
 * ──────────────────────
 * Multi-step flow: Week Picker → Build → Preview → Save / Share
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeft, ArrowRight, Calendar, Save, Send, CheckCircle2, Info,
  Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/dal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  getRecentWeeks,
  autoFillSnapshot,
  saveSnapshot,
  shareSnapshot,
  checkAgencyLink,
  FUNCTION_OPTIONS,
  TRIGGER_OPTIONS,
  type WeeklySnapshot,
  type AgencyLinkInfo,
} from '@/lib/snapshots';

type Step = 'week' | 'build' | 'preview';

export default function SnapshotBuilderPage() {
  const [step, setStep] = useState<Step>('week');
  const [userId, setUserId] = useState('');
  const [agencyLink, setAgencyLink] = useState<AgencyLinkInfo>({ isLinked: false });
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Week selection
  const weeks = getRecentWeeks(8);
  const [selectedWeek, setSelectedWeek] = useState(weeks[0]);

  // Form state
  const [form, setForm] = useState({
    abcCount: 0,
    frequencyTotal: 0,
    durationMinutesTotal: 0,
    intensityAvg: 0,
    topFunctions: [] as string[],
    topTriggers: [] as string[],
    toolsUsed: [] as string[],
    engagementMinutes: 0,
    gamesCompleted: 0,
    parentNotes: '',
  });

  // Info expand state for functions
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser().then(async u => {
      if (u) {
        setUserId(u.id);
        const link = await checkAgencyLink();
        setAgencyLink(link);
      }
    });
  }, []);

  function handleSelectWeek(week: typeof weeks[0]) {
    setSelectedWeek(week);
    // Auto-fill
    const prefill = autoFillSnapshot(userId, week.start, week.end);
    setForm(f => ({ ...f, ...prefill }));
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

  function buildSnapshotObject(): WeeklySnapshot {
    return {
      id: crypto.randomUUID(),
      userId,
      clientId: agencyLink.clientId,
      weekStart: selectedWeek.start,
      weekEnd: selectedWeek.end,
      createdAt: new Date().toISOString(),
      status: 'saved',
      ...form,
    };
  }

  async function handleSave() {
    setSaving(true);
    try {
      const snapshot = buildSnapshotObject();
      saveSnapshot(snapshot);
      toast({ title: '✅ Snapshot Saved', description: `Week of ${selectedWeek.label} saved locally.` });
      navigate('/insights');
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Could not save.', variant: 'destructive' });
    }
    setSaving(false);
  }

  async function handleShare() {
    setSharing(true);
    setShareError(null);
    try {
      const snapshot = buildSnapshotObject();
      snapshot.status = 'pending_review';
      snapshot.sharedAt = new Date().toISOString();

      const result = await shareSnapshot(snapshot);
      if (!result.success) {
        // Save locally anyway with pending status
        saveSnapshot(snapshot);
        setShareError(result.error || 'Share failed');
        toast({
          title: '⚠️ Shared Locally',
          description: 'Snapshot saved. Sharing to your support team is not yet available in this environment.',
        });
      } else {
        saveSnapshot(snapshot);
        toast({ title: '📤 Snapshot Shared', description: 'Your weekly snapshot has been submitted for review.' });
      }
      navigate('/insights');
    } catch (err: any) {
      setShareError(err?.message || 'Unknown error');
      toast({ title: 'Error', description: err?.message || 'Could not share.', variant: 'destructive' });
    }
    setSharing(false);
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
          {/* Numeric fields */}
          <div className="grid grid-cols-2 gap-3">
            <NumField label="ABC Entries" value={form.abcCount} onChange={v => setForm(f => ({ ...f, abcCount: v }))} />
            <NumField label="Frequency Total" value={form.frequencyTotal} onChange={v => setForm(f => ({ ...f, frequencyTotal: v }))} />
            <NumField label="Duration (min)" value={form.durationMinutesTotal} onChange={v => setForm(f => ({ ...f, durationMinutesTotal: v }))} />
            <NumField label="Avg Intensity" value={form.intensityAvg} onChange={v => setForm(f => ({ ...f, intensityAvg: v }))} step={0.1} />
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

          {/* Engagement */}
          <div className="grid grid-cols-2 gap-3">
            <NumField label="App Minutes" value={form.engagementMinutes} onChange={v => setForm(f => ({ ...f, engagementMinutes: v }))} />
            <NumField label="Games Completed" value={form.gamesCompleted} onChange={v => setForm(f => ({ ...f, gamesCompleted: v }))} />
          </div>

          {/* Tools used (read-only chips) */}
          {form.toolsUsed.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Tools Used</p>
              <div className="flex flex-wrap gap-1.5">
                {form.toolsUsed.map(t => (
                  <span key={t} className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[10px] font-bold">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">Notes</p>
            <Textarea
              placeholder="Anything you'd like to add about this week…"
              rows={3}
              value={form.parentNotes}
              onChange={e => setForm(f => ({ ...f, parentNotes: e.target.value }))}
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
        <div className="grid grid-cols-4 gap-2 text-center">
          <MiniStat label="ABC" value={String(form.abcCount)} />
          <MiniStat label="Freq" value={String(form.frequencyTotal)} />
          <MiniStat label="Duration" value={`${form.durationMinutesTotal}m`} />
          <MiniStat label="Intensity" value={form.intensityAvg > 0 ? form.intensityAvg.toFixed(1) : '—'} />
        </div>

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

        {form.parentNotes && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Notes</p>
            <p className="text-sm text-foreground">{form.parentNotes}</p>
          </div>
        )}

        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>🕐 {form.engagementMinutes}m in app</span>
          <span>🎮 {form.gamesCompleted} games</span>
          {form.toolsUsed.length > 0 && <span>🔧 {form.toolsUsed.length} tools</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          className="w-full gap-1.5"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save Weekly Snapshot'}
        </Button>

        {agencyLink.isLinked ? (
          <Button
            variant="outline"
            className="w-full gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            onClick={handleShare}
            disabled={sharing}
          >
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sharing ? 'Sharing…' : 'Share Weekly Snapshot'}
          </Button>
        ) : (
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Link to an agency to share with your support team (optional).
            </p>
          </div>
        )}
      </div>

      {/* Share error detail */}
      {shareError && (
        <ShareErrorDetail error={shareError} />
      )}
    </div>
  );
}

// ─── Small components ────────────────────────────────────

function NumField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <label className="text-xs font-medium text-foreground mb-1 block">{label}</label>
      <Input
        type="number"
        step={step}
        min={0}
        value={value}
        onChange={e => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <p className="font-display text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ShareErrorDetail({ error }: { error: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-xs text-destructive font-semibold">
        ⚠️ Share encountered an issue
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
