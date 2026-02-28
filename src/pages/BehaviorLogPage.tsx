import { useState, useEffect } from 'react';
import { PenLine, Plus, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { getCurrentUser } from '@/lib/dal';
import { logBehaviorLogCreated } from '@/lib/engagement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LogEntry {
  id: string;
  date: string;
  time: string;
  behavior: string;
  antecedent: string;
  consequence: string;
  intensity: number;
  setting: string;
  notes: string;
}

const STORAGE_KEY = 'bd_behavior_log';

function loadEntries(): LogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveEntries(entries: LogEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

const intensityLabels: Record<number, { label: string; class: string }> = {
  1: { label: '1 – Minimal', class: 'bg-success/10 text-success' },
  2: { label: '2 – Mild', class: 'bg-success/10 text-success' },
  3: { label: '3 – Moderate', class: 'bg-warning/10 text-warning' },
  4: { label: '4 – Significant', class: 'bg-destructive/10 text-destructive' },
  5: { label: '5 – Severe', class: 'bg-destructive/10 text-destructive' },
};

export default function BehaviorLogPage() {
  const [showForm, setShowForm] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>(loadEntries);
  const [form, setForm] = useState({
    behavior: '', antecedent: '', consequence: '', intensity: '', setting: '', notes: '',
  });
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    getCurrentUser().then(u => { if (u) setUserId(u.id); });
  }, []);

  useEffect(() => { saveEntries(entries); }, [entries]);

  function handleSave() {
    if (!form.behavior) return;
    const now = new Date();
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      behavior: form.behavior,
      antecedent: form.antecedent,
      consequence: form.consequence,
      intensity: Number(form.intensity) || 3,
      setting: form.setting,
      notes: form.notes,
    };
    setEntries([entry, ...entries]);
    if (userId) logBehaviorLogCreated(userId, entry.id);
    setForm({ behavior: '', antecedent: '', consequence: '', intensity: '', setting: '', notes: '' });
    setShowForm(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Behavior Log</h2>
          <p className="mt-1 text-sm text-muted-foreground">Track behaviors at home.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Entry</span>
        </Button>
      </div>

      {/* Sync Banner */}
      <div className="flex items-center gap-2 rounded-xl bg-warning/10 border border-warning/20 px-4 py-3 text-sm text-foreground">
        <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
        <span>Entries are saved locally. <strong>Sync coming soon.</strong></span>
      </div>

      {/* New Entry Form */}
      {showForm && (
        <div className="animate-fade-in rounded-xl border border-primary/20 bg-card p-5 shadow-soft space-y-4">
          <h3 className="font-display font-bold text-foreground">New Entry</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Behavior Observed</label>
              <Input placeholder="What happened?" value={form.behavior} onChange={(e) => setForm(f => ({ ...f, behavior: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Intensity</label>
              <Select value={form.intensity} onValueChange={(v) => setForm(f => ({ ...f, intensity: v }))}>
                <SelectTrigger><SelectValue placeholder="1–5" /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map(n => (
                    <SelectItem key={n} value={String(n)}>{intensityLabels[n].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Antecedent (Before)</label>
              <Input placeholder="What happened right before?" value={form.antecedent} onChange={(e) => setForm(f => ({ ...f, antecedent: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Setting</label>
              <Input placeholder="e.g., Kitchen, Park" value={form.setting} onChange={(e) => setForm(f => ({ ...f, setting: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Consequence (Your response)</label>
            <Textarea placeholder="How did you respond?" rows={2} value={form.consequence} onChange={(e) => setForm(f => ({ ...f, consequence: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Notes (optional)</label>
            <Textarea placeholder="Anything else?" rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.behavior}>Save Entry</Button>
          </div>
        </div>
      )}

      {/* Entry List */}
      {entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <PenLine className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p>No entries yet. Tap "New Entry" to start logging.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const intConf = intensityLabels[entry.intensity] || intensityLabels[3];
            return (
              <div key={entry.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {entry.date} at {entry.time}
                    {entry.setting && (
                      <>
                        <span className="mx-1">·</span>
                        <MapPin className="h-3.5 w-3.5" />
                        {entry.setting}
                      </>
                    )}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${intConf.class}`}>
                    {entry.intensity}/5
                  </span>
                </div>
                <h4 className="font-display font-bold text-foreground text-sm">{entry.behavior}</h4>
                {(entry.antecedent || entry.consequence) && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {entry.antecedent && (
                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Before</p>
                        <p className="text-xs text-foreground">{entry.antecedent}</p>
                      </div>
                    )}
                    {entry.consequence && (
                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Response</p>
                        <p className="text-xs text-foreground">{entry.consequence}</p>
                      </div>
                    )}
                  </div>
                )}
                {entry.notes && <p className="mt-2 text-xs text-muted-foreground italic">{entry.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
