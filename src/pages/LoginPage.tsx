import { useState } from 'react';
import { signIn, resetPassword } from '@/lib/dal';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
    setLoading(false);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Check your email to confirm your account, then sign in.');
    }
    setLoading(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await resetPassword(email);
    if (error) setError(error.message);
    else setSuccess('Check your email for a reset link.');
    setLoading(false);
  }

  function switchMode(m: 'login' | 'signup' | 'reset') {
    setMode(m);
    setError('');
    setSuccess('');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-hero shadow-soft">
            <Heart className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Behavior Decoded™</h1>
          <p className="mt-1 text-sm text-muted-foreground">Coach Portal</p>
        </div>

        {success && (
          <div className="rounded-xl bg-success/10 border border-success/20 p-4 text-sm text-foreground">
            {success}
          </div>
        )}

        {mode === 'reset' ? (
          <form onSubmit={handleReset} className="space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground">Reset Password</h2>
            <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
            <button type="button" onClick={() => switchMode('login')} className="text-sm text-primary font-medium">
              ← Back to sign in
            </button>
          </form>
        ) : (
          <form onSubmit={mode === 'login' ? handleLogin : handleSignUp} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {mode === 'signup' && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm Password</label>
                <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
            <div className="flex items-center justify-between text-sm">
              {mode === 'login' ? (
                <>
                  <button type="button" onClick={() => switchMode('reset')} className="text-primary font-medium">Forgot password?</button>
                  <button type="button" onClick={() => switchMode('signup')} className="text-primary font-medium">Create account</button>
                </>
              ) : (
                <button type="button" onClick={() => switchMode('login')} className="text-primary font-medium">← Already have an account</button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
