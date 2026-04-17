/**
 * Parent Messages
 * ───────────────
 * Real-time messaging with the child's support team is not yet available.
 * This page provides an honest, trust-preserving empty state rather than
 * a misleading "Check back soon" placeholder.
 *
 * When messaging is ready:
 *  - Replace this with a thread list connected to the messages service
 *  - Update ParentLayout nav item to remove the "coming soon" indicator
 */

import { MessageCircle, Mail } from 'lucide-react';

export default function ParentMessagesPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="rounded-2xl gradient-hero p-6 text-primary-foreground shadow-soft text-center space-y-2">
        <MessageCircle className="h-8 w-8 mx-auto opacity-90" />
        <h2 className="font-display text-lg font-bold">Messages</h2>
        <p className="text-sm opacity-80">Direct communication with your child's support team.</p>
      </section>

      {/* Honest coming-soon state */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1.5">
          <p className="font-display text-sm font-bold text-foreground">
            Messaging is coming soon
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            In-app messaging with your child's team is being built now. Until then,
            your team's contact details will be in the welcome email they sent you.
          </p>
        </div>
      </section>
    </div>
  );
}
