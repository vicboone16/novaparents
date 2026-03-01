/**
 * Academy DAL — CRUD for academy_modules, versions, paths, assignments, rules, progress
 */

import { supabase } from '@/integrations/supabase/client';

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
  let query = (supabase as any).from('academy_modules').select('*').order('updated_at', { ascending: false });
  if (filters?.scope) query = query.eq('scope', filters.scope);
  if (filters?.status) query = query.eq('status', filters.status);
  const { data, error } = await query;
  if (error) { console.error('[Academy DAL] getModules:', error); return []; }
  return data || [];
}

export async function createModule(mod: Partial<AcademyModule>): Promise<AcademyModule | null> {
  const { data, error } = await (supabase as any).from('academy_modules').insert(mod).select().single();
  if (error) { console.error('[Academy DAL] createModule:', error); return null; }
  return data;
}

export async function updateModule(id: string, updates: Partial<AcademyModule>): Promise<AcademyModule | null> {
  const { data, error } = await (supabase as any).from('academy_modules').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) { console.error('[Academy DAL] updateModule:', error); return null; }
  return data;
}

// ─── Versions ────────────────────────────────────────────

export async function getVersions(moduleId: string): Promise<ModuleVersion[]> {
  const { data, error } = await (supabase as any).from('academy_module_versions').select('*').eq('module_id', moduleId).order('version_num', { ascending: false });
  if (error) { console.error('[Academy DAL] getVersions:', error); return []; }
  return data || [];
}

export async function createVersion(v: Partial<ModuleVersion>): Promise<ModuleVersion | null> {
  const { data, error } = await (supabase as any).from('academy_module_versions').insert(v).select().single();
  if (error) { console.error('[Academy DAL] createVersion:', error); return null; }
  return data;
}

export async function updateVersion(id: string, updates: Partial<ModuleVersion>): Promise<ModuleVersion | null> {
  const { data, error } = await (supabase as any).from('academy_module_versions').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) { console.error('[Academy DAL] updateVersion:', error); return null; }
  return data;
}

// ─── Paths ───────────────────────────────────────────────

export async function getPaths(): Promise<AcademyPath[]> {
  const { data, error } = await (supabase as any).from('academy_paths').select('*').order('updated_at', { ascending: false });
  if (error) { console.error('[Academy DAL] getPaths:', error); return []; }
  return data || [];
}

export async function createPath(p: Partial<AcademyPath>): Promise<AcademyPath | null> {
  const { data, error } = await (supabase as any).from('academy_paths').insert(p).select().single();
  if (error) { console.error('[Academy DAL] createPath:', error); return null; }
  return data;
}

export async function updatePath(id: string, updates: Partial<AcademyPath>): Promise<AcademyPath | null> {
  const { data, error } = await (supabase as any).from('academy_paths').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) { console.error('[Academy DAL] updatePath:', error); return null; }
  return data;
}

export async function getPathModules(pathId: string): Promise<PathModule[]> {
  const { data, error } = await (supabase as any).from('academy_path_modules').select('*').eq('path_id', pathId).order('sort_order');
  if (error) { console.error('[Academy DAL] getPathModules:', error); return []; }
  return data || [];
}

export async function setPathModules(pathId: string, modules: Partial<PathModule>[]): Promise<boolean> {
  await (supabase as any).from('academy_path_modules').delete().eq('path_id', pathId);
  if (modules.length === 0) return true;
  const rows = modules.map((m, i) => ({ ...m, path_id: pathId, sort_order: i }));
  const { error } = await (supabase as any).from('academy_path_modules').insert(rows);
  if (error) { console.error('[Academy DAL] setPathModules:', error); return false; }
  return true;
}

// ─── Assignments ─────────────────────────────────────────

export async function getAssignments(filters?: { coach_user_id?: string; status?: string }): Promise<ModuleAssignment[]> {
  let query = (supabase as any).from('academy_module_assignments').select('*').order('created_at', { ascending: false });
  if (filters?.coach_user_id) query = query.eq('coach_user_id', filters.coach_user_id);
  if (filters?.status) query = query.eq('status', filters.status);
  const { data, error } = await query;
  if (error) { console.error('[Academy DAL] getAssignments:', error); return []; }
  return data || [];
}

export async function createAssignment(a: Partial<ModuleAssignment>): Promise<ModuleAssignment | null> {
  const { data, error } = await (supabase as any).from('academy_module_assignments').insert(a).select().single();
  if (error) { console.error('[Academy DAL] createAssignment:', error); return null; }
  return data;
}

export async function updateAssignment(id: string, updates: Partial<ModuleAssignment>): Promise<ModuleAssignment | null> {
  const { data, error } = await (supabase as any).from('academy_module_assignments').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) { console.error('[Academy DAL] updateAssignment:', error); return null; }
  return data;
}

// ─── Rules ───────────────────────────────────────────────

export async function getRules(): Promise<ModuleRule[]> {
  const { data, error } = await (supabase as any).from('academy_module_rules').select('*').order('created_at', { ascending: false });
  if (error) { console.error('[Academy DAL] getRules:', error); return []; }
  return data || [];
}

export async function createRule(r: Partial<ModuleRule>): Promise<ModuleRule | null> {
  const { data, error } = await (supabase as any).from('academy_module_rules').insert(r).select().single();
  if (error) { console.error('[Academy DAL] createRule:', error); return null; }
  return data;
}

export async function updateRule(id: string, updates: Partial<ModuleRule>): Promise<ModuleRule | null> {
  const { data, error } = await (supabase as any).from('academy_module_rules').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) { console.error('[Academy DAL] updateRule:', error); return null; }
  return data;
}

export async function deleteRule(id: string): Promise<boolean> {
  const { error } = await (supabase as any).from('academy_module_rules').delete().eq('id', id);
  if (error) { console.error('[Academy DAL] deleteRule:', error); return false; }
  return true;
}

// ─── Progress ────────────────────────────────────────────

export async function getMyProgress(userId: string): Promise<ModuleProgress[]> {
  const { data, error } = await (supabase as any).from('academy_module_progress').select('*').eq('user_id', userId);
  if (error) { console.error('[Academy DAL] getMyProgress:', error); return []; }
  return data || [];
}

export async function upsertProgress(p: Partial<ModuleProgress>): Promise<ModuleProgress | null> {
  const { data, error } = await (supabase as any).from('academy_module_progress').upsert(
    { ...p, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,module_id' }
  ).select().single();
  if (error) { console.error('[Academy DAL] upsertProgress:', error); return null; }
  return data;
}
