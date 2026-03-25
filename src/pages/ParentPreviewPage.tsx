/**
 * Admin Parent Preview — renders the parent interface inside a phone frame
 * without requiring an account switch. Includes a seed button for demo data.
 */

import { useState } from 'react';
import ParentHomePage from '@/pages/ParentHomePage';
import ParentProgressPage from '@/pages/ParentProgressPage';
import ParentRewardsPage from '@/pages/ParentRewardsPage';
import ParentMessagesPage from '@/pages/ParentMessagesPage';
import { seedDemoParentInsights } from '@/lib/parent-insights-dal';
import { ArrowLeft, Eye, Database, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
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
  const [seeding, setSeeding] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  async function handleSeed() {
    setSeeding(true);
    const result = await seedDemoParentInsights();
    if (result.error) {
      toast({ title: 'Seed failed', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Demo data seeded', description: `${result.inserted} days of parent insights created.` });
    }
    setSeeding(false);
  }

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
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Parent View Preview
          </h1>
          <p className="text-sm text-muted-foreground">See what parents experience — no account switch needed</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding} className="gap-1.5">
          {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
          Seed Demo Data
        </Button>
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