import { NavLink, useLocation } from 'react-router-dom';
import { Home, BookOpen, PenLine, Library, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/learn', label: 'Learn', icon: BookOpen },
  { to: '/log', label: 'Log', icon: PenLine },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/profile', label: 'Profile', icon: User },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container flex h-14 items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl gradient-hero">
            <span className="text-sm font-bold text-primary-foreground">B</span>
          </div>
          <div>
            <h1 className="font-display text-base font-bold leading-tight text-foreground">
              Behavior Decoded™
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-5 animate-fade-in">
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
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
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
