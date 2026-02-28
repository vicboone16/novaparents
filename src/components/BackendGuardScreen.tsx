import { ShieldAlert } from 'lucide-react';

interface BackendGuardScreenProps {
  message: string;
}

export function BackendGuardScreen({ message }: BackendGuardScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="animate-fade-in text-center max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          Connection Error
        </h1>
        <p className="text-muted-foreground text-lg">
          {message}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Please contact your agency administrator.
        </p>
      </div>
    </div>
  );
}
