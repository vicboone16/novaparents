/**
 * Reflect With Me™
 * ────────────────
 * Post-session guided reflection. Saves to Weekly Snapshot.
 */

import { useState, useEffect } from 'react';
import { BookOpen, Save, CheckCircle2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getCurrentUser } from '@/lib/dal';
import { logEvent } from '@/lib/engagement';

export function ReflectWithMeTool() {
  const [userId, setUserId] = useState('');
  const [whatWorked, setWhatWorked] = useState('');
  const [whatWasHard, setWhatWasHard] = useState('');
  const [whatToTry, setWhatToTry] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getCurrentUser().then(u => { if (u) setUserId(u.id); });
  }, []);

  const canSave = whatWorked.trim() || whatWasHard.trim() || whatToTry.trim();

  function handleSave() {
    const reflection = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      whatWorked,
      whatWasHard,
      whatToTry,
    };

    // Save to local storage
    const history = loadLocal('bd_reflections');
    history.unshift(reflection);
    saveLocal('bd_reflections', history.slice(0, 100));

    // Log to engagement for Weekly Snapshot
    if (userId) {
      logEvent(userId, 'reflection_submitted', {
        reflectionId: reflection.id,
      });
    }

    setSaved(true);
    setTimeout(() => {
      setWhatWorked('');
      setWhatWasHard('');
      setWhatToTry('');
      setSaved(false);
    }, 3000);
  }

  const recentReflections = loadLocal('bd_reflections').slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-secondary/5 border border-secondary/20 p-3">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="h-4 w-4 text-secondary" />
          <h4 className="font-display font-bold text-foreground text-sm">Reflect With Me™</h4>
        </div>
        <p className="text-[10px] text-muted-foreground">Take a moment to reflect. Your insights are saved to your Weekly Snapshot.</p>
      </div>

      {saved ? (
        <div className="rounded-xl border border-success/20 bg-success/5 p-6 text-center space-y-2 animate-fade-in">
          <CheckCircle2 className="h-8 w-8 text-success mx-auto" />
          <h4 className="font-display font-bold text-foreground">Reflection Saved!</h4>
          <p className="text-sm text-muted-foreground">Great job taking time to reflect. Every insight helps. 💛</p>
        </div>
      ) : (
        <div className="space-y-3">
          <ReflectionPrompt
            emoji="✨"
            prompt="What worked well today?"
            placeholder="Even small wins count — a calm moment, a new strategy, a connection…"
            value={whatWorked}
            onChange={setWhatWorked}
          />
          <ReflectionPrompt
            emoji="💪"
            prompt="What felt hard?"
            placeholder="No judgment here. Hard moments are part of the journey…"
            value={whatWasHard}
            onChange={setWhatWasHard}
          />
          <ReflectionPrompt
            emoji="🎯"
            prompt="What will you try tomorrow?"
            placeholder="One small thing you'd like to try differently…"
            value={whatToTry}
            onChange={setWhatToTry}
          />

          <Button onClick={handleSave} disabled={!canSave} className="w-full gap-1.5">
            <Save className="h-4 w-4" /> Save Reflection
          </Button>
        </div>
      )}

      {/* Recent reflections */}
      {recentReflections.length > 0 && !saved && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Heart className="h-3 w-3" /> Recent Reflections
          </h4>
          {recentReflections.map((r: any) => (
            <div key={r.id} className="rounded-lg bg-muted/30 p-3 space-y-1">
              <span className="text-[10px] text-muted-foreground">{new Date(r.date).toLocaleDateString()}</span>
              {r.whatWorked && <p className="text-xs text-foreground">✨ {r.whatWorked}</p>}
              {r.whatToTry && <p className="text-xs text-muted-foreground">🎯 {r.whatToTry}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReflectionPrompt({ emoji, prompt, placeholder, value, onChange }: {
  emoji: string; prompt: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-2">
      <label className="text-sm font-semibold text-foreground">{emoji} {prompt}</label>
      <Textarea
        placeholder={placeholder}
        rows={2}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function loadLocal(key: string): any[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function saveLocal(key: string, data: any[]) {
  localStorage.setItem(key, JSON.stringify(data));
}
