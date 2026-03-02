/**
 * Data Access Layer (DAL)
 * ──────────────────────
 * All reads/writes to the backend flow through this module.
 * Uses an edge function proxy to access the shared NovaTrack backend
 * for cross-app tables (handshake, access gating, students).
 *
 * Rules:
 *  - Only access parent-safe surfaces.
 *  - Never touch raw clinical tables.
 */

import { supabase } from '@/integrations/supabase/client';

// ─── NovaTrack Proxy helper ─────────────────────────────

async function callNovaTrackProxy(action: string, params?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('novatrack-proxy', {
    body: { action, params },
  });

  if (error) throw new Error(error.message || 'Proxy call failed');
  return data;
}

// ─── Auth helpers ────────────────────────────────────────

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}

// ─── Backend Guard ───────────────────────────────────────

export async function checkHandshake(): Promise<{ appSlug: string | null }> {
  const result = await callNovaTrackProxy('check_handshake');
  return { appSlug: result?.app_slug ?? null };
}

// ─── App Access Gating ──────────────────────────────────

export interface AppAccess {
  hasAccess: boolean;
  role: string | null;
}

export async function checkAppAccess(): Promise<AppAccess> {
  try {
    const result = await callNovaTrackProxy('check_app_access');
    return {
      hasAccess: result?.hasAccess === true,
      role: result?.role ?? null,
    };
  } catch (err) {
    console.warn('[DAL] check_app_access proxy error:', err);
    return { hasAccess: false, role: null };
  }
}

// ─── Diagnostics ─────────────────────────────────────────

export function getMaskedBackendUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  return url.replace(/https:\/\/([a-z]{4})[^.]*/, 'https://$1****');
}

// ─── Clients (parent-safe) ───────────────────────────────

export interface ClientSummary {
  id: string;
  first_name: string;
  last_name: string;
}

/** Fetch learners the current user has access to via the NovaTrack proxy. */
export async function getMyClients(): Promise<ClientSummary[]> {
  try {
    const result = await callNovaTrackProxy('get_my_clients');
    return (result?.clients as ClientSummary[]) || [];
  } catch {
    return [];
  }
}

// ─── Replacement Behavior Library (parent-safe) ──────────

export interface ReplacementBehavior {
  id: string;
  trigger: string;
  function: 'attention' | 'escape' | 'tangible' | 'sensory';
  ageBand: string;
  setting: string;
  commLevel: string;
  definition: string;
  teachingSteps: string[];
  prompts: string[];
  reinforcement: string;
  generalization: string;
}

/** Seed data — expanded library covering all 4 functions × 3 age bands × 3 settings */
import { SEED_LIBRARY } from './dal-seed-library';

/**
 * Fetch replacement behaviors.
 * Tries parent_safe_replacement_behaviors first, falls back to seed data.
 */
export async function getReplacementBehaviors(): Promise<ReplacementBehavior[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('parent_safe_replacement_behaviors')
      .select('*');

    if (error || !data?.length) {
      console.info('[DAL] No DB library found, using seed data.');
      return SEED_LIBRARY;
    }

    return (data as any[]).map((row: any) => ({
      id: String(row.id),
      trigger: row.trigger || row.name || '',
      function: row.function_category || 'attention',
      ageBand: row.age_band || 'school-age',
      setting: row.setting || 'home',
      commLevel: row.comm_level || 'verbal',
      definition: row.definition || '',
      teachingSteps: row.teaching_steps || [],
      prompts: row.prompts || [],
      reinforcement: row.reinforcement || '',
      generalization: row.generalization || '',
    }));
  } catch {
    return SEED_LIBRARY;
  }
}

// ─── Behavior Logs (local-first for Phase 1) ─────────────

export interface BehaviorLogEntry {
  id: string;
  date: string;
  time: string;
  setting: string;
  antecedent: string;
  behavior: string;
  consequence: string;
  intensity: number;
  notes: string;
  createdAt: string;
}

const LOG_STORAGE_KEY = 'bd_behavior_logs';

export function getBehaviorLogs(): BehaviorLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveBehaviorLog(entry: Omit<BehaviorLogEntry, 'id' | 'createdAt'>): BehaviorLogEntry {
  const logs = getBehaviorLogs();
  const newEntry: BehaviorLogEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  logs.unshift(newEntry);
  localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
  return newEntry;
}

// ─── Curriculum Progress (local-first for Phase 1) ───────

const PROGRESS_KEY = 'bd_curriculum_progress';

export function getCurriculumProgress(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function markLessonComplete(lessonId: string) {
  const progress = getCurriculumProgress();
  progress[lessonId] = true;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}
