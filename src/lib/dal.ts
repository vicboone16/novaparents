/**
 * Data Access Layer (DAL)
 * ──────────────────────
 * All reads/writes to the backend flow through this module.
 * Phase 1: talks directly to the NovaTrack Supabase backend.
 * Phase 2: swap the implementation to a dedicated Parent API
 *          without touching any screen components.
 *
 * Rules:
 *  - Only access parent-safe surfaces (public.clients,
 *    public.user_client_access, public.parent_safe_* views/tables).
 *  - Never touch raw clinical tables.
 */

import { supabase } from '@/integrations/supabase/client';

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
  const { data, error } = await (supabase as any)
    .from('app_handshake')
    .select('app_slug')
    .eq('id', 1)
    .single();

  if (error) throw new Error('Unable to verify backend connection.');
  return { appSlug: data?.app_slug ?? null };
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

/** Fetch clients the current parent has access to via user_client_access. */
export async function getMyClients(): Promise<ClientSummary[]> {
  // Phase 1: attempts read from public.clients (parent-safe view).
  // If the view/table doesn't exist yet, returns empty gracefully.
  try {
    const { data, error } = await (supabase as any)
      .from('clients')
      .select('id, first_name, last_name');

    if (error) {
      console.warn('[DAL] clients read skipped:', error.message);
      return [];
    }
    return (data as ClientSummary[]) || [];
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

/** Seed data used as fallback when no DB table exists yet. */
const SEED_LIBRARY: ReplacementBehavior[] = [
  {
    id: '1', trigger: 'Hitting when frustrated',
    function: 'escape', ageBand: 'early-childhood', setting: 'home', commLevel: 'emerging',
    definition: 'The child uses physical aggression (hitting) to communicate frustration or escape demands.',
    teachingSteps: ['Teach a "break" card or gesture', 'Practice during calm moments', 'Prompt the replacement when frustration begins', 'Fade prompts over time'],
    prompts: ['Hand-over-hand to use break card', 'Point to break card', 'Verbal: "Use your card"'],
    reinforcement: 'Immediately honor the break request. Praise: "Great job asking for a break!"',
    generalization: 'Practice in multiple rooms. Introduce with different caregivers.',
  },
  {
    id: '2', trigger: 'Screaming for items',
    function: 'tangible', ageBand: 'early-childhood', setting: 'home', commLevel: 'pre-verbal',
    definition: 'The child screams or cries to obtain desired items rather than using an appropriate request.',
    teachingSteps: ['Model pointing or signing "want"', 'Wait for calm before giving item', 'Use first/then: "First ask, then you get it"', 'Reinforce any approximation of asking'],
    prompts: ['Physical prompt to point', 'Model sign', 'Verbal: "Show me what you want"'],
    reinforcement: 'Give the item immediately when the child uses the replacement. "You asked so nicely!"',
    generalization: 'Use at mealtimes, during play, and in stores.',
  },
  {
    id: '3', trigger: 'Running away during transitions',
    function: 'escape', ageBand: 'school-age', setting: 'school', commLevel: 'verbal',
    definition: 'The child runs from the area when asked to transition to a less preferred activity.',
    teachingSteps: ['Use visual timer warnings', 'Teach "I need a minute" phrase', 'Offer choice of how to transition', 'Gradually reduce transition time'],
    prompts: ['Show visual timer', 'Verbal: "What can you say?"', 'Gesture toward transition area'],
    reinforcement: 'Praise staying in area: "You handled that transition so well!" Offer preferred activity after.',
    generalization: 'Use in hallways, cafeteria, and at home.',
  },
  {
    id: '4', trigger: 'Repetitive rocking or hand-flapping',
    function: 'sensory', ageBand: 'early-childhood', setting: 'home', commLevel: 'pre-verbal',
    definition: 'The child engages in self-stimulatory behavior that may interfere with learning.',
    teachingSteps: ['Identify sensory need being met', 'Offer appropriate alternative (fidget, swing)', 'Schedule sensory breaks', 'Redirect gently without punishment'],
    prompts: ['Offer fidget tool', 'Guide to sensory area', 'Verbal: "Let\'s take a sensory break"'],
    reinforcement: 'Praise use of alternatives: "I love how you used your fidget!" Allow sensory breaks.',
    generalization: 'Keep sensory tools available in all settings.',
  },
  {
    id: '5', trigger: 'Constant calling out for adult attention',
    function: 'attention', ageBand: 'school-age', setting: 'school', commLevel: 'verbal',
    definition: 'The child frequently calls out, interrupts, or makes noises to get adult attention.',
    teachingSteps: ['Teach hand-raising or signal', 'Give attention for appropriate bids', 'Use planned ignoring for call-outs', 'Set up check-in schedule'],
    prompts: ['Point to hand-raise visual', 'Verbal: "Raise your hand and I\'ll come"', 'Nonverbal: thumbs up when hand raised'],
    reinforcement: 'Respond quickly when appropriate signal is used. "Thank you for raising your hand!"',
    generalization: 'Practice at home (use a similar signal at dinner table).',
  },
];

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

    // Map DB columns to our interface (adjust mapping when table is created)
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
