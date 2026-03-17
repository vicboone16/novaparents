/**
 * Enhanced Log Page
 * ─────────────────
 * Tabs: ABC Log | Frequency | Duration | Implementation | Session Timer
 * Coaches log Learner data here — never clinical SOAP notes.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { PenLine, Plus, Clock, MapPin, AlertTriangle, Hash, Timer, ClipboardList, Play, Pause, Square, User, Link2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/dal';
import { supabase } from '@/integrations/supabase/client';
import { useUserAccess } from '@/contexts/UserAccessContext';
import { logBehaviorLogCreated, logImplementationLogCreated } from '@/lib/engagement';
import { getLocalLearners, type LocalLearner } from '@/components/IndependentLearnerForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Types ───────────────────────────────────────────────

interface ABCEntry {
  id: string; date: string; time: string; behavior: string; antecedent: string;
  consequence: string; intensity: number; setting: string; notes: string; learnerId?: string;
}
interface FrequencyEntry {
  id: string; date: string; behavior: string; count: number; period: string; setting: string; notes: string; learnerId?: string;
}
interface DurationEntry {
  id: string; date: string; behavior: string; durationMin: number; setting: string; notes: string; learnerId?: string;
}
interface ImplEntry {
  id: string; date: string; strategy: string; context: string; outcome: string; notes: string; learnerId?: string;
}

type LogTab = 'abc' | 'frequency' | 'duration' | 'implementation' | 'timer';
type LearnerOption = { id: string; name: string; type: 'linked' | 'local' };

// ─── Storage helpers ─────────────────────────────────────

function load<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function save<T>(key: string, data: T[]) { localStorage.setItem(key, JSON.stringify(data)); }

const intensityLabels: Record<number, { label: string; cls: string }> = {
  1: { label: '1 – Minimal', cls: 'bg-success/10 text-success' },
  2: { label: '2 – Mild', cls: 'bg-success/10 text-success' },
  3: { label: '3 – Moderate', cls: 'bg-warning/10 text-warning' },
  4: { label: '4 – Significant', cls: 'bg-destructive/10 text-destructive' },
  5: { label: '5 – Severe', cls: 'bg-destructive/10 text-destructive' },
};

function getLearnerName(learnerId: string | undefined, learners: LearnerOption[]): string | null {
  if (!learnerId) return null;
  return learners.find(l => l.id === learnerId)?.name || null;
}

// ─── Shared: Learner badge on entry cards ────────────────

function LearnerBadge({ learnerId, learners }: { learnerId?: string; learners: LearnerOption[] }) {
  const name = getLearnerName(learnerId, learners);
  if (name) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">
        <User className="h-2.5 w-2.5" /> {name}
      </span>
    );
  }
  return null;
}

// ─── Shared: Unpaired entry alert ────────────────────────

function UnpairedAlert({ entryId, learners, onLink }: {
  entryId: string;
  learners: LearnerOption[];
  onLink: (entryId: string, learnerId: string) => void;
}) {
  const [linking, setLinking] = useState(false);
  const [selected, setSelected] = useState('');

  if (!linking) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5 rounded-lg bg-warning/10 border border-warning/20 px-2.5 py-1.5">
        <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
        <span className="text-[10px] text-foreground flex-1">Not linked to a learner</span>
        {learners.length > 0 && (
          <button
            onClick={() => setLinking(true)}
            className="text-[10px] font-semibold text-primary flex items-center gap-0.5 hover:underline"
          >
            <Link2 className="h-3 w-3" /> Link
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 mt-1.5 animate-fade-in">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="h-7 text-[10px] flex-1">
          <SelectValue placeholder="Select learner" />
        </SelectTrigger>
        <SelectContent>
          {learners.map(l => (
            <SelectItem key={l.id} value={l.id} className="text-xs">
              {l.name}{l.type === 'local' ? ' (Local)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        className="h-7 text-[10px] px-2"
        disabled={!selected}
        onClick={() => { onLink(entryId, selected); setLinking(false); }}
      >
        Save
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-[10px] px-2"
        onClick={() => setLinking(false)}
      >
        ✕
      </Button>
    </div>
  );
}

// ─── Shared: Bulk Link All ───────────────────────────────

function BulkLinkAll({ learners, onLinkAll }: {
  learners: LearnerOption[];
  onLinkAll: (learnerId: string) => void;
}) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState('');

  if (!selecting) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-[10px] px-2 gap-1 ml-auto"
        onClick={() => setSelecting(true)}
      >
        <Link2 className="h-3 w-3" /> Link All
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 animate-fade-in">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="h-7 text-[10px] flex-1">
          <SelectValue placeholder="Assign all to…" />
        </SelectTrigger>
        <SelectContent>
          {learners.map(l => (
            <SelectItem key={l.id} value={l.id} className="text-xs">
              {l.name}{l.type === 'local' ? ' (Local)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        className="h-7 text-[10px] px-2"
        disabled={!selected}
        onClick={() => { onLinkAll(selected); setSelecting(false); }}
      >
        Apply
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-[10px] px-2"
        onClick={() => setSelecting(false)}
      >
        ✕
      </Button>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────

export default function BehaviorLogPage() {
  const [tab, setTab] = useState<LogTab>('abc');
  const [userId, setUserId] = useState('');
  const [learners, setLearners] = useState<LearnerOption[]>([]);
  const [selectedLearner, setSelectedLearner] = useState('');

  const { data: accessData } = useUserAccess();

  useEffect(() => {
    getCurrentUser().then(u => { if (u) setUserId(u.id); });
  }, []);

  useEffect(() => {
    const linked: LearnerOption[] = (accessData?.students || []).map(c => ({
      id: c.id, name: `${c.first_name} ${c.last_name}`, type: 'linked' as const,
    }));
    const local: LearnerOption[] = getLocalLearners().map(l => ({
      id: l.id, name: `${l.firstName} ${l.lastName}`, type: 'local' as const,
    }));
    const all = [...linked, ...local];
    setLearners(all);
    if (all.length === 1) setSelectedLearner(all[0].id);
  }, [accessData]);

  const tabs: { key: LogTab; label: string; icon: React.ElementType }[] = [
    { key: 'abc', label: 'ABC', icon: PenLine },
    { key: 'frequency', label: 'Freq', icon: Hash },
    { key: 'duration', label: 'Duration', icon: Clock },
    { key: 'implementation', label: 'Impl', icon: ClipboardList },
    { key: 'timer', label: 'Timer', icon: Timer },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Learner Data Log</h2>
        <p className="mt-1 text-sm text-muted-foreground">Track behaviors and implementation for your Learner.</p>
      </div>

      {/* Learner selector */}
      {learners.length > 0 && (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={selectedLearner} onValueChange={setSelectedLearner}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a learner" />
            </SelectTrigger>
            <SelectContent>
              {learners.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}{l.type === 'local' ? ' (Local)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Sync banner — only for independent mode */}
      {accessData?.isIndependent !== false && (
        <div className="flex items-center gap-2 rounded-xl bg-warning/10 border border-warning/20 px-4 py-2.5 text-xs text-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
          <span>Saved locally. Syncs to your Weekly Snapshot.</span>
        </div>
      )}

      {tab === 'abc' && <ABCTab userId={userId} learnerId={selectedLearner} learners={learners} />}
      {tab === 'frequency' && <FrequencyTab userId={userId} learnerId={selectedLearner} learners={learners} />}
      {tab === 'duration' && <DurationTab userId={userId} learnerId={selectedLearner} learners={learners} />}
      {tab === 'implementation' && <ImplementationTab userId={userId} learnerId={selectedLearner} learners={learners} />}
      {tab === 'timer' && <SessionTimerTab />}
    </div>
  );
}

// ─── Shared tab props ────────────────────────────────────

interface TabProps { userId: string; learnerId: string; learners: LearnerOption[] }

// ─── ABC Tab ─────────────────────────────────────────────

function ABCTab({ userId, learnerId, learners }: TabProps) {
  const { data: accessData } = useUserAccess();
  const isAgency = accessData && !accessData.isIndependent && userId;
  const [entries, setEntries] = useState<ABCEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => {
    try {
      const prefill = sessionStorage.getItem('bd_prefill_abc');
      if (prefill) {
        sessionStorage.removeItem('bd_prefill_abc');
        const data = JSON.parse(prefill);
        return {
          behavior: data.behavior || '', antecedent: data.antecedent || '',
          consequence: data.consequence || '', intensity: '', setting: data.setting || '', notes: '',
        };
      }
    } catch {}
    return { behavior: '', antecedent: '', consequence: '', intensity: '', setting: '', notes: '' };
  });

  const loadEntries = useCallback(async () => {
    if (isAgency) {
      setLoading(true);
      const { data, error } = await supabase
        .from('abc_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) {
        setEntries(data.map(r => ({
          id: r.id, date: r.date, time: r.time || '',
          behavior: r.behavior, antecedent: r.antecedent || '', consequence: r.consequence || '',
          intensity: r.intensity, setting: r.setting || '', notes: r.notes || '',
          learnerId: r.learner_id || undefined,
        })));
      }
      setLoading(false);
    } else {
      setEntries(load('bd_behavior_log'));
    }
  }, [isAgency, userId]);

  useEffect(() => { loadEntries(); }, [loadEntries]);
  useEffect(() => { if (form.behavior) setShowForm(true); }, []);
  useEffect(() => { if (!isAgency) save('bd_behavior_log', entries); }, [entries, isAgency]);

  async function handleSave() {
    if (!form.behavior) return;
    const now = new Date();
    const entry: ABCEntry = {
      id: crypto.randomUUID(), date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      behavior: form.behavior, antecedent: form.antecedent, consequence: form.consequence,
      intensity: Number(form.intensity) || 3, setting: form.setting, notes: form.notes,
      learnerId: learnerId || undefined,
    };

    if (isAgency) {
      const { error } = await supabase.from('abc_logs').insert({
        id: entry.id, user_id: userId, learner_id: learnerId || null,
        date: entry.date, time: entry.time, behavior: entry.behavior,
        antecedent: entry.antecedent || null, consequence: entry.consequence || null,
        intensity: entry.intensity, setting: entry.setting || null, notes: entry.notes || null,
      });
      if (error) { console.error('[ABCLog] DB insert error:', error); return; }
    }

    setEntries(prev => [entry, ...prev]);
    if (userId) logBehaviorLogCreated(userId, entry.id);
    setForm({ behavior: '', antecedent: '', consequence: '', intensity: '', setting: '', notes: '' });
    setShowForm(false);
  }

  function linkEntry(entryId: string, newLearnerId: string) {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, learnerId: newLearnerId } : e));
    if (isAgency) {
      supabase.from('abc_logs').update({ learner_id: newLearnerId }).eq('id', entryId).then();
    }
  }

  function linkAllUnpaired(newLearnerId: string) {
    const unpairedIds = entries.filter(e => !e.learnerId).map(e => e.id);
    setEntries(prev => prev.map(e => e.learnerId ? e : { ...e, learnerId: newLearnerId }));
    if (isAgency && unpairedIds.length > 0) {
      supabase.from('abc_logs').update({ learner_id: newLearnerId }).in('id', unpairedIds).then();
    }
  }

  const filtered = learnerId
    ? entries.filter(e => e.learnerId === learnerId)
    : entries;
  const unpaired = entries.filter(e => !e.learnerId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {isAgency && <span className="text-[10px] text-success font-medium">✓ Synced to database</span>}
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1 ml-auto"><Plus className="h-4 w-4" /> New ABC</Button>
      </div>
      {showForm && (
        <div className="animate-fade-in rounded-xl border border-primary/20 bg-card p-4 shadow-soft space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Behavior</label>
              <Input placeholder="What happened?" value={form.behavior} onChange={e => setForm(f => ({ ...f, behavior: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Intensity</label>
              <Select value={form.intensity} onValueChange={v => setForm(f => ({ ...f, intensity: v }))}>
                <SelectTrigger><SelectValue placeholder="1–5" /></SelectTrigger>
                <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{intensityLabels[n].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Antecedent</label>
              <Input placeholder="Before…" value={form.antecedent} onChange={e => setForm(f => ({ ...f, antecedent: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Setting</label>
              <Input placeholder="e.g., Kitchen" value={form.setting} onChange={e => setForm(f => ({ ...f, setting: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Consequence</label>
            <Textarea placeholder="Your response…" rows={2} value={form.consequence} onChange={e => setForm(f => ({ ...f, consequence: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Notes</label>
            <Textarea placeholder="Optional" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!form.behavior}>Save</Button>
          </div>
        </div>
      )}

      {/* Unpaired entries alert */}
      {unpaired.length > 0 && (
         <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <p className="text-xs font-semibold text-foreground flex-1">{unpaired.length} unlinked {unpaired.length === 1 ? 'entry' : 'entries'}</p>
            {learners.length > 0 && <BulkLinkAll learners={learners} onLinkAll={linkAllUnpaired} />}
          </div>
          {unpaired.slice(0, 5).map(entry => (
            <div key={entry.id} className="rounded-lg border border-border bg-card p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground truncate flex-1">{entry.behavior}</span>
                <span className="text-[10px] text-muted-foreground ml-2">{entry.date}</span>
              </div>
              <UnpairedAlert entryId={entry.id} learners={learners} onLink={linkEntry} />
            </div>
          ))}
          {unpaired.length > 5 && <p className="text-[10px] text-muted-foreground text-center">+{unpaired.length - 5} more</p>}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={PenLine} message={learnerId ? "No ABC entries for this learner." : "No ABC entries yet."} />
      ) : (
        filtered.slice(0, 20).map(entry => {
          const ic = intensityLabels[entry.intensity] || intensityLabels[3];
          return (
            <div key={entry.id} className="rounded-xl border border-border bg-card p-3 shadow-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{entry.date} {entry.time}{entry.setting && <> · <MapPin className="h-3 w-3" />{entry.setting}</>}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${ic.cls}`}>{entry.intensity}/5</span>
              </div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-foreground flex-1">{entry.behavior}</p>
                <LearnerBadge learnerId={entry.learnerId} learners={learners} />
              </div>
              {(entry.antecedent || entry.consequence) && (
                <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                  {entry.antecedent && <div className="rounded bg-muted p-2"><p className="text-[10px] font-semibold text-muted-foreground uppercase">Before</p><p className="text-xs text-foreground">{entry.antecedent}</p></div>}
                  {entry.consequence && <div className="rounded bg-muted p-2"><p className="text-[10px] font-semibold text-muted-foreground uppercase">Response</p><p className="text-xs text-foreground">{entry.consequence}</p></div>}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Frequency Tab ───────────────────────────────────────

function FrequencyTab({ userId, learnerId, learners }: TabProps) {
  const { data: accessData } = useUserAccess();
  const isAgency = accessData && !accessData.isIndependent && userId;
  const [entries, setEntries] = useState<FrequencyEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ behavior: '', count: '', period: '', setting: '', notes: '' });
  const [loading, setLoading] = useState(false);

  // Load entries: DB for agency users, localStorage for independent
  const loadEntries = useCallback(async () => {
    if (isAgency) {
      setLoading(true);
      const { data, error } = await supabase
        .from('frequency_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) {
        setEntries(data.map(r => ({
          id: r.id, date: r.date, behavior: r.behavior, count: r.count,
          period: r.period || '1 hour', setting: r.setting || '', notes: r.notes || '',
          learnerId: r.learner_id || undefined,
        })));
      }
      setLoading(false);
    } else {
      setEntries(load('bd_frequency_log'));
    }
  }, [isAgency, userId]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Keep localStorage in sync for independent users
  useEffect(() => { if (!isAgency) save('bd_frequency_log', entries); }, [entries, isAgency]);

  async function handleSave() {
    if (!form.behavior || !form.count) return;
    const now = new Date();
    const entry: FrequencyEntry = {
      id: crypto.randomUUID(), date: now.toISOString().split('T')[0],
      behavior: form.behavior, count: Number(form.count), period: form.period || '1 hour',
      setting: form.setting, notes: form.notes, learnerId: learnerId || undefined,
    };

    if (isAgency) {
      const { error } = await supabase.from('frequency_logs').insert({
        id: entry.id, user_id: userId, learner_id: learnerId || null,
        date: entry.date, behavior: entry.behavior, count: entry.count,
        period: entry.period, setting: entry.setting || null, notes: entry.notes || null,
      });
      if (error) { console.error('[FreqLog] DB insert error:', error); return; }
    }

    setEntries(prev => [entry, ...prev]);
    if (userId) logBehaviorLogCreated(userId, entry.id);
    setForm({ behavior: '', count: '', period: '', setting: '', notes: '' });
    setShowForm(false);
  }

  function linkEntry(entryId: string, newLearnerId: string) {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, learnerId: newLearnerId } : e));
    if (isAgency) {
      supabase.from('frequency_logs').update({ learner_id: newLearnerId }).eq('id', entryId).then();
    }
  }

  function linkAllUnpaired(newLearnerId: string) {
    const unpairedIds = entries.filter(e => !e.learnerId).map(e => e.id);
    setEntries(prev => prev.map(e => e.learnerId ? e : { ...e, learnerId: newLearnerId }));
    if (isAgency && unpairedIds.length > 0) {
      supabase.from('frequency_logs').update({ learner_id: newLearnerId }).in('id', unpairedIds).then();
    }
  }

  const filtered = learnerId ? entries.filter(e => e.learnerId === learnerId) : entries;
  const unpaired = entries.filter(e => !e.learnerId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {isAgency && <span className="text-[10px] text-success font-medium">✓ Synced to database</span>}
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1 ml-auto"><Plus className="h-4 w-4" /> New Frequency</Button>
      </div>
      {showForm && (
        <div className="animate-fade-in rounded-xl border border-primary/20 bg-card p-4 shadow-soft space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Behavior</label>
              <Input placeholder="What behavior?" value={form.behavior} onChange={e => setForm(f => ({ ...f, behavior: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Count</label>
              <Input type="number" placeholder="# of times" value={form.count} onChange={e => setForm(f => ({ ...f, count: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Time Period</label>
              <Input placeholder="e.g., 1 hour, morning" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Setting</label>
              <Input placeholder="e.g., Home" value={form.setting} onChange={e => setForm(f => ({ ...f, setting: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!form.behavior || !form.count}>Save</Button>
          </div>
        </div>
      )}

      {unpaired.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <p className="text-xs font-semibold text-foreground flex-1">{unpaired.length} unlinked {unpaired.length === 1 ? 'entry' : 'entries'}</p>
            {learners.length > 0 && <BulkLinkAll learners={learners} onLinkAll={linkAllUnpaired} />}
          </div>
          {unpaired.slice(0, 3).map(e => (
            <div key={e.id} className="rounded-lg border border-border bg-card p-2.5">
              <span className="text-xs font-semibold text-foreground">{e.behavior} ({e.count}×)</span>
              <UnpairedAlert entryId={e.id} learners={learners} onLink={linkEntry} />
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Hash} message={learnerId ? "No frequency entries for this learner." : "No frequency entries yet."} />
      ) : (
        filtered.slice(0, 20).map(e => (
          <div key={e.id} className="rounded-xl border border-border bg-card p-3 shadow-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">{e.date}{e.setting && ` · ${e.setting}`}</span>
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">{e.count}×</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground flex-1">{e.behavior}</p>
              <LearnerBadge learnerId={e.learnerId} learners={learners} />
            </div>
            <p className="text-xs text-muted-foreground">per {e.period}</p>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Duration Tab ────────────────────────────────────────

function DurationTab({ userId, learnerId, learners }: TabProps) {
  const { data: accessData } = useUserAccess();
  const isAgency = accessData && !accessData.isIndependent && userId;
  const [entries, setEntries] = useState<DurationEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ behavior: '', durationMin: '', setting: '', notes: '' });
  const [loading, setLoading] = useState(false);

  const loadEntries = useCallback(async () => {
    if (isAgency) {
      setLoading(true);
      const { data, error } = await supabase
        .from('duration_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) {
        setEntries(data.map(r => ({
          id: r.id, date: r.date, behavior: r.behavior, durationMin: Number(r.duration_min),
          setting: r.setting || '', notes: r.notes || '', learnerId: r.learner_id || undefined,
        })));
      }
      setLoading(false);
    } else {
      setEntries(load('bd_duration_log'));
    }
  }, [isAgency, userId]);

  useEffect(() => { loadEntries(); }, [loadEntries]);
  useEffect(() => { if (!isAgency) save('bd_duration_log', entries); }, [entries, isAgency]);

  async function handleSave() {
    if (!form.behavior || !form.durationMin) return;
    const entry: DurationEntry = {
      id: crypto.randomUUID(), date: new Date().toISOString().split('T')[0],
      behavior: form.behavior, durationMin: Number(form.durationMin), setting: form.setting, notes: form.notes, learnerId: learnerId || undefined,
    };

    if (isAgency) {
      const { error } = await supabase.from('duration_logs').insert({
        id: entry.id, user_id: userId, learner_id: learnerId || null,
        date: entry.date, behavior: entry.behavior, duration_min: entry.durationMin,
        setting: entry.setting || null, notes: entry.notes || null,
      });
      if (error) { console.error('[DurLog] DB insert error:', error); return; }
    }

    setEntries(prev => [entry, ...prev]);
    if (userId) logBehaviorLogCreated(userId, entry.id);
    setForm({ behavior: '', durationMin: '', setting: '', notes: '' });
    setShowForm(false);
  }

  function linkEntry(entryId: string, newLearnerId: string) {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, learnerId: newLearnerId } : e));
    if (isAgency) {
      supabase.from('duration_logs').update({ learner_id: newLearnerId }).eq('id', entryId).then();
    }
  }

  function linkAllUnpaired(newLearnerId: string) {
    const unpairedIds = entries.filter(e => !e.learnerId).map(e => e.id);
    setEntries(prev => prev.map(e => e.learnerId ? e : { ...e, learnerId: newLearnerId }));
    if (isAgency && unpairedIds.length > 0) {
      supabase.from('duration_logs').update({ learner_id: newLearnerId }).in('id', unpairedIds).then();
    }
  }

  const filtered = learnerId ? entries.filter(e => e.learnerId === learnerId) : entries;
  const unpaired = entries.filter(e => !e.learnerId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {isAgency && <span className="text-[10px] text-success font-medium">✓ Synced to database</span>}
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1 ml-auto"><Plus className="h-4 w-4" /> New Duration</Button>
      </div>
      {showForm && (
        <div className="animate-fade-in rounded-xl border border-primary/20 bg-card p-4 shadow-soft space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Behavior</label>
              <Input placeholder="What behavior?" value={form.behavior} onChange={e => setForm(f => ({ ...f, behavior: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Duration (min)</label>
              <Input type="number" placeholder="Minutes" value={form.durationMin} onChange={e => setForm(f => ({ ...f, durationMin: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Setting</label>
              <Input placeholder="e.g., Classroom" value={form.setting} onChange={e => setForm(f => ({ ...f, setting: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!form.behavior || !form.durationMin}>Save</Button>
          </div>
        </div>
      )}

      {unpaired.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <p className="text-xs font-semibold text-foreground flex-1">{unpaired.length} unlinked {unpaired.length === 1 ? 'entry' : 'entries'}</p>
            {learners.length > 0 && <BulkLinkAll learners={learners} onLinkAll={linkAllUnpaired} />}
          </div>
          {unpaired.slice(0, 3).map(e => (
            <div key={e.id} className="rounded-lg border border-border bg-card p-2.5">
              <span className="text-xs font-semibold text-foreground">{e.behavior} ({e.durationMin}m)</span>
              <UnpairedAlert entryId={e.id} learners={learners} onLink={linkEntry} />
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Clock} message={learnerId ? "No duration entries for this learner." : "No duration entries yet."} />
      ) : (
        filtered.slice(0, 20).map(e => (
          <div key={e.id} className="rounded-xl border border-border bg-card p-3 shadow-card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">{e.date}{e.setting && ` · ${e.setting}`}</span>
              <span className="rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[10px] font-bold">{e.durationMin}m</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground flex-1">{e.behavior}</p>
              <LearnerBadge learnerId={e.learnerId} learners={learners} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Implementation Tab ──────────────────────────────────

function ImplementationTab({ userId, learnerId, learners }: TabProps) {
  const { data: accessData } = useUserAccess();
  const isAgency = accessData && !accessData.isIndependent && userId;
  const [entries, setEntries] = useState<ImplEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ strategy: '', context: '', outcome: '', notes: '' });
  const [loading, setLoading] = useState(false);

  const loadEntries = useCallback(async () => {
    if (isAgency) {
      setLoading(true);
      const { data, error } = await supabase
        .from('implementation_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) {
        setEntries(data.map(r => ({
          id: r.id, date: r.date, strategy: r.strategy,
          context: r.context || '', outcome: r.outcome || '', notes: r.notes || '',
          learnerId: r.learner_id || undefined,
        })));
      }
      setLoading(false);
    } else {
      setEntries(load('bd_implementation_log'));
    }
  }, [isAgency, userId]);

  useEffect(() => { loadEntries(); }, [loadEntries]);
  useEffect(() => { if (!isAgency) save('bd_implementation_log', entries); }, [entries, isAgency]);

  async function handleSave() {
    if (!form.strategy) return;
    const entry: ImplEntry = {
      id: crypto.randomUUID(), date: new Date().toISOString().split('T')[0],
      strategy: form.strategy, context: form.context, outcome: form.outcome, notes: form.notes, learnerId: learnerId || undefined,
    };

    if (isAgency) {
      const { error } = await supabase.from('implementation_logs').insert({
        id: entry.id, user_id: userId, learner_id: learnerId || null,
        date: entry.date, strategy: entry.strategy,
        context: entry.context || null, outcome: entry.outcome || null, notes: entry.notes || null,
      });
      if (error) { console.error('[ImplLog] DB insert error:', error); return; }
    }

    setEntries(prev => [entry, ...prev]);
    if (userId) logImplementationLogCreated(userId, entry.id);
    setForm({ strategy: '', context: '', outcome: '', notes: '' });
    setShowForm(false);
  }

  function linkEntry(entryId: string, newLearnerId: string) {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, learnerId: newLearnerId } : e));
    if (isAgency) {
      supabase.from('implementation_logs').update({ learner_id: newLearnerId }).eq('id', entryId).then();
    }
  }

  function linkAllUnpaired(newLearnerId: string) {
    const unpairedIds = entries.filter(e => !e.learnerId).map(e => e.id);
    setEntries(prev => prev.map(e => e.learnerId ? e : { ...e, learnerId: newLearnerId }));
    if (isAgency && unpairedIds.length > 0) {
      supabase.from('implementation_logs').update({ learner_id: newLearnerId }).in('id', unpairedIds).then();
    }
  }

  const filtered = learnerId ? entries.filter(e => e.learnerId === learnerId) : entries;
  const unpaired = entries.filter(e => !e.learnerId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {isAgency && <span className="text-[10px] text-success font-medium">✓ Synced to database</span>}
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1 ml-auto"><Plus className="h-4 w-4" /> New Entry</Button>
      </div>
      {showForm && (
        <div className="animate-fade-in rounded-xl border border-primary/20 bg-card p-4 shadow-soft space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Strategy Used</label>
            <Input placeholder="Which strategy did you try?" value={form.strategy} onChange={e => setForm(f => ({ ...f, strategy: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Context</label>
            <Textarea placeholder="What was happening when you used it?" rows={2} value={form.context} onChange={e => setForm(f => ({ ...f, context: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Outcome</label>
            <Textarea placeholder="How did it go?" rows={2} value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!form.strategy}>Save</Button>
          </div>
        </div>
      )}

      {unpaired.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <p className="text-xs font-semibold text-foreground flex-1">{unpaired.length} unlinked {unpaired.length === 1 ? 'entry' : 'entries'}</p>
            {learners.length > 0 && <BulkLinkAll learners={learners} onLinkAll={linkAllUnpaired} />}
          </div>
          {unpaired.slice(0, 3).map(e => (
            <div key={e.id} className="rounded-lg border border-border bg-card p-2.5">
              <span className="text-xs font-semibold text-foreground">{e.strategy}</span>
              <UnpairedAlert entryId={e.id} learners={learners} onLink={linkEntry} />
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} message={learnerId ? "No implementation logs for this learner." : "No implementation logs yet. Try a strategy and log it!"} />
      ) : (
        filtered.slice(0, 20).map(e => (
          <div key={e.id} className="rounded-xl border border-border bg-card p-3 shadow-card">
            <span className="text-[10px] text-muted-foreground">{e.date}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm font-semibold text-foreground flex-1">{e.strategy}</p>
              <LearnerBadge learnerId={e.learnerId} learners={learners} />
            </div>
            {e.outcome && <p className="text-xs text-muted-foreground mt-1">{e.outcome}</p>}
          </div>
        ))
      )}
    </div>
  );
}

// ─── Session Timer Tab ───────────────────────────────────

function SessionTimerTab() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessions, setSessions] = useState<{ id: string; date: string; durationSec: number }[]>(() => load('bd_session_timer'));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { save('bd_session_timer', sessions); }, [sessions]);

  function start() {
    setRunning(true);
    setElapsed(0);
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  }

  function pause() {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function stop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (elapsed > 0) {
      setSessions(s => [{ id: crypto.randomUUID(), date: new Date().toISOString(), durationSec: elapsed }, ...s]);
    }
    setRunning(false);
    setElapsed(0);
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6 shadow-card text-center space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Coach Session Timer</p>
        <p className="font-display text-5xl font-bold text-foreground tabular-nums">{mm}:{ss}</p>
        <div className="flex justify-center gap-3">
          {!running ? (
            <Button size="sm" onClick={start} className="gap-1"><Play className="h-4 w-4" /> {elapsed > 0 ? 'Resume' : 'Start'}</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={pause} className="gap-1"><Pause className="h-4 w-4" /> Pause</Button>
          )}
          {(running || elapsed > 0) && (
            <Button size="sm" variant="destructive" onClick={stop} className="gap-1"><Square className="h-4 w-4" /> Stop & Save</Button>
          )}
        </div>
      </div>
      {sessions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Sessions</h4>
          {sessions.slice(0, 10).map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
              <span className="text-muted-foreground">{new Date(s.date).toLocaleDateString()}</span>
              <span className="font-semibold text-foreground">{Math.floor(s.durationSec / 60)}m {s.durationSec % 60}s</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared ──────────────────────────────────────────────

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="text-center py-10 text-muted-foreground">
      <Icon className="h-8 w-8 mx-auto mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
