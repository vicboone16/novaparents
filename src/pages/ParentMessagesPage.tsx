/**
 * Parent Messages — placeholder for teacher/team messages
 */

import { MessageCircle } from 'lucide-react';

export default function ParentMessagesPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl gradient-hero p-6 text-primary-foreground shadow-soft text-center space-y-2">
        <MessageCircle className="h-8 w-8 mx-auto opacity-90" />
        <h2 className="font-display text-lg font-bold">Messages</h2>
        <p className="text-sm opacity-80">Stay connected with your child's support team.</p>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-card text-center">
        <p className="text-sm text-muted-foreground">
          Messages from your child's team will appear here. Check back soon! 💬
        </p>
      </section>
    </div>
  );
}
