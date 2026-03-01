/**
 * Toolkit Page
 * ────────────
 * Combines: Nova Academy, Learn modules, Library,
 * Behavior Analysis tools, and Caregiver Data.
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Library, Users, Sparkles, HelpCircle, GraduationCap } from 'lucide-react';
import CurriculumPage from './CurriculumPage';
import LibraryPage from './LibraryPage';
import NovaAcademyPage from './NovaAcademyPage';
import { CaregiverDataView } from '@/components/CaregiverDataView';
import { BehaviorTranslator } from '@/components/BehaviorTranslator';
import { ReinforcementChecker } from '@/components/ReinforcementChecker';

type Tab = 'academy' | 'learn' | 'library' | 'translator' | 'reinforcing' | 'caregiver';

export default function ToolkitPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && ['academy','learn','library','translator','reinforcing','caregiver'].includes(urlTab)) {
      return urlTab as Tab;
    }
    return 'academy';
  });

  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && ['academy','learn','library','translator','reinforcing','caregiver'].includes(urlTab)) {
      setTab(urlTab as Tab);
    }
  }, [searchParams]);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'academy', label: 'Academy', icon: GraduationCap },
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
        {tab === 'academy' && <NovaAcademyPage />}
        {tab === 'learn' && <CurriculumPage />}
        {tab === 'library' && <LibraryPage />}
        {tab === 'translator' && <BehaviorTranslator />}
        {tab === 'reinforcing' && <ReinforcementChecker />}
        {tab === 'caregiver' && <CaregiverDataView />}
      </div>
    </div>
  );
}
