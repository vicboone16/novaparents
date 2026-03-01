/**
 * Nova Academy™ — DB-Backed Coach View
 * ─────────────────────────────────────
 * Shows the Learn modules (CurriculumPage) as the primary view,
 * plus DB-backed paths, assignments, and the module content player.
 */

import { useState, useEffect } from 'react';
import { BookOpen, Star, ChevronRight, CheckCircle2, Lock, Play, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/dal';
import {
  getModules, getPaths, getPathModules, getMyProgress, getAssignments, getVersions,
  type AcademyModule, type AcademyPath, type PathModule, type ModuleProgress, type ModuleAssignment, type ModuleVersion,
} from '@/lib/academy-dal';
import { ModuleContentPlayer } from '@/components/ModuleContentPlayer';
import CurriculumPage from './CurriculumPage';

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

    const pmMap: Record<string, PathModule[]> = {};
    for (const path of pts) {
      pmMap[path.id] = await getPathModules(path.id);
    }
    setPathModules(pmMap);
    setLoading(false);
  }

  // Computed values
  const progressMap = new Map(progress.map(p => [p.module_id, p]));
  const assignedModuleIds = new Set(assignments.map(a => a.module_id));

  async function openModule(mod: AcademyModule) {
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

  // ─── Loading ───────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground animate-pulse">Loading Academy…</p>
      </div>
    );
  }

  // ─── Academy home — modules + paths ────────────────
  const assignedMods = modules.filter(m => assignedModuleIds.has(m.id) && progressMap.get(m.id)?.status !== 'completed');

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Nova Academy™</h2>
        <p className="mt-1 text-sm text-muted-foreground">Small skills. Big shifts.</p>
      </div>

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

      {/* Learn Modules (CurriculumPage) */}
      <CurriculumPage />

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
    </div>
  );
}
