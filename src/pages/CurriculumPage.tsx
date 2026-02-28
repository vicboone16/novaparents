import { BookOpen, CheckCircle2, Circle, Lock } from 'lucide-react';

const modules = [
  { id: 1, title: 'Understanding Behavior', description: 'Learn why behavior happens and what it communicates.', status: 'completed' as const },
  { id: 2, title: 'The ABCs of Behavior', description: 'Antecedent, Behavior, Consequence — the building blocks.', status: 'completed' as const },
  { id: 3, title: 'Identifying Triggers', description: 'Recognize what sets off challenging behaviors.', status: 'current' as const },
  { id: 4, title: 'Replacement Behaviors', description: 'Teach alternatives that meet the same need.', status: 'locked' as const },
  { id: 5, title: 'Reinforcement Strategies', description: 'Effective ways to encourage positive behavior.', status: 'locked' as const },
  { id: 6, title: 'Managing Crisis Moments', description: 'Stay calm and respond effectively during escalation.', status: 'locked' as const },
  { id: 7, title: 'Building Routines', description: 'Create structure that prevents challenging behaviors.', status: 'locked' as const },
  { id: 8, title: 'Celebrating Progress', description: 'Recognize growth — yours and your client\'s.', status: 'locked' as const },
];

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    badge: 'Completed',
    badgeClass: 'bg-success/10 text-success',
    cardClass: 'border-success/20',
  },
  current: {
    icon: BookOpen,
    badge: 'In Progress',
    badgeClass: 'bg-primary/10 text-primary',
    cardClass: 'border-primary/30 shadow-soft',
  },
  locked: {
    icon: Lock,
    badge: 'Locked',
    badgeClass: 'bg-muted text-muted-foreground',
    cardClass: 'opacity-60',
  },
};

export default function CurriculumPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Behavior Decoded™ Training
        </h2>
        <p className="mt-1 text-muted-foreground">
          Complete each module at your own pace. New modules unlock as you progress.
        </p>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl bg-muted p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Your Progress</span>
          <span className="text-sm font-bold text-primary">2 of {modules.length} complete</span>
        </div>
        <div className="h-3 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full gradient-hero transition-all duration-500"
            style={{ width: `${(2 / modules.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-3">
        {modules.map((mod) => {
          const config = statusConfig[mod.status];
          const Icon = config.icon;
          return (
            <button
              key={mod.id}
              disabled={mod.status === 'locked'}
              className={`w-full text-left flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-soft disabled:cursor-not-allowed ${config.cardClass}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-display font-bold text-foreground">
                    Module {mod.id}: {mod.title}
                  </h4>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.badgeClass}`}>
                    {config.badge}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
