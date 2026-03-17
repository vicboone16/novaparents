/**
 * Data Access Layer (DAL)
 * ──────────────────────
 * All reads/writes to the Nova Core backend flow through the satellite-gateway edge function
 * hosted on the Nova Core project. Auth is handled via the user's local JWT.
 *
 * Rules:
 *  - Only access parent-safe surfaces.
 *  - Never touch raw clinical tables.
 */

import { supabase } from '@/integrations/supabase/client';

// ─── Nova Core connection ───────────────────────────────

const NOVA_CORE_URL = 'https://yboqqmkghwhlhhnsegje.supabase.co';
const NOVA_CORE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlib3FxbWtnaHdobGhobnNlZ2plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDc4ODMsImV4cCI6MjA4NTEyMzg4M30.F2RPn-0nNx6sqje7P7W2Jfz9mXAXBFNy6xzbV4vf-Fs';

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function callGateway(body: Record<string, unknown>): Promise<any> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: NOVA_CORE_ANON_KEY,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${NOVA_CORE_URL}/functions/v1/satellite-gateway`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gateway error ${res.status}: ${text}`);
  }

  return res.json();
}

// ─── Public helpers (same API surface as before) ────────

export async function callNovaTrackProxy(action: string, params?: Record<string, unknown>) {
  return callGateway({ action, params });
}

/**
 * Generic CRUD helper — routes through the gateway's "query" action.
 * Returns the `data` field from the response.
 */
export async function proxyQuery(params: {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
  eq_filters?: Array<{ col: string; val: unknown }>;
  in_filters?: Array<{ col: string; vals: unknown[] }>;
  data?: Record<string, unknown> | Record<string, unknown>[];
  order?: Array<{ col: string; ascending?: boolean }>;
  limit?: number;
  single?: boolean;
  maybe_single?: boolean;
  on_conflict?: string;
  select_columns?: string;
}): Promise<any> {
  const result = await callGateway({ action: 'query', ...params });
  if (result?.error) throw new Error(result.error);
  return result?.data ?? result;
}

/**
 * RPC helper — routes through the gateway's "rpc" action.
 */
export async function proxyRpc(rpcName: string, rpcParams?: Record<string, unknown>): Promise<any> {
  const result = await callGateway({
    action: 'rpc',
    rpc_name: rpcName,
    rpc_params: rpcParams || {},
  });
  if (result?.error) throw new Error(result.error);
  return result?.data ?? result;
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
  const result = await callGateway({ action: 'check_handshake' });
  return { appSlug: result?.app_slug ?? null };
}

// ─── App Access Gating ──────────────────────────────────

export interface AppAccess {
  hasAccess: boolean;
  role: string | null;
}

export async function checkAppAccess(): Promise<AppAccess> {
  try {
    const result = await callGateway({ action: 'check_app_access' });
    return {
      hasAccess: result?.hasAccess === true,
      role: result?.role ?? null,
    };
  } catch (err) {
    console.warn('[DAL] check_app_access error:', err);
    return { hasAccess: false, role: null };
  }
}

// ─── Diagnostics ─────────────────────────────────────────

export function getMaskedBackendUrl(): string {
  return NOVA_CORE_URL.replace(/https:\/\/([a-z]{4})[^.]*/, 'https://$1****');
}

// ─── Clients (parent-safe) ───────────────────────────────

export interface ClientSummary {
  id: string;
  first_name: string;
  last_name: string;
}

export async function getMyClients(): Promise<ClientSummary[]> {
  try {
    const result = await callGateway({ action: 'get_my_clients' });
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

import { SEED_LIBRARY } from './dal-seed-library';

export async function getReplacementBehaviors(): Promise<ReplacementBehavior[]> {
  // parent_safe_replacement_behaviors table is not yet provisioned on Nova Core.
  // Use local seed library to avoid unnecessary 400 errors on every page load.
  return SEED_LIBRARY;
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
