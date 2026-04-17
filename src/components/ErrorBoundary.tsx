import { Component, type ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  /**
   * Optional custom fallback. If omitted, a default recovery screen is shown.
   * Receives the caught error and a reset callback.
   */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary. Catches render exceptions so a single broken
 * component never produces a blank white screen for parents or coaches.
 * Provides a "Try again" reload path so users can self-recover.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log to console for dev/observability purposes.
    // Replace with a proper error reporting service (Sentry, etc.) in production.
    console.error('[ErrorBoundary] Unhandled render error:', error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (!error) return children;

    if (fallback) return fallback(error, this.reset);

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="animate-fade-in text-center max-w-sm space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-xl font-bold text-foreground">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. Your data is safe — please try reloading.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={this.reset} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Reload the page
            </button>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-4 rounded-xl bg-muted p-4 text-left text-[10px] text-destructive overflow-auto max-h-40">
              {error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
