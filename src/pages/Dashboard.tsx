import { BookOpen, PenLine, Lightbulb, BarChart3, ArrowRight, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  {
    to: '/curriculum',
    icon: BookOpen,
    title: 'Training Curriculum',
    description: 'Step-by-step guided lessons to understand and respond to behavior.',
    color: 'bg-primary/10 text-primary',
  },
  {
    to: '/log',
    icon: PenLine,
    title: 'Behavior Log',
    description: 'Track behaviors at home with simple, quick entries.',
    color: 'bg-secondary/10 text-secondary',
  },
  {
    to: '/coaching',
    icon: Lightbulb,
    title: '"What Do I Do When…"',
    description: 'Get coaching tips and replacement behaviors for common situations.',
    color: 'bg-accent/10 text-accent',
  },
  {
    to: '/progress',
    icon: BarChart3,
    title: 'Progress & Reminders',
    description: 'See how things are going and stay on track.',
    color: 'bg-success/10 text-success',
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="rounded-2xl gradient-hero p-8 text-primary-foreground shadow-soft">
        <div className="flex items-start gap-3 mb-4">
          <Heart className="h-6 w-6 mt-0.5 opacity-80" />
          <div>
            <h2 className="font-display text-2xl font-bold">
              Welcome Back!
            </h2>
            <p className="mt-1 text-primary-foreground/80 max-w-lg">
              You're doing great. Every step you take here helps your client thrive.
              Let's keep going together.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section>
        <h3 className="font-display text-lg font-bold text-foreground mb-4">
          Your Tools
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <Link
              key={feature.to}
              to={feature.to}
              className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-soft hover:border-primary/20"
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${feature.color}`}>
                <feature.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-display font-bold text-foreground group-hover:text-primary transition-colors">
                  {feature.title}
                </h4>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Tip */}
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
