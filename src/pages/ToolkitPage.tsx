/**
 * Toolkit Page
 * ────────────
 * Combines: Learn modules, "What do I do when…" library,
 * and parent-safe Replacement Behaviors.
 */

import { useState } from 'react';
import { BookOpen, Library, Users, Sparkles, HelpCircle } from 'lucide-react';
import CurriculumPage from './CurriculumPage';
import LibraryPage from './LibraryPage';
import { CaregiverDataView } from '@/components/CaregiverDataView';
import { BehaviorTranslator } from '@/components/BehaviorTranslator';
import { ReinforcementChecker } from '@/components/ReinforcementChecker';

type Tab = 'learn' | 'library' | 'translator' | 'reinforcing' | 'caregiver';

export default function ToolkitPage() {
  const [tab, setTab] = useState<Tab>('learn');

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'learn', label: 'Learn', icon: BookOpen },
    { key: 'library', label: 'What Do I Do…', icon: Library },
    { key: 'translator', label: 'Translator', icon: Sparkles },
    { key: 'reinforcing', label: 'Reinforcing?', icon: HelpCircle },
    { key: 'caregiver', label: 'Caregiver Data', icon: Users },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Coach Toolkit</h2>
        <p className="mt-1 text-sm text-muted-foreground">Learn strategies, analyze behaviors, and view caregiver data.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              tab === t.key
                ? 'bg-primary text-primary-foreground shadow-soft'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {tab === 'learn' && <CurriculumPage />}
        {tab === 'library' && <LibraryPage />}
        {tab === 'translator' && <BehaviorTranslator />}
        {tab === 'reinforcing' && <ReinforcementChecker />}
        {tab === 'caregiver' && <CaregiverDataView />}
      </div>
    </div>
  );
}
