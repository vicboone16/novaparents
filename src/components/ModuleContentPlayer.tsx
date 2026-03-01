/**
 * Module Content Player
 * ─────────────────────
 * Screen-by-screen viewer for parent_training_module_versions.content JSON.
 * Screens: intro → teach → examples → misconceptions → practice → reflection → close
 * Supports both DB and local progress storage.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, ArrowRight, CheckCircle2, BookOpen,
  AlertTriangle, HelpCircle, MessageSquare, Sparkles, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  upsertTrainingProgress,
  type TrainingProgress,
  type ModuleContent,
  type ModuleScreen,
} from '@/lib/parent-training-dal';
import { recordActivity } from '@/lib/streaks';

interface Props {
  moduleId: string;
  moduleVersionId: string;
  moduleTitle: string;
  content: ModuleContent;
  estMinutes: number;
  userId: string;
  isLinked: boolean;
  existingProgress?: TrainingProgress | null;
  resumeScreenKey?: string | null;
  onClose: () => void;
  onComplete: () => void;
}

// Map screen types to icons
const SCREEN_ICONS: Record<string, React.ElementType> = {
  intro: BookOpen,
  teach: BookOpen,
  examples: Eye,
  misconceptions: AlertTriangle,
  practice: HelpCircle,
  reflection: MessageSquare,
  close: Sparkles,
  tip: Sparkles,
  example: Eye,
};

export function ModuleContentPlayer({
  moduleId, moduleVersionId, moduleTitle, content, estMinutes,
  userId, isLinked, existingProgress, resumeScreenKey, onClose, onComplete,
}: Props) {
  const screens = useMemo(() => content?.screens || [], [content]);

  // Find resume index
  const startIndex = useMemo(() => {
    if (resumeScreenKey && screens.length > 0) {
      const idx = screens.findIndex(s => s.key === resumeScreenKey);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  }, [resumeScreenKey, screens]);

  const [screenIndex, setScreenIndex] = useState(startIndex);
  const [viewedScreens, setViewedScreens] = useState<Set<string>>(
    new Set(existingProgress?.screens_viewed || [])
  );
  const [reflectionText, setReflectionText] = useState(existingProgress?.reflection_response || '');
  const [saving, setSaving] = useState(false);

  const currentScreen = screens[screenIndex];
  const isLastScreen = screenIndex === screens.length - 1;
  const isFirstScreen = screenIndex === 0;

  // Mark current screen as viewed
  useEffect(() => {
    if (currentScreen) {
      setViewedScreens(prev => new Set([...prev, currentScreen.key]));
    }
  }, [currentScreen]);

  // Save in-progress on mount
  useEffect(() => {
    if (!existingProgress || existingProgress.status === 'not_started') {
      upsertTrainingProgress({
        user_id: userId,
        module_id: moduleId,
        module_version_id: moduleVersionId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        completed_at: null,
        xp_earned: 0,
        reflection_response: null,
        screens_viewed: [],
        current_screen_key: screens[0]?.key || null,
      }, isLinked);
    }
  }, []);

  // Save current screen position periodically
  useEffect(() => {
    if (!currentScreen) return;
    const timeout = setTimeout(() => {
      upsertTrainingProgress({
        user_id: userId,
        module_id: moduleId,
        module_version_id: moduleVersionId,
        status: 'in_progress',
        started_at: existingProgress?.started_at || new Date().toISOString(),
        completed_at: null,
        xp_earned: 0,
        reflection_response: reflectionText || null,
        screens_viewed: Array.from(viewedScreens),
        current_screen_key: currentScreen.key,
      }, isLinked);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [screenIndex, viewedScreens]);

  function goNext() {
    if (screenIndex < screens.length - 1) {
      setScreenIndex(screenIndex + 1);
    }
  }

  function goPrev() {
    if (screenIndex > 0) {
      setScreenIndex(screenIndex - 1);
    } else {
      onClose();
    }
  }

  async function handleComplete() {
    setSaving(true);
    const xp = 10 + estMinutes;
    await upsertTrainingProgress({
      user_id: userId,
      module_id: moduleId,
      module_version_id: moduleVersionId,
      status: 'completed',
      started_at: existingProgress?.started_at || new Date().toISOString(),
      completed_at: new Date().toISOString(),
      xp_earned: xp,
      reflection_response: reflectionText || null,
      screens_viewed: Array.from(viewedScreens),
      current_screen_key: null,
    }, isLinked);
    recordActivity(userId).catch(() => {});
    setSaving(false);
    onComplete();
  }

  if (!currentScreen) {
    return (
      <div className="space-y-4 animate-fade-in text-center py-10">
        <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto" />
        <p className="text-sm text-muted-foreground">This module has no content yet.</p>
        <Button variant="outline" onClick={onClose}>Back to Training</Button>
      </div>
    );
  }

  const progressPct = ((screenIndex + 1) / screens.length) * 100;
  const Icon = SCREEN_ICONS[currentScreen.type] || BookOpen;
  const isReflectionScreen = currentScreen.type === 'reflection';
  const isCloseScreen = currentScreen.type === 'close';

  // ─── Render Markdown-ish body ──────────────────────────
  function renderBody(body: string, isHero: boolean) {
    // Split by newlines and render with basic markdown support
    const lines = body.split('\n');
    return (
      <div className={`space-y-2 text-sm leading-relaxed ${isHero ? 'text-primary-foreground/85' : 'text-foreground'}`}>
        {lines.map((line, i) => {
          if (!line.trim()) return <div key={i} className="h-1" />;

          // Bold sections: **text**
          const parts = line.split(/(\*\*[^*]+\*\*)/g);
          const rendered = parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>;
            }
            return <span key={j}>{part}</span>;
          });

          // Headers with emoji prefixes
          if (line.startsWith('❌') || line.startsWith('→') || line.startsWith('✅') || line.startsWith('💡') || line.startsWith('📌')) {
            return <p key={i} className="pl-1">{rendered}</p>;
          }

          // Bullet-like lines
          if (line.startsWith('•') || line.startsWith('-') || line.startsWith('🟡') || line.startsWith('🔵') || line.startsWith('🟢') || line.startsWith('🟣') || line.startsWith('🔴')) {
            return <p key={i} className="pl-3">{rendered}</p>;
          }

          // Numbered items
          if (/^\d[️⃣]?\)?\.?\s/.test(line) || /^[1-9]️⃣/.test(line)) {
            return <p key={i} className="pl-3">{rendered}</p>;
          }

          return <p key={i}>{rendered}</p>;
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-1 text-sm text-primary font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <p className="text-[10px] text-muted-foreground font-medium">
          {screenIndex + 1} of {screens.length}
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Screen content */}
      {isCloseScreen ? (
        /* Close / completion screen */
        <div className="space-y-4">
          <div className="rounded-2xl gradient-hero p-6 text-primary-foreground text-center space-y-3">
            <Sparkles className="h-10 w-10 mx-auto opacity-80" />
            <h3 className="font-display text-xl font-bold">{currentScreen.title}</h3>
            {currentScreen.body && renderBody(currentScreen.body, true)}
          </div>
          <Button onClick={handleComplete} disabled={saving} className="w-full gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> {saving ? 'Saving…' : 'Complete Module'}
          </Button>
          <Button variant="outline" onClick={goPrev} className="w-full gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Go Back
          </Button>
        </div>
      ) : isReflectionScreen ? (
        /* Reflection screen */
        <div className="space-y-3">
          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-accent" />
              <h3 className="font-display text-lg font-bold text-foreground">{currentScreen.title}</h3>
            </div>
            {currentScreen.body && renderBody(currentScreen.body, false)}
            <Textarea
              value={reflectionText}
              onChange={e => setReflectionText(e.target.value)}
              placeholder="Take a moment to reflect…"
              rows={4}
              className="text-sm mt-2"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={goPrev} className="flex-1 gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button onClick={goNext} className="flex-1 gap-1">
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        /* All other screens */
        <div className="space-y-3">
          <div className={`rounded-2xl p-6 space-y-4 ${
            currentScreen.type === 'intro'
              ? 'gradient-hero text-primary-foreground'
              : currentScreen.type === 'misconceptions'
                ? 'border border-warning/20 bg-warning/5'
                : currentScreen.type === 'practice'
                  ? 'border border-primary/20 bg-primary/5'
                  : 'border border-border bg-card shadow-card'
          }`}>
            <div className="flex items-center gap-2">
              <Icon className={`h-6 w-6 ${
                currentScreen.type === 'intro' ? 'text-primary-foreground/80' :
                currentScreen.type === 'misconceptions' ? 'text-warning' :
                currentScreen.type === 'practice' ? 'text-primary' :
                'text-primary'
              }`} />
              <h3 className={`font-display text-lg font-bold ${
                currentScreen.type === 'intro' ? 'text-primary-foreground' : 'text-foreground'
              }`}>
                {currentScreen.title}
              </h3>
            </div>
            {currentScreen.body && renderBody(currentScreen.body, currentScreen.type === 'intro')}
            {currentScreen.bullets && currentScreen.bullets.length > 0 && (
              <ul className={`space-y-1.5 text-sm ${
                currentScreen.type === 'intro' ? 'text-primary-foreground/80' : 'text-foreground'
              }`}>
                {currentScreen.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current shrink-0 opacity-60" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            {screenIndex + 1} of {screens.length} screens
          </p>

          <div className="flex gap-2">
            <Button variant="outline" onClick={goPrev} className="flex-1 gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> {isFirstScreen ? 'Exit' : 'Back'}
            </Button>
            <Button onClick={goNext} className="flex-1 gap-1">
              {isLastScreen ? 'Finish' : 'Next'} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
