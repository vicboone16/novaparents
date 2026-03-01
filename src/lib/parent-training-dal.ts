/**
 * Parent Training DAL
 * ───────────────────
 * Queries the Parent App's own academy schema:
 *   - public.academy_modules
 *   - public.academy_module_versions
 *   - public.academy_module_progress
 *   - public.academy_paths
 *   - public.academy_path_modules
 */

import { supabase } from '@/integrations/supabase/client';

// ─── Types ───────────────────────────────────────────────

export interface ParentModule {
  module_id: string;
  canonical_key: string | null;
  title: string;
  short_description: string | null;
  est_minutes: number;
  skill_tags: string[];
  suggested_tool: string | null;
  module_version_id: string;
  version_num: number;
  content: ModuleContent;
}

export interface ModuleScreen {
  key: string;
  type: 'intro' | 'teach' | 'examples' | 'misconceptions' | 'practice' | 'reflection' | 'close' | 'tip' | 'example';
  title: string;
  body?: string;
  bullets?: string[];
}

export interface ModuleContent {
  screens?: ModuleScreen[];
}

export interface TrainingProgress {
  id?: string;
  user_id: string;
  module_id: string;
  module_version_id: string | null;
  status: 'not_started' | 'in_progress' | 'completed';
  started_at: string | null;
  completed_at: string | null;
  xp_earned: number;
  reflection_response: string | null;
  screens_viewed: string[];
  current_screen_key: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TrainingPath {
  id: string;
  title: string;
  path_type: string;
  status: string;
}

export interface TrainingPathModule {
  id: string;
  path_id: string;
  module_id: string;
  sort_order: number;
  requirement: string;
  prereq_module_id: string | null;
}

export interface TrainingAssignment {
  id: string;
  module_id: string;
  module_version_id: string | null;
  user_id: string;
  status: string;
  note: string | null;
}

// ─── Local Progress Store (fallback) ─────────────────────

const LOCAL_PROGRESS_KEY = 'bd_parent_training_progress';

function getLocalProgress(): Record<string, TrainingProgress> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PROGRESS_KEY) || '{}');
  } catch { return {}; }
}

function saveLocalProgress(map: Record<string, TrainingProgress>) {
  localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(map));
}

export function getLocalProgressForModule(moduleId: string): TrainingProgress | null {
  const map = getLocalProgress();
  return map[moduleId] || null;
}

export function saveLocalProgressForModule(progress: TrainingProgress) {
  const map = getLocalProgress();
  map[progress.module_id] = { ...progress, updated_at: new Date().toISOString() };
  saveLocalProgress(map);
}

export function getAllLocalProgress(): TrainingProgress[] {
  return Object.values(getLocalProgress());
}

// ─── Modules (published, system scope) ───────────────────

export async function getPublishedModules(): Promise<ParentModule[]> {
  // Fetch active system modules
  const { data: modules, error: modErr } = await (supabase as any)
    .from('academy_modules')
    .select('id, canonical_key, title, short_description, est_minutes, skill_tags, suggested_tool')
    .eq('status', 'active')
    .eq('scope', 'system')
    .order('created_at', { ascending: true });

  if (modErr || !modules?.length) {
    console.warn('[ParentTraining DAL] getModules:', modErr?.message || 'no modules');
    return [];
  }

  // Fetch published versions for these modules
  const moduleIds = modules.map((m: any) => m.id);
  const { data: versions, error: verErr } = await (supabase as any)
    .from('academy_module_versions')
    .select('id, module_id, version_num, content')
    .eq('status', 'published')
    .in('module_id', moduleIds)
    .order('version_num', { ascending: false });

  if (verErr) {
    console.warn('[ParentTraining DAL] getVersions:', verErr.message);
  }

  // Map module_id → latest published version
  const versionMap = new Map<string, any>();
  for (const v of (versions || [])) {
    if (!versionMap.has(v.module_id)) {
      versionMap.set(v.module_id, v);
    }
  }

  // Join modules with their published version content
  return modules
    .map((m: any) => {
      const v = versionMap.get(m.id);
      if (!v) return null;
      return {
        module_id: m.id,
        canonical_key: m.canonical_key,
        title: m.title,
        short_description: m.short_description,
        est_minutes: m.est_minutes,
        skill_tags: m.skill_tags || [],
        suggested_tool: m.suggested_tool,
        module_version_id: v.id,
        version_num: v.version_num,
        content: v.content || { screens: [] },
      } as ParentModule;
    })
    .filter(Boolean) as ParentModule[];
}

// ─── Progress (DB) ───────────────────────────────────────

export async function getMyTrainingProgress(userId: string): Promise<TrainingProgress[]> {
  const { data, error } = await (supabase as any)
    .from('academy_module_progress')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.warn('[ParentTraining DAL] getProgress:', error.message);
    return getAllLocalProgress().filter(p => p.user_id === userId);
  }
  return data || [];
}

export async function upsertTrainingProgress(
  p: Partial<TrainingProgress>,
  isLinked: boolean
): Promise<TrainingProgress | null> {
  // Always save locally
  if (p.module_id && p.user_id) {
    saveLocalProgressForModule(p as TrainingProgress);
  }

  // If agency-linked, also save to DB
  if (isLinked) {
    const { data, error } = await (supabase as any)
      .from('academy_module_progress')
      .upsert(
        { ...p, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,module_id' }
      )
      .select()
      .single();

    if (error) {
      console.warn('[ParentTraining DAL] upsertProgress:', error.message);
      return p as TrainingProgress;
    }
    return data;
  }

  return p as TrainingProgress;
}

// ─── Paths ───────────────────────────────────────────────

export async function getTrainingPaths(): Promise<TrainingPath[]> {
  const { data, error } = await (supabase as any)
    .from('academy_paths')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) {
    console.info('[ParentTraining DAL] No paths:', error.message);
    return [];
  }
  return data || [];
}

export async function getTrainingPathModules(pathId: string): Promise<TrainingPathModule[]> {
  const { data, error } = await (supabase as any)
    .from('academy_path_modules')
    .select('*')
    .eq('path_id', pathId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.info('[ParentTraining DAL] No path_modules:', error.message);
    return [];
  }
  return data || [];
}

// ─── Sync local progress to DB ───────────────────────────

export async function syncLocalProgressToDb(userId: string): Promise<number> {
  const local = getAllLocalProgress().filter(p => p.user_id === userId);
  let synced = 0;

  for (const p of local) {
    const { error } = await (supabase as any)
      .from('academy_module_progress')
      .upsert(
        { ...p, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,module_id' }
      );
    if (!error) synced++;
  }

  return synced;
}
