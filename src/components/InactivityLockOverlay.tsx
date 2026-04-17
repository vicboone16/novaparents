import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/dal';
import { useNavigate } from 'react-router-dom';

interface Props {
  onContinue: () => void;
}

export function InactivityLockOverlay({ onContinue }: Props) {
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 backdrop-blur-sm p-6">
      <div className="w-full max-w-sm space-y-6 text-center animate-fade-in">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-xl font-bold text-foreground">Still there?</h2>
          <p className="text-sm text-muted-foreground">
            Your session was paused after 30 minutes of inactivity to keep your family's information private.
          </p>
        </div>
        <div className="space-y-3">
          <Button className="w-full" onClick={onContinue}>
            Continue
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
