import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Wrench, BookOpen, Gamepad2, User, BarChart3, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEngagement } from '@/hooks/useEngagement';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

const DEMO_EMAIL_PATTERN = /^demo-.*@behaviordecoded\.app$/;

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/academy', label: 'Academy', icon: BookOpen },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
  { to: '/toolkit', label: 'Toolkit', icon: Wrench },
  { to: '/behavior-lab', label: 'Lab', icon: Gamepad2 },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  useEngagement();
  const navigate = useNavigate();
  const [demoSession, setDemoSession] = useState(false);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setDemoSession(!!(user?.email && DEMO_EMAIL_PATTERN.test(user.email)));
    });
  }, []);

  async function handleReturnToAdmin() {
    setReturning(true);
    sessionStorage.removeItem('bd_admin_return_email');
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background pb-20 overflow-x-hidden">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md safe-area-top">
        <div className="container flex h-14 items-center gap-3 px-4 sm:px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl gradient-hero">
            <span className="text-sm font-bold text-primary-foreground">B</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-base font-bold leading-tight text-foreground truncate">
              Behavior Decoded™
            </h1>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
            aria-label="Profile"
          >
            <User className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Demo session banner */}
      {demoSession && (
        <div className="sticky top-14 z-40 border-b border-warning/30 bg-warning/10 px-4 py-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-foreground truncate">
            <span className="font-semibold">Demo mode</span> — viewing as a caregiver
          </p>
          <button
            onClick={handleReturnToAdmin}
            disabled={returning}
            className="flex items-center gap-1.5 rounded-lg bg-foreground/10 px-3 py-1 text-xs font-semibold text-foreground hover:bg-foreground/20 transition-colors shrink-0"
          >
            <LogOut className="h-3 w-3" />
            {returning ? 'Signing out…' : 'Exit demo'}
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="container py-5 px-4 sm:px-6 animate-fade-in max-w-full overflow-x-hidden">
        {children}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
        <div className="flex items-stretch justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2 pt-2.5 text-[10px] font-semibold transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
