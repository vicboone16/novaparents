/**
 * Admin Parent Preview — renders the parent interface inside a phone frame
 * without requiring an account switch. Includes a seed button for demo data
 * and a student selector to preview different learners.
 */

import { useState, useEffect } from 'react';
import ParentHomePage from '@/pages/ParentHomePage';
import ParentProgressPage from '@/pages/ParentProgressPage';
import ParentRewardsPage from '@/pages/ParentRewardsPage';
import ParentMessagesPage from '@/pages/ParentMessagesPage';
import { seedDemoParentInsights } from '@/lib/parent-insights-dal';
import { StudentOverrideProvider } from '@/contexts/StudentOverrideContext';
import { useUserAccess } from '@/contexts/UserAccessContext';
import { ArrowLeft, Eye, Database, Loader2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'home', label: 'Home' },
  { key: 'progress', label: 'Progress' },
  { key: 'rewards', label: 'Rewards' },
  { key: 'messages', label: 'Messages' },
] as const;

type TabKey = typeof TABS[number]['key'];

// Hardcoded demo student for seed fallback
const DEMO_STUDENT = { id: '00000000-0000-0000-0000-000000000001', name: 'Demo Student' };

export default function ParentPreviewPage() {
  const [tab, setTab] = useState<TabKey>('home');
  const [seeding, setSeeding] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(DEMO_STUDENT.id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: access } = useUserAccess();

  // Build student list from access context + demo fallback
  const students = (() => {
    const list: { id: string; name: string }[] = [];
    if (access?.students?.length) {
      access.students.forEach((s) => {
        list.push({ id: s.id, name: `${s.first_name} ${s.last_name}`.trim() });
      });
    }
    // Always include the demo student
    if (!list.some((s) => s.id === DEMO_STUDENT.id)) {
      list.push(DEMO_STUDENT);
    }
    return list;
  })();

  // Default to first real student if available
  useEffect(() => {
    if (access?.students?.length && selectedStudentId === DEMO_STUDENT.id) {
      setSelectedStudentId(access.students[0].id);
    }
  }, [access?.students]);

  const selectedName = students.find((s) => s.id === selectedStudentId)?.name || 'Student';

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

      {/* Student selector */}
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Previewing as parent of:</span>
        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
          <SelectTrigger className="w-[200px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          📱 Parent View — {selectedName}
        </div>
        <div className="max-h-[600px] overflow-y-auto p-4">
          <StudentOverrideProvider studentId={selectedStudentId} studentName={selectedName}>
            {tab === 'home' && <ParentHomePage />}
            {tab === 'progress' && <ParentProgressPage />}
            {tab === 'rewards' && <ParentRewardsPage />}
            {tab === 'messages' && <ParentMessagesPage />}
          </StudentOverrideProvider>
        </div>
      </div>
    </div>
  );
}
