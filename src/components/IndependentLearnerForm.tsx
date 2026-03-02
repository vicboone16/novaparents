import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Plus, Trash2, UserPlus } from 'lucide-react';

const STORAGE_KEY = 'bd_independent_learners';

export interface LocalLearner {
  id: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export function getLocalLearners(): LocalLearner[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLearners(learners: LocalLearner[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(learners));
}

export function IndependentLearnerForm({ onUpdate }: { onUpdate?: () => void }) {
  const [learners, setLearners] = useState<LocalLearner[]>([]);
  const [adding, setAdding] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    setLearners(getLocalLearners());
  }, []);

  function handleAdd() {
    if (!firstName.trim()) return;
    const newLearner: LocalLearner = {
      id: crypto.randomUUID(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...learners, newLearner];
    saveLearners(updated);
    setLearners(updated);
    setFirstName('');
    setLastName('');
    setAdding(false);
    onUpdate?.();
  }

  function handleRemove(id: string) {
    const updated = learners.filter(l => l.id !== id);
    saveLearners(updated);
    setLearners(updated);
    onUpdate?.();
  }

  return (
    <div className="space-y-3">
      {learners.length > 0 && (
        <ul className="space-y-2">
          {learners.map(l => (
            <li key={l.id} className="flex items-center gap-2 text-sm text-foreground">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{l.firstName} {l.lastName}</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Local</span>
              <button
                onClick={() => handleRemove(l.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Remove learner"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="space-y-2 animate-fade-in">
          <div className="flex gap-2">
            <Input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="First name"
              maxLength={50}
              className="flex-1"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <Input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Last name"
              maxLength={50}
              className="flex-1"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!firstName.trim()} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setFirstName(''); setLastName(''); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="w-full gap-1.5">
          <UserPlus className="h-3.5 w-3.5" /> Add a Learner (Independent Mode)
        </Button>
      )}

      {learners.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground">
          Not connected to an agency? Add a local learner profile to start practicing with the tools.
        </p>
      )}
    </div>
  );
}
