import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Loader2, Heart, PartyPopper } from 'lucide-react';

export default function InviteAcceptPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase processes the invite token from the URL hash automatically
    // and creates a session. We just need to wait for it.
    const hash = window.location.hash;
    const isInvite = hash.includes('type=invite') || hash.includes('type=signup');

    if (!isInvite) {
      // Not an invite link — check if user already has a session (they may have just been redirected)
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) {
          navigate('/login');
        } else {
          setChecking(false);
        }
      });
    } else {
      // Give Supabase a moment to process the token
      const timer = setTimeout(() => setChecking(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3 animate-fade-in">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Accepting your invitation…</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 animate-fade-in">
          <PartyPopper className="h-12 w-12 text-primary mx-auto" />
          <h2 className="font-display text-xl font-bold text-foreground">You're All Set!</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Your account is ready. Welcome to Behavior Decoded™.
          </p>
          <Button onClick={() => navigate('/')} className="gap-2">
            <Heart className="h-4 w-4" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-hero shadow-soft">
            <Heart className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">Welcome to Behavior Decoded™</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set a password to complete your account setup.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
            <Input
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm Password</label>
            <Input
              type="password"
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create My Account
          </Button>
        </form>
      </div>
    </div>
  );
}
