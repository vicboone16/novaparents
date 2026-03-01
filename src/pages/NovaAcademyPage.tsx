/**
 * Parent Training — Curriculum Home
 * ──────────────────────────────────
 * Fetches from public.parent_training_modules + published versions.
 * Shows Foundations Path, progress, and module player.
 */

import { useState, useEffect } from 'react';
import {
  BookOpen, CheckCircle2, Play, ArrowLeft, ChevronRight,
  Clock, Sparkles, Info, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getCurrentUser } from '@/lib/dal';
import {
  getPublishedModules,
  getMyTrainingProgress,
  getTrainingPaths,
  getTrainingPathModules,
  upsertTrainingProgress,
  getAllLocalProgress,
  syncLocalProgressToDb,
  type ParentModule,
  type TrainingProgress,
  type TrainingPath,
  type TrainingPathModule,
} from '@/lib/parent-training-dal';
import { ModuleContentPlayer } from '@/components/ModuleContentPlayer';
import { recordActivity } from '@/lib/streaks';

export default function NovaAcademyPage() {
  const [userId, setUserId] = useState('');
  const [isLinked, setIsLinked] = useState(false);
  const [modules, setModules] = useState<ParentModule[]>([]);
  const [progress, setProgress] = useState<TrainingProgress[]>([]);
  const [paths, setPaths] = useState<TrainingPath[]>([]);
  const [pathModules, setPathModules] = useState<Record<string, TrainingPathModule[]>>({});
  const [loading, setLoading] = useState(true);
  const [showGlossary, setShowGlossary] = useState(false);

  // Active module for player
  const [activeModule, setActiveModule] = useState<ParentModule | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const user = await getCurrentUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    // Check if user is agency-linked
    const { data: access } = await (await import('@/integrations/supabase/client')).supabase
      .from('user_agency_access')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    const linked = !!(access && access.length > 0);
    setIsLinked(linked);

    // If newly linked, sync local progress to DB
    if (linked) {
      syncLocalProgressToDb(user.id).catch(() => {});
    }

    const [mods, prog, pts] = await Promise.all([
      getPublishedModules(),
      getMyTrainingProgress(user.id),
      getTrainingPaths(),
    ]);

    setModules(mods);

    // Merge DB progress with local progress
    const dbProgressMap = new Map(prog.map(p => [p.module_id, p]));
    const localProgress = getAllLocalProgress().filter(p => p.user_id === user.id);
    for (const lp of localProgress) {
      if (!dbProgressMap.has(lp.module_id)) {
        dbProgressMap.set(lp.module_id, lp);
      }
    }
    setProgress(Array.from(dbProgressMap.values()));

    setPaths(pts);
    const pmMap: Record<string, TrainingPathModule[]> = {};
    for (const path of pts) {
      pmMap[path.id] = await getTrainingPathModules(path.id);
    }
    setPathModules(pmMap);

    setLoading(false);
  }

  const progressMap = new Map(progress.map(p => [p.module_id, p]));

  function getModuleStatus(moduleId: string): 'not_started' | 'in_progress' | 'completed' {
    return progressMap.get(moduleId)?.status || 'not_started';
  }

  function getResumeScreenKey(moduleId: string): string | null {
    return progressMap.get(moduleId)?.current_screen_key || null;
  }

  // Find next unfinished module for "Continue" CTA
  const nextModule = modules.find(m => getModuleStatus(m.module_id) !== 'completed');
  const completedCount = modules.filter(m => getModuleStatus(m.module_id) === 'completed').length;
  const progressPct = modules.length > 0 ? (completedCount / modules.length) * 100 : 0;

  // ─── Module Player ──────────────────────────────────────
  if (activeModule) {
    const existingProg = progressMap.get(activeModule.module_id) || null;
    return (
      <ModuleContentPlayer
        moduleId={activeModule.module_id}
        moduleVersionId={activeModule.module_version_id}
        moduleTitle={activeModule.title}
        content={activeModule.content}
        estMinutes={activeModule.est_minutes}
        userId={userId}
        isLinked={isLinked}
        existingProgress={existingProg}
        resumeScreenKey={getResumeScreenKey(activeModule.module_id)}
        onClose={() => setActiveModule(null)}
        onComplete={() => {
          setActiveModule(null);
          loadAll();
        }}
      />
    );
  }

  // ─── Loading ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading your training…</p>
      </div>
    );
  }

  // ─── Empty state ────────────────────────────────────────
  if (modules.length === 0) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Parent Training</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your personalized learning journey.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3 shadow-soft">
          <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h3 className="font-display font-bold text-foreground">Curriculum Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Your training modules are being prepared. Once your agency publishes them, they'll appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  // ─── Curriculum Home ────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Parent Training</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Learn at your own pace. Each module builds on the last.
          </p>
        </div>
      </div>

      {/* Settings toggle */}
      <div className="flex items-center justify-between rounded-xl bg-muted/30 border border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Show more terms</span>
        </div>
        <Switch checked={showGlossary} onCheckedChange={setShowGlossary} />
      </div>
      {showGlossary && (
        <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 space-y-2 animate-fade-in">
          <p className="text-xs font-semibold text-primary">Quick Glossary</p>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-foreground">
            <div><span className="font-semibold">Function</span> — Why a behavior happens</div>
            <div><span className="font-semibold">Antecedent</span> — What happens before</div>
            <div><span className="font-semibold">Reinforcement</span> — What makes behavior continue</div>
            <div><span className="font-semibold">Replacement</span> — A better behavior to teach</div>
            <div><span className="font-semibold">Extinction burst</span> — Behavior gets worse before better</div>
            <div><span className="font-semibold">Generalization</span> — Using skills in new settings</div>
          </div>
        </div>
      )}

      {/* Overall progress */}
      <div className="rounded-2xl gradient-hero p-5 text-primary-foreground">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display text-lg font-bold">Foundations Path</h3>
            <p className="text-xs text-primary-foreground/70 mt-0.5">
              {completedCount} of {modules.length} modules complete
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/20">
            <span className="text-sm font-bold">{Math.round(progressPct)}%</span>
          </div>
        </div>
        <div className="h-2 rounded-full bg-primary-foreground/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary-foreground transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {nextModule && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => setActiveModule(nextModule)}
          >
            <Play className="h-3.5 w-3.5" />
            {getModuleStatus(nextModule.module_id) === 'in_progress' ? 'Resume' : 'Start Next Module'}
          </Button>
        )}
      </div>

      {/* Module list */}
      <div className="space-y-2">
        {modules.map((mod, idx) => {
          const status = getModuleStatus(mod.module_id);
          const isCompleted = status === 'completed';
          const isInProgress = status === 'in_progress';
          const screenCount = mod.content?.screens?.length || 0;
          const viewedCount = progressMap.get(mod.module_id)?.screens_viewed?.length || 0;

          return (
            <button
              key={mod.module_id}
              onClick={() => setActiveModule(mod)}
              className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                isCompleted
                  ? 'border-success/20 bg-success/5 hover:border-success/30'
                  : 'border-border bg-card shadow-card hover:border-primary/30 hover:shadow-soft'
              }`}
            >
              {/* Number / status icon */}
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isCompleted ? 'bg-success/10' :
                isInProgress ? 'bg-primary/10' :
                'bg-muted'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : isInProgress ? (
                  <Play className="h-5 w-5 text-primary" />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">{idx + 1}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">{mod.title}</p>
                {mod.short_description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{mod.short_description}</p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" /> {mod.est_minutes} min
                  </span>
                  {isInProgress && screenCount > 0 && (
                    <span className="text-[10px] text-primary font-semibold">
                      {viewedCount}/{screenCount} screens
                    </span>
                  )}
                  {isCompleted && (
                    <span className="flex items-center gap-0.5 text-[10px] text-success font-semibold">
                      <Sparkles className="h-3 w-3" /> Complete
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Linked status hint */}
      {!isLinked && (
        <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            💡 Your progress is saved on this device. Connect to an agency in Settings to sync across devices.
          </p>
        </div>
      )}
    </div>
  );
}
