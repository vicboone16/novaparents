import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Link2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface RedeemAgencyInviteCodeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRedeemed?: () => void;
}

export function RedeemAgencyInviteCode({ open, onOpenChange, onRedeemed }: RedeemAgencyInviteCodeProps) {
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [success, setSuccess] = useState(false);

  const ERROR_MESSAGES: Record<string, string> = {
    not_authenticated: 'You must be logged in to join an agency.',
    code_not_found: 'Code not found. Please check and try again.',
    code_inactive: 'This code is no longer active.',
    code_expired: 'This code has expired.',
    code_maxed: 'This code has reached its usage limit.',
    already_linked: 'You are already linked to this agency.',
  };

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      const { data, error } = await (supabase as any).rpc('redeem_agency_invite_code', {
        _code: code.trim(),
      });

      if (error) {
        toast.error('Something went wrong. Please try again.');
        return;
      }

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        toast.error(ERROR_MESSAGES[result.error || ''] || result.error || 'Something went wrong.');
        return;
      }

      setSuccess(true);
      toast.success('Successfully joined agency!');
      onRedeemed?.();
    } catch (err: any) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setSuccess(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Join Agency
          </DialogTitle>
          <DialogDescription>
            Enter an agency invite code to join an organization.
          </DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <p className="font-medium">You've joined the agency!</p>
            <p className="text-sm text-muted-foreground">Your account is now connected.</p>
            <Button onClick={handleClose} className="mt-2">Done</Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div>
              <Label>Invite Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="AGY-XXXX-XXXX"
                className="font-mono tracking-wider"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleRedeem} disabled={redeeming || !code.trim()}>
                {redeeming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Join Agency
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
