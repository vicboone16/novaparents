import { useState } from 'react';
import { ShieldAlert, Heart, UserPlus, Ticket, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RedeemCodeForm } from '@/components/RedeemCodeForm';
import { supabase } from '@/integrations/supabase/client';

interface BackendGuardScreenProps {
  message: string;
  /** If true, shows parent-friendly onboarding options instead of a dead-end */
  allowIndependentMode?: boolean;
  onContinueIndependent?: () => void;
  onCodeRedeemed?: () => void;
  /** Called when the user taps "Try again" on a connection error screen */
  onRetry?: () => void;
}

export function BackendGuardScreen({
  message,
  allowIndependentMode,
  onContinueIndependent,
  onCodeRedeemed,
  onRetry,
}: BackendGuardScreenProps) {
  const [showRedeem, setShowRedeem] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  // Dead-end mode (handshake failure / true backend errors)
  if (!allowIndependentMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="animate-fade-in text-center max-w-md space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Connection Error
            </h1>
            <p className="text-muted-foreground">{message}</p>
          </div>
          {onRetry ? (
            <Button onClick={onRetry} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Please contact support if this persists.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Parent-friendly onboarding screen
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-hero shadow-soft">
            <Heart className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Welcome!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Let's get you set up with Behavior Decoded
          </p>
        </div>

        {showRedeem ? (
          <div className="space-y-4">
            <RedeemCodeForm
              redeemedFrom="signup"
              onCancel={() => setShowRedeem(false)}
              onSuccess={() => onCodeRedeemed?.()}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Independent parent — primary action */}
            <Button
              onClick={onContinueIndependent}
              className="w-full h-auto py-4 flex flex-col items-center gap-1"
              size="lg"
            >
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                <span className="font-semibold">Continue as Parent</span>
              </div>
              <span className="text-xs font-normal opacity-80">
                Add your own learners &amp; start tracking
              </span>
            </Button>

            {/* Redeem invite code — secondary */}
            <button
              onClick={() => setShowRedeem(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
            >
              <Ticket className="h-4 w-4" />
              I have an invite code
            </button>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
