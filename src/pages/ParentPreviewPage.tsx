/**
 * Admin Parent Preview — renders the parent interface inside ParentLayout
 * without requiring an account switch. Uses a mock child for demo purposes.
 */

import { useState } from 'react';
import { ParentLayout } from '@/components/ParentLayout';
import ParentHomePage from '@/pages/ParentHomePage';
import ParentProgressPage from '@/pages/ParentProgressPage';
import ParentRewardsPage from '@/pages/ParentRewardsPage';
import ParentMessagesPage from '@/pages/ParentMessagesPage';
import { ArrowLeft, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'home', label: 'Home' },
  { key: 'progress', label: 'Progress' },
  { key: 'rewards', label: 'Rewards' },
  { key: 'messages', label: 'Messages' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function ParentPreviewPage() {
  const [tab, setTab] = useState<TabKey>('home');
  const navigate = useNavigate();

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Admin header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Parent View Preview
          </h1>
          <p className="text-sm text-muted-foreground">See what parents experience — no account switch needed</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1.5 rounded-xl bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 rounded-lg py-2 text-xs font-semibold transition-colors',
              tab === t.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Preview container — phone frame */}
      <div className="mx-auto w-full max-w-[400px] rounded-3xl border-2 border-border bg-background shadow-soft overflow-hidden">
        <div className="bg-muted/50 py-1.5 text-center text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
          📱 Parent View
        </div>
        <div className="max-h-[600px] overflow-y-auto p-4">
          {tab === 'home' && <ParentHomePage />}
          {tab === 'progress' && <ParentProgressPage />}
          {tab === 'rewards' && <ParentRewardsPage />}
          {tab === 'messages' && <ParentMessagesPage />}
        </div>
      </div>
    </div>
  );
}
