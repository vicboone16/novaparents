/**
 * Demo Accounts — Admin-only page to switch into demo caregiver accounts.
 * Accessible after login for users with admin roles.
 */

import { useState } from 'react';
import { signIn } from '@/lib/dal';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Play, ArrowLeft, Loader2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const DEMO_ACCOUNTS = [
  { email: 'demo-maria@behaviordecoded.app', password: 'DemoParent1!', name: 'Maria Santos', learner: 'Ethan Santos' },
  { email: 'demo-david@behaviordecoded.app', password: 'DemoParent2!', name: 'David Chen', learner: 'Lily Chen' },
  { email: 'demo-aisha@behaviordecoded.app', password: 'DemoParent3!', name: 'Aisha Johnson', learner: 'Marcus Johnson' },
  { email: 'demo-rachel@behaviordecoded.app', password: 'DemoParent4!', name: 'Rachel Kim', learner: 'Sofia Kim' },
  { email: 'demo-james@behaviordecoded.app', password: 'DemoParent5!', name: 'James Okafor', learner: 'Amara Okafor' },
];

export default function DemoAccountsPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  async function handleDemoLogin(demo: typeof DEMO_ACCOUNTS[0]) {
    setLoading(demo.email);
    // Sign out current admin session first
    await supabase.auth.signOut();
    const { error } = await signIn(demo.email, demo.password);
    if (error) {
      toast({
        title: 'Demo login failed',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(null);
    }
    // On success, auth state change will redirect to dashboard
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Demo Accounts</h1>
          <p className="text-sm text-muted-foreground">Switch into a demo caregiver to preview the parent experience</p>
        </div>
      </div>

      {/* Warning */}
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-foreground">
        <strong>Note:</strong> Switching to a demo account will sign you out of your current session.
        You can sign back in with your admin credentials anytime.
      </div>

      {/* Demo account cards */}
      <div className="grid gap-3">
        {DEMO_ACCOUNTS.map((demo) => (
          <button
            key={demo.email}
            disabled={loading !== null}
            onClick={() => handleDemoLogin(demo)}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft hover:shadow-md hover:border-primary/20 transition-all text-left group"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{demo.name}</p>
              <p className="text-sm text-muted-foreground truncate">{demo.learner}'s caregiver</p>
            </div>
            {loading === demo.email ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
            ) : (
              <Play className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
