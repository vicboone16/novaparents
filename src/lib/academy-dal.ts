/**
 * Academy DAL — CRUD for academy_modules, versions, paths, assignments, rules, progress
 * All operations routed through novatrack-proxy to Nova Core.
 */

import { proxyQuery } from '@/lib/dal';

// ─── Types ───────────────────────────────────────────

export interface AcademyModule {
  id: string;
  scope: 'system' | 'agency';
  agency_id: string | null;
  status: 'active' | 'archived';
  audience: 'coach' | 'staff' | 'mixed';
  canonical_key: string | null;
  title: string;
  short_description: string | null;
  est_minutes: number;
  skill_tags: string[];
  suggested_tool: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModuleVersion {
  id: string;
  module_id: string;
  version_num: number;
  status: 'draft' | 'published' | 'archived';
  content: any;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcademyPath {
  id: string;
  title: string;
  path_type: 'system_default' | 'agency' | 'coach' | 'learner';
  agency_id: string | null;
  target_coach_id: string | null;
  target_learner_id: string | null;
  status: 'active' | 'archived';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PathModule {
  id: string;
  path_id: string;
  module_id: string;
  sort_order: number;
  requirement: 'required' | 'recommended' | 'optional';
  prereq_module_id: string | null;
  unlocks_tool: string | null;
  created_at: string;
}

export interface ModuleAssignment {
  id: string;
  module_id: string;
  module_version_id: string | null;
  coach_user_id: string;
  learner_id: string | null;
  agency_id: string | null;
  status: 'assigned' | 'in_progress' | 'completed' | 'removed';
  due_date: string | null;
  reminder_cadence: string | null;
  note_to_coach: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModuleRule {
  id: string;
  module_id: string;
  agency_id: string | null;
  coach_user_id: string | null;
  learner_id: string | null;
  visibility: 'visible' | 'hidden';
  requirement_override: string | null;
  min_translator_runs: number;
  min_lab_games_completed: number;
  min_modules_completed: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModuleProgress {
  id: string;
  user_id: string;
  module_id: string;
  module_version_id: string | null;
  status: 'not_started' | 'in_progress' | 'completed';
  started_at: string | null;
  completed_at: string | null;
  xp_earned: number;
  reflection_response: string | null;
  practice_results: any[];
  screens_viewed: string[];
  created_at: string;
  updated_at: string;
}

// ─── Modules ─────────────────────────────────────────────

export async function getModules(filters?: { scope?: string; status?: string }): Promise<AcademyModule[]> {
  try {
    const eq_filters: Array<{ col: string; val: unknown }> = [];
    if (filters?.scope) eq_filters.push({ col: 'scope', val: filters.scope });
    if (filters?.status) eq_filters.push({ col: 'status', val: filters.status });

    const data = await proxyQuery({
      table: 'academy_modules',
      operation: 'select',
      eq_filters,
      order: [{ col: 'updated_at', ascending: false }],
    });
    return data || [];
  } catch (err) { console.error('[Academy DAL] getModules:', err); return []; }
}

export async function createModule(mod: Partial<AcademyModule>): Promise<AcademyModule | null> {
  try {
    const data = await proxyQuery({
      table: 'academy_modules',
      operation: 'insert',
      data: mod as Record<string, unknown>,
      single: true,
    });
    return data;
  } catch (err) { console.error('[Academy DAL] createModule:', err); return null; }
}

export async function updateModule(id: string, updates: Partial<AcademyModule>): Promise<AcademyModule | null> {
  try {
    const data = await proxyQuery({
      table: 'academy_modules',
      operation: 'update',
      eq_filters: [{ col: 'id', val: id }],
      data: { ...updates, updated_at: new Date().toISOString() },
    });
    return data?.[0] || null;
  } catch (err) { console.error('[Academy DAL] updateModule:', err); return null; }
}

// ─── Versions ────────────────────────────────────────────

export async function getVersions(moduleId: string): Promise<ModuleVersion[]> {
  try {
    const data = await proxyQuery({
      table: 'academy_module_versions',
      operation: 'select',
      eq_filters: [{ col: 'module_id', val: moduleId }],
      order: [{ col: 'version_num', ascending: false }],
    });
    return data || [];
  } catch (err) { console.error('[Academy DAL] getVersions:', err); return []; }
}

export async function createVersion(v: Partial<ModuleVersion>): Promise<ModuleVersion | null> {
  try {
    const data = await proxyQuery({
      table: 'academy_module_versions',
      operation: 'insert',
      data: v as Record<string, unknown>,
      single: true,
    });
    return data;
  } catch (err) { console.error('[Academy DAL] createVersion:', err); return null; }
}

export async function updateVersion(id: string, updates: Partial<ModuleVersion>): Promise<ModuleVersion | null> {
  try {
    const data = await proxyQuery({
      table: 'academy_module_versions',
      operation: 'update',
      eq_filters: [{ col: 'id', val: id }],
      data: { ...updates, updated_at: new Date().toISOString() },
    });
    return data?.[0] || null;
  } catch (err) { console.error('[Academy DAL] updateVersion:', err); return null; }
}

// ─── Paths ───────────────────────────────────────────────

export async function getPaths(): Promise<AcademyPath[]> {
  try {
    const data = await proxyQuery({
      table: 'academy_paths',
      operation: 'select',
      order: [{ col: 'updated_at', ascending: false }],
    });
    return data || [];
  } catch (err) { console.error('[Academy DAL] getPaths:', err); return []; }
}

export async function createPath(p: Partial<AcademyPath>): Promise<AcademyPath | null> {
  try {
    const data = await proxyQuery({
      table: 'academy_paths',
      operation: 'insert',
      data: p as Record<string, unknown>,
      single: true,
    });
    return data;
  } catch (err) { console.error('[Academy DAL] createPath:', err); return null; }
}

export async function updatePath(id: string, updates: Partial<AcademyPath>): Promise<AcademyPath | null> {
  try {
    const data = await proxyQuery({
      table: 'academy_paths',
      operation: 'update',
      eq_filters: [{ col: 'id', val: id }],
      data: { ...updates, updated_at: new Date().toISOString() },
    });
    return data?.[0] || null;
  } catch (err) { console.error('[Academy DAL] updatePath:', err); return null; }
}

export async function getPathModules(pathId: string): Promise<PathModule[]> {
  try {
    const data = await proxyQuery({
      table: 'academy_path_modules',
      operation: 'select',
      eq_filters: [{ col: 'path_id', val: pathId }],
      order: [{ col: 'sort_order', ascending: true }],
    });
    return data || [];
  } catch (err) { console.error('[Academy DAL] getPathModules:', err); return []; }
}

export async function setPathModules(pathId: string, modules: Partial<PathModule>[]): Promise<boolean> {
  try {
    await proxyQuery({
      table: 'academy_path_modules',
      operation: 'delete',
      eq_filters: [{ col: 'path_id', val: pathId }],
    });
    if (modules.length === 0) return true;
    const rows = modules.map((m, i) => ({ ...m, path_id: pathId, sort_order: i }));
    await proxyQuery({
      table: 'academy_path_modules',
      operation: 'insert',
      data: rows as Record<string, unknown>[],
    });
    return true;
  } catch (err) { console.error('[Academy DAL] setPathModules:', err); return false; }
}

// ─── Assignments ─────────────────────────────────────────

export async function getAssignments(filters?: { coach_user_id?: string; status?: string }): Promise<ModuleAssignment[]> {
  try {
    const eq_filters: Array<{ col: string; val: unknown }> = [];
    if (filters?.coach_user_id) eq_filters.push({ col: 'coach_user_id', val: filters.coach_user_id });
    if (filters?.status) eq_filters.push({ col: 'status', val: filters.status });

    const data = await proxyQuery({
      table: 'academy_module_assignments',
      operation: 'select',
      eq_filters,
      order: [{ col: 'created_at', ascending: false }],
    });
    return data || [];
  } catch (err) { console.error('[Academy DAL] getAssignments:', err); return []; }
}

export async function createAssignment(a: Partial<ModuleAssignment>): Promise<ModuleAssignment | null> {
  try {
    const data = await proxyQuery({
      table: 'academy_module_assignments',
      operation: 'insert',
      data: a as Record<string, unknown>,
      single: true,
    });
    return data;
  } catch (err) { console.error('[Academy DAL] createAssignment:', err); return null; }
}

export async function updateAssignment(id: string, updates: Partial<ModuleAssignment>): Promise<ModuleAssignment | null> {
  try {
    const data = await proxyQuery({
      table: 'academy_module_assignments',
      operation: 'update',
      eq_filters: [{ col: 'id', val: id }],
      data: { ...updates, updated_at: new Date().toISOString() },
    });
    return data?.[0] || null;
  } catch (err) { console.error('[Academy DAL] updateAssignment:', err); return null; }
}

// ─── Rules ───────────────────────────────────────────────

export async function getRules(): Promise<ModuleRule[]> {
  try {
    const data = await proxyQuery({
      table: 'academy_module_rules',
      operation: 'select',
      order: [{ col: 'created_at', ascending: false }],
    });
    return data || [];
  } catch (err) { console.error('[Academy DAL] getRules:', err); return []; }
}

export async function createRule(r: Partial<ModuleRule>): Promise<ModuleRule | null> {
  try {
    const data = await proxyQuery({
      table: 'academy_module_rules',
      operation: 'insert',
      data: r as Record<string, unknown>,
      single: true,
    });
    return data;
  } catch (err) { console.error('[Academy DAL] createRule:', err); return null; }
}

export async function updateRule(id: string, updates: Partial<ModuleRule>): Promise<ModuleRule | null> {
  try {
    const data = await proxyQuery({
      table: 'academy_module_rules',
      operation: 'update',
      eq_filters: [{ col: 'id', val: id }],
      data: { ...updates, updated_at: new Date().toISOString() },
    });
    return data?.[0] || null;
  } catch (err) { console.error('[Academy DAL] updateRule:', err); return null; }
}

export async function deleteRule(id: string): Promise<boolean> {
  try {
    await proxyQuery({
      table: 'academy_module_rules',
      operation: 'delete',
      eq_filters: [{ col: 'id', val: id }],
    });
    return true;
  } catch (err) { console.error('[Academy DAL] deleteRule:', err); return false; }
}

// ─── Progress ────────────────────────────────────────────

export async function getMyProgress(userId: string): Promise<ModuleProgress[]> {
  try {
    const data = await proxyQuery({
      table: 'academy_module_progress',
      operation: 'select',
      eq_filters: [{ col: 'user_id', val: userId }],
    });
    return data || [];
  } catch (err) { console.error('[Academy DAL] getMyProgress:', err); return []; }
}

export async function upsertProgress(p: Partial<ModuleProgress>): Promise<ModuleProgress | null> {
  try {
    const data = await proxyQuery({
      table: 'academy_module_progress',
      operation: 'upsert',
      data: { ...p, updated_at: new Date().toISOString() } as Record<string, unknown>,
      on_conflict: 'user_id,module_id',
      single: true,
    });
    return data;
  } catch (err) { console.error('[Academy DAL] upsertProgress:', err); return null; }
}
