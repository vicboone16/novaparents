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
// URL and anon key are read from environment variables so they can be rotated
// without a code change.  Hardcoded fallbacks are kept for local dev only and
// must be removed before any public release.

const NOVA_CORE_URL =
  import.meta.env.VITE_NOVA_CORE_URL ||
  'https://yboqqmkghwhlhhnsegje.supabase.co';

const NOVA_CORE_ANON_KEY =
  import.meta.env.VITE_NOVA_CORE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlib3FxbWtnaHdobGhobnNlZ2plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDc4ODMsImV4cCI6MjA4NTEyMzg4M30.F2RPn-0nNx6sqje7P7W2Jfz9mXAXBFNy6xzbV4vf-Fs';

const GATEWAY_TIMEOUT_MS = 15_000;
const GATEWAY_RETRY_DELAYS_MS = [1_000, 2_000]; // two retries: 1s then 2s

// Maps HTTP status codes and known error strings to parent-friendly messages.
function friendlyGatewayError(status: number, raw: string): string {
  if (status === 401 || status === 403) return 'Your session has expired. Please sign in again.';
  if (status === 404) return 'The requested data could not be found.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'The server is temporarily unavailable. Please try again shortly.';
  if (raw.toLowerCase().includes('jwt')) return 'Your session has expired. Please sign in again.';
  return 'Something went wrong connecting to the server. Please try again.';
}

function isRetryableStatus(status: number): boolean {
  // Only retry server-side errors; client errors (4xx) are deterministic.
  return status >= 500;
}

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function attemptGateway(body: Record<string, unknown>): Promise<any> {
  const token = await getAuthToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: NOVA_CORE_ANON_KEY,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${NOVA_CORE_URL}/functions/v1/satellite-gateway`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      const err = new Error(friendlyGatewayError(res.status, text)) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }

    return res.json();
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('The request timed out. Please check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callGateway(body: Record<string, unknown>): Promise<any> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= GATEWAY_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await attemptGateway(body);
    } catch (err: any) {
      lastError = err;

      // Don't retry timeouts, auth errors, or deterministic client errors.
      const isTimeout = err?.message?.includes('timed out');
      const isClientError = err?.status != null && !isRetryableStatus(err.status);
      const isLastAttempt = attempt === GATEWAY_RETRY_DELAYS_MS.length;

      if (isTimeout || isClientError || isLastAttempt) break;

      await new Promise(r => setTimeout(r, GATEWAY_RETRY_DELAYS_MS[attempt]));
    }
  }

  throw lastError;
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
const LOG_SYNCED_KEY = 'bd_behavior_logs_synced';

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

// ─── Behavior Log Cloud Sync ─────────────────────────────
// Local-first: every log is written to localStorage immediately.
// This function attempts to push un-synced logs to Nova Core's abc_logs table.
// Call on app startup and after saving a new log (fire-and-forget).
// If the table does not exist yet, fails silently and retries next call.

function loadSyncedLogIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOG_SYNCED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function markLogsSynced(ids: string[]) {
  try {
    const existing = loadSyncedLogIds();
    ids.forEach(id => existing.add(id));
    localStorage.setItem(LOG_SYNCED_KEY, JSON.stringify(Array.from(existing).slice(-2000)));
  } catch { /* storage full — continue */ }
}

export async function syncBehaviorLogs(userId: string): Promise<void> {
  const logs = getBehaviorLogs();
  const synced = loadSyncedLogIds();
  const pending = logs.filter(l => !synced.has(l.id));
  if (pending.length === 0) return;

  const rows = pending.map(l => ({
    id: l.id,
    user_id: userId,
    date: l.date,
    time: l.time || null,
    setting: l.setting || null,
    antecedent: l.antecedent || null,
    behavior: l.behavior,
    consequence: l.consequence || null,
    intensity: l.intensity ?? null,
    notes: l.notes || null,
    created_at: l.createdAt,
  }));

  try {
    await proxyQuery({
      table: 'abc_logs',
      operation: 'upsert',
      data: rows,
      on_conflict: 'id',
    });
    markLogsSynced(pending.map(l => l.id));
  } catch {
    // Table not yet provisioned on Nova Core — fail silently.
    // Logs remain in localStorage; sync will succeed once table is ready.
  }
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
