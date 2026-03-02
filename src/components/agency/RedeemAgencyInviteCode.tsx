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

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to join an agency.');
        return;
      }

      // Look up the code in agency_invite_codes
      const { data: invite, error: lookupErr } = await (supabase as any)
        .from('agency_invite_codes')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .single();

      if (lookupErr || !invite) {
        toast.error('Code not found. Please check and try again.');
        return;
      }

      if (!invite.is_active) {
        toast.error('This code is no longer active.');
        return;
      }

      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        toast.error('This code has expired.');
        return;
      }

      if (invite.uses >= invite.max_uses) {
        toast.error('This code has reached its usage limit.');
        return;
      }

      // Check if already linked
      const { data: existing } = await supabase
        .from('user_agency_access')
        .select('id')
        .eq('user_id', user.id)
        .eq('agency_id', invite.agency_id)
        .maybeSingle();

      if (existing) {
        toast.error('You are already linked to this agency.');
        return;
      }

      // Insert access record
      const { error: insertErr } = await supabase
        .from('user_agency_access')
        .insert({
          user_id: user.id,
          agency_id: invite.agency_id,
          role: invite.role || 'staff',
          redeemed_from: 'agency_code',
        });

      if (insertErr) throw insertErr;

      // Increment uses
      await (supabase as any)
        .from('agency_invite_codes')
        .update({ uses: invite.uses + 1 })
        .eq('id', invite.id);

      setSuccess(true);
      toast.success('Successfully joined agency!');
      onRedeemed?.();
    } catch (err: any) {
      toast.error('Something went wrong: ' + err.message);
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
