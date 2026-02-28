/**
 * Real-Time Rescue™
 * ─────────────────
 * Escalation support: calm scripts, de-escalation, boundaries.
 */

import { useState } from 'react';
import { Shield, AlertTriangle, Heart, Hand, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BehaviorFunction } from '@/lib/analysis';

type Intensity = 'low' | 'moderate' | 'high' | 'crisis';

const scripts: Record<Intensity, { calm: string[]; deescalation: string[]; disengage: string; reinforce: string }> = {
  low: {
    calm: ['"I see you\'re having a hard time. I\'m here."', '"Let\'s take a breath together."'],
    deescalation: ['Lower your voice and body', 'Offer a choice: "Do you want X or Y?"', 'Wait 5 seconds before responding again'],
    disengage: 'If the behavior continues, calmly say "I\'ll be right here when you\'re ready" and step back.',
    reinforce: 'When calm returns: "You calmed yourself down. That was really hard and you did it."',
  },
  moderate: {
    calm: ['"I know this is hard. You\'re safe."', '"I\'m going to stay calm so we can figure this out."'],
    deescalation: ['Remove audience (other kids, siblings)', 'Reduce demands temporarily', 'Offer sensory tool or break space', 'Use a calm, slow voice'],
    disengage: 'If escalating: stop talking. Your silence is a strategy. Wait.',
    reinforce: 'After calm: "You worked through that. I\'m proud of you. Let\'s talk about what happened."',
  },
  high: {
    calm: ['"You are safe. I am not going to yell."', '"I\'m going to wait right here until you\'re ready."'],
    deescalation: ['Clear the space of anything dangerous', 'Do NOT reason or lecture right now', 'Stay visible but give physical space', 'Breathe slowly — they mirror you'],
    disengage: 'Do not physically intervene unless safety is at risk. Say: "I\'m stepping back but I\'m not leaving."',
    reinforce: 'After the storm passes: "That was a really big feeling. You got through it. I\'m here."',
  },
  crisis: {
    calm: ['"I am here. You are safe. I will not hurt you."', 'Say nothing else. Just be present.'],
    deescalation: ['Ensure physical safety of all people', 'Remove dangerous objects', 'Do NOT touch unless trained and necessary', 'Call support if needed (co-parent, crisis line)'],
    disengage: 'If you feel unsafe, move yourself and other children to safety. Call 988 or emergency services if needed.',
    reinforce: 'Hours later, when fully calm: "I stayed because I care about you. We\'ll figure this out together."',
  },
};

export function RealTimeRescueTool() {
  const [intensity, setIntensity] = useState<Intensity | ''>('');

  const data = intensity ? scripts[intensity] : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-destructive" />
          <h4 className="font-display font-bold text-foreground text-sm">Real-Time Rescue™</h4>
        </div>
        <p className="text-[10px] text-muted-foreground">In the moment support. Pick the intensity level and get a script.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
        <label className="text-sm font-semibold text-foreground">How intense is it right now?</label>
        <Select value={intensity} onValueChange={v => setIntensity(v as Intensity)}>
          <SelectTrigger><SelectValue placeholder="Select intensity level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">🟢 Low — Whining, mild frustration</SelectItem>
            <SelectItem value="moderate">🟡 Moderate — Yelling, crying, refusing</SelectItem>
            <SelectItem value="high">🟠 High — Throwing, hitting, screaming</SelectItem>
            <SelectItem value="crisis">🔴 Crisis — Safety concern</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data && (
        <div className="space-y-3 animate-fade-in">
          {/* Calm Script */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-primary" /> 🧠 Say This
            </h4>
            {data.calm.map((line, i) => (
              <p key={i} className="text-sm text-foreground italic">{line}</p>
            ))}
          </div>

          {/* De-escalation */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Hand className="h-3.5 w-3.5 text-secondary" /> 📝 Do This
            </h4>
            <ul className="space-y-1.5">
              {data.deescalation.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary text-[10px] font-bold mt-0.5">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          {/* When to disengage */}
          <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 space-y-1">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" /> When to Step Back
            </h4>
            <p className="text-sm text-foreground">{data.disengage}</p>
          </div>

          {/* What to reinforce */}
          <div className="rounded-xl border border-success/20 bg-success/5 p-4 space-y-1">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5 text-success" /> 🎯 After the Storm
            </h4>
            <p className="text-sm text-foreground italic">{data.reinforce}</p>
          </div>
        </div>
      )}
    </div>
  );
}
