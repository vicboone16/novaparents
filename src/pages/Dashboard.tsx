/**
 * Coach Dashboard (Home)
 * ──────────────────────
 * Quick actions, pending Evidence Packet status, daily focus.
 */

import { useEffect, useState } from 'react';
import { BookOpen, PenLine, Lightbulb, ArrowRight, Heart, Sparkles, Package, Send, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '@/lib/dal';
import { Button } from '@/components/ui/button';
import { getPackets, submitEvidencePacket, type EvidencePacket, type PacketStatus } from '@/lib/evidence';

const quickActions = [
  { to: '/log', icon: PenLine, label: 'Log Data', color: 'bg-secondary/10 text-secondary' },
  { to: '/toolkit', icon: Lightbulb, label: 'What Do I Do When…', color: 'bg-accent/10 text-accent' },
  { to: '/toolkit', icon: BookOpen, label: 'Continue Learning', color: 'bg-primary/10 text-primary' },
];

const statusConfig: Record<PacketStatus, { label: string; cls: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', cls: 'bg-muted text-muted-foreground', icon: Package },
  submitted: { label: 'Submitted', cls: 'bg-primary/10 text-primary', icon: Send },
  pending_review: { label: 'Pending Review', cls: 'bg-warning/10 text-warning', icon: Clock },
  approved: { label: 'Approved', cls: 'bg-success/10 text-success', icon: CheckCircle2 },
  needs_followup: { label: 'Needs Follow-up', cls: 'bg-secondary/10 text-secondary', icon: AlertTriangle },
  rejected: { label: 'Rejected', cls: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
};

export default function Dashboard() {
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [packets, setPackets] = useState<EvidencePacket[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) {
        const email = user.email || '';
        setUserName(email.split('@')[0] || 'there');
        setUserId(user.id);
        setPackets(getPackets());
      }
    });
  }, []);

  function handleSubmitPacket() {
    if (!userId) return;
    setSubmitting(true);
    const packet = submitEvidencePacket(userId);
    setPackets(getPackets());
    setSubmitting(false);
  }

  const latestPacket = packets[0] || null;
  const followupPacket = packets.find(p => p.status === 'needs_followup');

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <section className="rounded-2xl gradient-hero p-5 text-primary-foreground shadow-soft">
        <div className="flex items-start gap-3">
          <Heart className="h-5 w-5 mt-0.5 opacity-80 shrink-0" />
          <div>
            <h2 className="font-display text-lg font-bold">Welcome back, {userName}!</h2>
            <p className="mt-1 text-primary-foreground/80 text-sm">
              Every step you take helps your Learner thrive.
            </p>
          </div>
        </div>
      </section>

      {/* Follow-up notice */}
      {followupPacket && (
        <section className="rounded-xl border border-secondary/30 bg-secondary/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-secondary" />
            <h3 className="font-display font-bold text-foreground text-sm">Follow-up Needed</h3>
          </div>
          {followupPacket.feedbackMessage && (
            <p className="text-sm text-foreground">{followupPacket.feedbackMessage}</p>
          )}
          {followupPacket.followupItems.length > 0 && (
            <ul className="space-y-1 mt-1">
              {followupPacket.followupItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-secondary font-bold">•</span> {item}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Evidence Packet Status */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">Evidence Packet</span>
          </div>
          {latestPacket && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusConfig[latestPacket.status].cls}`}>
              {statusConfig[latestPacket.status].label}
            </span>
          )}
        </div>

        {latestPacket ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="font-display text-lg font-bold text-foreground">{latestPacket.lessonsCompleted.length}</p>
                <p className="text-[10px] text-muted-foreground">Lessons</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="font-display text-lg font-bold text-foreground">{latestPacket.behaviorLogsCount + latestPacket.frequencyLogsCount + latestPacket.durationLogsCount}</p>
                <p className="text-[10px] text-muted-foreground">Data Logs</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="font-display text-lg font-bold text-foreground">{latestPacket.integrityScore}</p>
                <p className="text-[10px] text-muted-foreground">Score</p>
              </div>
            </div>
            {latestPacket.submittedAt && (
              <p className="text-[10px] text-muted-foreground">Submitted {new Date(latestPacket.submittedAt).toLocaleDateString()}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Complete lessons and log data, then submit your Evidence Packet for review.</p>
        )}

        <Button
          size="sm"
          className="w-full gap-1.5"
          onClick={handleSubmitPacket}
          disabled={submitting}
        >
          <Send className="h-4 w-4" />
          {latestPacket ? 'Submit New Packet' : 'Submit Evidence Packet'}
        </Button>
      </section>

      {/* Today's Focus */}
      <section className="rounded-xl border border-primary/20 bg-card p-4 shadow-soft">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">Today's Focus</span>
        </div>
        <Link to="/toolkit" className="group">
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
          {quickActions.map((action, i) => (
            <Link
              key={i}
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

      {/* Packet History */}
      {packets.length > 1 && (
        <section className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h3 className="font-display font-bold text-foreground text-sm mb-3">Packet History</h3>
          <div className="space-y-2">
            {packets.slice(0, 5).map(p => {
              const cfg = statusConfig[p.status];
              return (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                  <span className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.cls}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
