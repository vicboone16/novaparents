import { useState } from 'react';
import { PenLine, Plus, Clock, MapPin } from 'lucide-react';
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
  intensity: string;
  location: string;
}

const mockEntries: LogEntry[] = [
  {
    id: '1',
    date: '2026-02-28',
    time: '3:30 PM',
    behavior: 'Threw toy across room',
    antecedent: 'Asked to transition from play to dinner',
    consequence: 'Redirected calmly, offered choice',
    intensity: 'moderate',
    location: 'Living Room',
  },
  {
    id: '2',
    date: '2026-02-27',
    time: '8:15 AM',
    behavior: 'Refused to get dressed',
    antecedent: 'Morning routine, woke up tired',
    consequence: 'Used visual schedule, completed with delay',
    intensity: 'mild',
    location: 'Bedroom',
  },
];

const intensityColors: Record<string, string> = {
  mild: 'bg-success/10 text-success',
  moderate: 'bg-warning/10 text-warning',
  severe: 'bg-destructive/10 text-destructive',
};

export default function BehaviorLogPage() {
  const [showForm, setShowForm] = useState(false);
  const [entries] = useState<LogEntry[]>(mockEntries);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Behavior Log
          </h2>
          <p className="mt-1 text-muted-foreground">
            Track behaviors at home to share with your agency team.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Entry</span>
        </Button>
      </div>

      {/* New Entry Form */}
      {showForm && (
        <div className="animate-fade-in rounded-xl border border-primary/20 bg-card p-6 shadow-soft space-y-4">
          <h3 className="font-display font-bold text-foreground">New Behavior Log Entry</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Behavior Observed</label>
              <Input placeholder="What happened?" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Intensity</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">What happened before?</label>
              <Input placeholder="Antecedent / trigger" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Location</label>
              <Input placeholder="e.g., Kitchen, School" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">What did you do?</label>
            <Textarea placeholder="How did you respond?" rows={2} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button>Save Entry</Button>
          </div>
        </div>
      )}

      {/* Entry List */}
      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {entry.date} at {entry.time}
                <span className="mx-1">·</span>
                <MapPin className="h-3.5 w-3.5" />
                {entry.location}
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${intensityColors[entry.intensity]}`}>
                {entry.intensity}
              </span>
            </div>
            <h4 className="font-display font-bold text-foreground">{entry.behavior}</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Before</p>
                <p className="text-sm text-foreground">{entry.antecedent}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Response</p>
                <p className="text-sm text-foreground">{entry.consequence}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
