/**
 * CoachBot™ Floating Action Button
 * ─────────────────────────────────
 * Persistent mini floating icon (bottom-right).
 * Subtle pulse, never auto-opens, never interrupts.
 */

import { useState } from 'react';
import { CoachBotPanel } from './CoachBotPanel';

export function CoachBotFAB() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full gradient-hero shadow-soft transition-transform hover:scale-105 active:scale-95"
        aria-label="Open CoachBot"
      >
        {/* Nova icon – brain glow */}
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.2 4.8-3 6.2V18a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.8C6.2 13.8 5 11.5 5 9a7 7 0 0 1 7-7z" />
          <path d="M9 22h6" />
          <path d="M12 2v4" />
          <path d="M8 9h8" />
        </svg>
        {/* Subtle pulse ring */}
        <span className="absolute inset-0 rounded-full gradient-hero opacity-30 animate-ping" style={{ animationDuration: '3s' }} />
      </button>

      {/* Panel */}
      <CoachBotPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
