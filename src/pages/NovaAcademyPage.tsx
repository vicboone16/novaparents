/**
 * Nova Academy™ — DB-Backed Coach View
 * ─────────────────────────────────────
 * Fetches modules, paths, progress, assignments from the database.
 * No mock/local data.
 */

import { useState, useEffect } from 'react';
import { BookOpen, Flame, Star, ChevronRight, CheckCircle2, Lock, Play, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/dal';
import {
  getModules, getPaths, getPathModules, getMyProgress, getAssignments, getVersions,
  type AcademyModule, type AcademyPath, type PathModule, type ModuleProgress, type ModuleAssignment, type ModuleVersion,
} from '@/lib/academy-dal';
import { ModuleContentPlayer } from '@/components/ModuleContentPlayer';

const GROWTH_LEVELS = [
  { level: 1, name: 'Observer', xp: 0, emoji: '👀' },
  { level: 2, name: 'Behavior Detective', xp: 100, emoji: '🔍' },
  { level: 3, name: 'Reinforcement Reader', xp: 250, emoji: '📖' },
  { level: 4, name: 'Pattern Spotter', xp: 500, emoji: '🧩' },
  { level: 5, name: 'Confident Coach', xp: 1000, emoji: '🌟' },
];

export default function NovaAcademyPage() {
  const [userId, setUserId] = useState('');
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [paths, setPaths] = useState<AcademyPath[]>([]);
  const [pathModules, setPathModules] = useState<Record<string, PathModule[]>>({});
  const [progress, setProgress] = useState<ModuleProgress[]>([]);
  const [assignments, setAssignments] = useState<ModuleAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Active states
  const [activePath, setActivePath] = useState<AcademyPath | null>(null);
  const [activeModule, setActiveModule] = useState<AcademyModule | null>(null);
  const [activeVersionContent, setActiveVersionContent] = useState<any>(null);
  const [activeVersionId, setActiveVersionId] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const user = await getCurrentUser();
    if (!user) return;
    setUserId(user.id);

    const [mods, pts, prog, assigns] = await Promise.all([
      getModules({ status: 'active' }),
      getPaths(),
      getMyProgress(user.id),
      getAssignments({ coach_user_id: user.id }),
    ]);
    setModules(mods);
    setPaths(pts.filter(p => p.status === 'active'));
    setProgress(prog);
    setAssignments(assigns.filter(a => a.status !== 'removed'));

    // Load path modules for each path
    const pmMap: Record<string, PathModule[]> = {};
    for (const path of pts) {
      pmMap[path.id] = await getPathModules(path.id);
    }
    setPathModules(pmMap);
    setLoading(false);
  }

  // Computed values
  const progressMap = new Map(progress.map(p => [p.module_id, p]));
  const totalXp = progress.reduce((sum, p) => sum + (p.xp_earned || 0), 0);
  const completedCount = progress.filter(p => p.status === 'completed').length;
  const currentLevel = [...GROWTH_LEVELS].reverse().find(l => totalXp >= l.xp) || GROWTH_LEVELS[0];
  const nextLevel = GROWTH_LEVELS.find(l => l.xp > totalXp);
  const levelProgress = nextLevel ? (totalXp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp) : 1;

  // Get assigned module IDs
  const assignedModuleIds = new Set(assignments.map(a => a.module_id));

  // Find next recommended module
  function getNextModule(): { module: AcademyModule; pathTitle: string } | null {
    for (const path of paths) {
      const pms = pathModules[path.id] || [];
      for (const pm of pms.sort((a, b) => a.sort_order - b.sort_order)) {
        const mod = modules.find(m => m.id === pm.module_id);
        const prog = progressMap.get(pm.module_id);
        if (mod && (!prog || prog.status !== 'completed')) {
          return { module: mod, pathTitle: path.title };
        }
      }
    }
    return null;
  }

  async function openModule(mod: AcademyModule) {
    // Find assigned version or latest published
    const assignment = assignments.find(a => a.module_id === mod.id);
    const versions = await getVersions(mod.id);
    let version: ModuleVersion | undefined;

    if (assignment?.module_version_id) {
      version = versions.find(v => v.id === assignment.module_version_id);
    }
    if (!version) {
      version = versions.find(v => v.status === 'published');
    }

    if (!version || !version.content || Object.keys(version.content).length === 0) {
      // No content available — show placeholder
      setActiveModule(mod);
      setActiveVersionContent(null);
      setActiveVersionId('');
      return;
    }

    setActiveModule(mod);
    setActiveVersionContent(version.content);
    setActiveVersionId(version.id);
  }

  // ─── Content Player ────────────────────────────────
  if (activeModule && activeVersionContent) {
    const existingProg = progressMap.get(activeModule.id) || null;
    return (
      <ModuleContentPlayer
        moduleId={activeModule.id}
        moduleVersionId={activeVersionId}
        moduleTitle={activeModule.title}
        content={activeVersionContent}
        estMinutes={activeModule.est_minutes}
        userId={userId}
        existingProgress={existingProg}
        onClose={() => { setActiveModule(null); setActiveVersionContent(null); }}
        onComplete={() => {
          setActiveModule(null);
          setActiveVersionContent(null);
          loadAll();
        }}
      />
    );
  }

  // ─── Module placeholder (no content yet) ───────────
  if (activeModule && !activeVersionContent) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => setActiveModule(null)} className="flex items-center gap-1 text-sm text-primary font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back to Academy
        </button>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
          <h3 className="font-display font-bold text-foreground text-lg">{activeModule.title}</h3>
          <p className="text-sm text-muted-foreground">{activeModule.short_description}</p>
          <p className="text-xs text-muted-foreground">Content is being prepared. Check back soon!</p>
        </div>
      </div>
    );
  }

  // ─── Path detail view ──────────────────────────────
  if (activePath) {
    const pms = (pathModules[activePath.id] || []).sort((a, b) => a.sort_order - b.sort_order);
    const pathMods = pms.map(pm => modules.find(m => m.id === pm.module_id)).filter(Boolean) as AcademyModule[];
    const pathComplete = pathMods.filter(m => progressMap.get(m.id)?.status === 'completed').length;

    return (
      <div className="space-y-4 animate-fade-in">
        <button onClick={() => setActivePath(null)} className="flex items-center gap-1 text-sm text-primary font-semibold">
          <ArrowLeft className="h-4 w-4" /> All Paths
        </button>

        <div className="rounded-2xl gradient-hero p-5 text-primary-foreground">
          <h3 className="font-display text-xl font-bold">{activePath.title}</h3>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 h-2 rounded-full bg-primary-foreground/20 overflow-hidden">
              <div className="h-full rounded-full bg-primary-foreground transition-all duration-500" style={{ width: `${pathMods.length > 0 ? (pathComplete / pathMods.length) * 100 : 0}%` }} />
            </div>
            <span className="text-xs font-bold">{pathComplete}/{pathMods.length}</span>
          </div>
        </div>

        <div className="space-y-2">
          {pathMods.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No modules in this path yet.</p>
          )}
          {pathMods.map((mod, i) => {
            const prog = progressMap.get(mod.id);
            const done = prog?.status === 'completed';
            const inProgress = prog?.status === 'in_progress';
            const pm = pms[i];
            // Check prereq
            const prereqMet = !pm.prereq_module_id || progressMap.get(pm.prereq_module_id)?.status === 'completed';
            const prevDone = i === 0 || progressMap.get(pathMods[i - 1].id)?.status === 'completed';
            const locked = !done && !inProgress && !prevDone && !prereqMet;

            return (
              <button
                key={mod.id}
                onClick={() => !locked && openModule(mod)}
                disabled={locked}
                className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                  done ? 'border-success/20 bg-success/5' :
                  locked ? 'border-border bg-muted/30 opacity-50' :
                  'border-border bg-card shadow-card hover:border-primary/30'
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  done ? 'bg-success/10' : locked ? 'bg-muted' : 'bg-primary/10'
                }`}>
                  {done ? <CheckCircle2 className="h-4 w-4 text-success" /> :
                   locked ? <Lock className="h-4 w-4 text-muted-foreground" /> :
                   <Play className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{mod.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{mod.short_description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{mod.est_minutes} min</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                      pm.requirement === 'required' ? 'bg-primary/10 text-primary' :
                      pm.requirement === 'recommended' ? 'bg-warning/10 text-warning' :
                      'bg-muted text-muted-foreground'
                    }`}>{pm.requirement}</span>
                  </div>
                </div>
                {!locked && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Academy home ──────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground animate-pulse">Loading Academy…</p>
      </div>
    );
  }

  const nextMod = getNextModule();
  const assignedMods = modules.filter(m => assignedModuleIds.has(m.id) && progressMap.get(m.id)?.status !== 'completed');
  const completedMods = modules.filter(m => progressMap.get(m.id)?.status === 'completed');

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center space-y-1">
        <h2 className="font-display text-2xl font-bold text-foreground">Nova Academy™</h2>
        <p className="text-sm text-muted-foreground">Small skills. Big shifts.</p>
      </div>

      {/* Progress ring + stats */}
      <div className="rounded-2xl gradient-hero p-5 text-primary-foreground">
        <div className="flex items-center gap-5">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-20" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeDasharray={`${Math.min(levelProgress, 1) * 94.2} 94.2`}
                strokeLinecap="round" />
            </svg>
            <div className="text-center">
              <p className="font-display text-lg font-bold leading-none">L{currentLevel.level}</p>
              <p className="text-[9px] opacity-80">{Math.round(levelProgress * 100)}%</p>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold">{currentLevel.emoji} {currentLevel.name}</p>
            <div className="flex gap-4">
              <div>
                <p className="font-display text-xl font-bold">{totalXp}</p>
                <p className="text-[10px] opacity-80">XP</p>
              </div>
              <div>
                <p className="font-display text-xl font-bold">{completedCount}</p>
                <p className="text-[10px] opacity-80">Done</p>
              </div>
            </div>
            {nextLevel && (
              <p className="text-[10px] opacity-70">{nextLevel.xp - totalXp} XP to {nextLevel.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Your Next Step */}
      {nextMod && (
        <button
          onClick={() => openModule(nextMod.module)}
          className="w-full rounded-xl border border-primary/20 bg-card p-4 shadow-soft flex items-center gap-3 hover:bg-primary/5 transition-all text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Play className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-primary font-semibold uppercase">Your Next Step</p>
            <p className="text-sm font-semibold text-foreground truncate">{nextMod.module.title}</p>
            <p className="text-[10px] text-muted-foreground">{nextMod.pathTitle} · {nextMod.module.est_minutes} min</p>
          </div>
          <ChevronRight className="h-4 w-4 text-primary shrink-0" />
        </button>
      )}

      {/* Assigned to You */}
      {assignedMods.length > 0 && (
        <div>
          <h3 className="font-display text-sm font-bold text-foreground mb-2">Assigned to You</h3>
          <div className="space-y-2">
            {assignedMods.map(mod => {
              const assignment = assignments.find(a => a.module_id === mod.id);
              return (
                <button
                  key={mod.id}
                  onClick={() => openModule(mod)}
                  className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card hover:border-primary/30 transition-all text-left"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/10">
                    <Star className="h-4 w-4 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{mod.title}</p>
                    {assignment?.note_to_coach && (
                      <p className="text-[10px] text-secondary italic">From your support team: "{assignment.note_to_coach}"</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">{mod.est_minutes} min</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Learning Paths */}
      {paths.length > 0 && (
        <div>
          <h3 className="font-display text-sm font-bold text-foreground mb-3">Learning Paths</h3>
          <div className="space-y-2">
            {paths.map(path => {
              const pms = pathModules[path.id] || [];
              const pathMods = pms.map(pm => modules.find(m => m.id === pm.module_id)).filter(Boolean);
              const done = pathMods.filter(m => progressMap.get(m!.id)?.status === 'completed').length;
              const total = pathMods.length;
              const pct = total > 0 ? (done / total) * 100 : 0;

              return (
                <button
                  key={path.id}
                  onClick={() => setActivePath(path)}
                  className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card hover:border-primary/30 hover:shadow-soft transition-all text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{path.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-semibold">{done}/{total}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed */}
      {completedMods.length > 0 && (
        <div>
          <h3 className="font-display text-sm font-bold text-foreground mb-2">Completed</h3>
          <div className="space-y-1.5">
            {completedMods.map(mod => (
              <div key={mod.id} className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 p-3">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <p className="text-sm text-foreground flex-1">{mod.title}</p>
                <span className="text-[10px] text-success font-semibold">+{10 + mod.est_minutes} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {modules.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">Modules will appear here once your support team sets up your learning path.</p>
        </div>
      )}
    </div>
  );
}
