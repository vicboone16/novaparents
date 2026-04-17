import { NavLink, useNavigate } from 'react-router-dom';
import { Home, TrendingUp, Gift, MessageCircle, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveChildProvider, useActiveChild } from '@/contexts/ActiveChildContext';
import { useUserAccess } from '@/contexts/UserAccessContext';
import { useInactivityLock } from '@/hooks/useInactivityLock';
import { InactivityLockOverlay } from '@/components/InactivityLockOverlay';

const parentNav = [
  { to: '/parent', label: 'Home', icon: Home, soon: false },
  { to: '/parent/progress', label: 'Progress', icon: TrendingUp, soon: false },
  { to: '/parent/rewards', label: 'Rewards', icon: Gift, soon: false },
  { to: '/parent/messages', label: 'Messages', icon: MessageCircle, soon: true },
];

function ChildSelectorHeader() {
  const { data: access } = useUserAccess();
  const { activeChildId, activeChildName, setActiveChild } = useActiveChild();
  const students = access?.students ?? [];

  if (students.length <= 1) return null;

  return (
    <div className="border-b border-border bg-muted/40 px-4 py-1.5">
      <div className="container flex items-center gap-2 overflow-x-auto scrollbar-none">
        {students.map((s) => {
          const isActive = activeChildId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveChild(s.id, s.first_name || 'your child')}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {s.first_name} {s.last_name}
              {isActive && <ChevronDown className="h-3 w-3 opacity-70" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ParentLayoutInner({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { locked, unlock } = useInactivityLock();

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background pb-20 overflow-x-hidden">
      {locked && <InactivityLockOverlay onContinue={unlock} />}
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

        {/* Child selector — only visible when parent has multiple children */}
        <ChildSelectorHeader />
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
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.soon && (
                  <span className="absolute -top-1 -right-2 rounded-full bg-muted px-1 text-[7px] font-bold text-muted-foreground leading-tight">
                    soon
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <ActiveChildProvider>
      <ParentLayoutInner>{children}</ParentLayoutInner>
    </ActiveChildProvider>
  );
}
