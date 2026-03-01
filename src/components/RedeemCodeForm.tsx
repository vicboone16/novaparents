import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, Ticket } from 'lucide-react';
import { redeemInviteCode, type RedeemResult } from '@/lib/invite-dal';

interface RedeemCodeFormProps {
  redeemedFrom: 'signup' | 'settings';
  onSuccess?: (result: RedeemResult) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function RedeemCodeForm({ redeemedFrom, onSuccess, onCancel, compact }: RedeemCodeFormProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError('');

    const result = await redeemInviteCode(code.trim(), redeemedFrom);

    if (result.success) {
      setSuccess(true);
      onSuccess?.(result);
    } else {
      setError(result.error || 'Something went wrong. Please try again.');
    }

    setLoading(false);
  }

  if (success) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-success/10 border border-success/20 p-4 animate-fade-in">
        <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Successfully linked!</p>
          <p className="text-xs text-muted-foreground">Your account is now connected to the agency.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${compact ? '' : 'animate-fade-in'}`}>
      {!compact && (
        <div className="flex items-center gap-2 mb-1">
          <Ticket className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Redeem Invite Code</p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Enter the code provided by your agency or supervisor to link your account.
      </p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Enter code (e.g. ABC123)"
          maxLength={32}
          className="flex-1 font-mono uppercase tracking-wider"
          autoFocus
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !code.trim()} size={compact ? 'sm' : 'default'}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Redeem'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {onCancel && (
        <button type="button" onClick={onCancel} className="text-sm text-primary font-medium">
          ← {redeemedFrom === 'signup' ? 'Back to sign in' : 'Cancel'}
        </button>
      )}
    </form>
  );
}
