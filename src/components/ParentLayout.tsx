import { NavLink, useNavigate } from 'react-router-dom';
import { Home, TrendingUp, Gift, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const parentNav = [
  { to: '/parent', label: 'Home', icon: Home },
  { to: '/parent/progress', label: 'Progress', icon: TrendingUp },
  { to: '/parent/rewards', label: 'Rewards', icon: Gift },
  { to: '/parent/messages', label: 'Messages', icon: MessageCircle },
];

export function ParentLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

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
            onClick={() => navigate('/parent/profile')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
            aria-label="Profile"
          >
            <User className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-5 px-4 sm:px-6 animate-fade-in max-w-full overflow-x-hidden">
        {children}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
        <div className="flex items-stretch justify-around">
          {parentNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/parent'}
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
