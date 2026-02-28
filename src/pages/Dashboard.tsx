import { useEffect, useState } from 'react';
import { BookOpen, PenLine, Lightbulb, ArrowRight, Heart, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '@/lib/dal';

const quickActions = [
  { to: '/log', icon: PenLine, label: 'Log Behavior', color: 'bg-secondary/10 text-secondary' },
  { to: '/library', icon: Lightbulb, label: 'What Do I Do When…', color: 'bg-accent/10 text-accent' },
  { to: '/learn', icon: BookOpen, label: 'Continue Learning', color: 'bg-primary/10 text-primary' },
];

export default function Dashboard() {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    getCurrentUser().then((user) => {
      const email = user?.email || '';
      setUserName(email.split('@')[0] || 'there');
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <section className="rounded-2xl gradient-hero p-6 text-primary-foreground shadow-soft">
        <div className="flex items-start gap-3">
          <Heart className="h-6 w-6 mt-0.5 opacity-80 shrink-0" />
          <div>
            <h2 className="font-display text-xl font-bold">
              Welcome back, {userName}!
            </h2>
            <p className="mt-1 text-primary-foreground/80 text-sm">
              You're doing great. Every step you take helps your client thrive.
            </p>
          </div>
        </div>
      </section>

      {/* Today's Focus */}
      <section className="rounded-xl border border-primary/20 bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">Today's Focus</span>
        </div>
        <Link to="/learn" className="group">
          <h3 className="font-display font-bold text-foreground group-hover:text-primary transition-colors">
            Module 3: Identifying Triggers
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Recognize what sets off challenging behaviors and plan ahead.
          </p>
          <span className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-primary">
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </section>

      {/* Quick Actions */}
      <section>
        <h3 className="font-display text-sm font-bold text-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-soft transition-all text-center"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.color}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-foreground leading-tight">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Daily Tip */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <h4 className="font-display font-bold text-foreground text-sm">Daily Tip</h4>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              When responding to challenging behavior, pause and take a breath first.
              Your calm response teaches your client more than any words could.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
