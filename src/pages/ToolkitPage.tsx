/**
 * Toolkit Page
 * ────────────
 * Combines: Learn modules, "What do I do when…" library,
 * and parent-safe Replacement Behaviors.
 */

import { useState } from 'react';
import { BookOpen, Lightbulb, Library } from 'lucide-react';
import CurriculumPage from './CurriculumPage';
import LibraryPage from './LibraryPage';

type Tab = 'learn' | 'library';

export default function ToolkitPage() {
  const [tab, setTab] = useState<Tab>('learn');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Coach Toolkit</h2>
        <p className="mt-1 text-sm text-muted-foreground">Learn strategies and find replacement behaviors.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('learn')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            tab === 'learn'
              ? 'bg-primary text-primary-foreground shadow-soft'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <BookOpen className="h-4 w-4" /> Learn
        </button>
        <button
          onClick={() => setTab('library')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            tab === 'library'
              ? 'bg-primary text-primary-foreground shadow-soft'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Library className="h-4 w-4" /> What Do I Do When…
        </button>
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {tab === 'learn' ? <CurriculumPage /> : <LibraryPage />}
      </div>
    </div>
  );
}
