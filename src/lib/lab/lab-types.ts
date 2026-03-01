/**
 * Behavior Lab™ — Local Types
 * No DB. All types for game configs, attempts, mastery, and local state.
 */

export interface LabGameConfig {
  id: string;
  title: string;
  stage: 1 | 2 | 3;
  difficulty: 'easy' | 'easy-med' | 'med' | 'hard';
  difficulty_dots: number;
  skill_tags: string[];
  est_seconds: number;
  goal: string;
  micro_tip: string;
  screens: {
    intro: { headline: string; body: string; cta?: string };
    results: { buttons: string[] };
  };
  questions: LabQuestion[];
}

export interface LabQuestion {
  scenario: string;
  prompt?: string;
  options: string[];
  answer: string;
  explain: string;
  secondary_answer?: string;
  correct_order?: string[];
  bucket?: string;
  part?: 'A' | 'B' | 'C';
}

export interface LabAttemptLocal {
  game_id: string;
  started_at: string;
  completed_at: string;
  score_percent: number;
  xp_earned: number;
  skill_tags: string[];
  difficulty: string;
  mistakes_summary: { question: string; given: string; correct: string }[];
  streak_count: number;
}

// ─── Growth Levels ────────────────────────
export const GROWTH_LEVELS = [
  { level: 1, name: 'Observer', xp: 0, emoji: '👀' },
  { level: 2, name: 'Behavior Detective', xp: 200, emoji: '🔍' },
  { level: 3, name: 'Reinforcement Reader', xp: 500, emoji: '📖' },
  { level: 4, name: 'Pattern Spotter', xp: 900, emoji: '🧩' },
  { level: 5, name: 'Confident Coach', xp: 1400, emoji: '🌟' },
] as const;

// ─── Skill Packs (for home screen) ────────
export interface SkillPackDef {
  id: string;
  title: string;
  subtitle: string;
  game_ids: string[];
  locked_until_stage?: 2 | 3;
}

export const SKILL_PACKS: SkillPackDef[] = [
  { id: 'pack_functions', title: 'Functions', subtitle: 'Identify the "why" quickly', game_ids: ['function_flash', 'escape_or_attention', 'access_or_attention', 'sensory_or_escape', 'consequence_match'] },
  { id: 'pack_reinforcement', title: 'Reinforcement', subtitle: 'Spot what strengthened behavior', game_ids: ['reinforcement_radar', 'who_was_reinforced', 'myth_buster_tf'] },
  { id: 'pack_abc', title: 'ABC', subtitle: 'Build clear behavior stories', game_ids: ['abc_builder', 'trigger_spotter', 'consequence_spotter', 'behavior_loop_puzzle'] },
  { id: 'pack_replacement', title: 'Replacement Skills', subtitle: 'Teach what to do instead', game_ids: ['replacement_builder', 'replacement_match', 'first_then_creator', 'visual_timer_planner'], locked_until_stage: 2 },
  { id: 'pack_data', title: 'Data Skills', subtitle: 'Notice patterns without overthinking', game_ids: ['frequency_vs_duration', 'intensity_rating_trainer', 'data_detective'], locked_until_stage: 2 },
  { id: 'pack_scripts', title: 'Scripts', subtitle: 'Say the thing that helps', game_ids: ['script_swap', 'what_would_nova_say'], locked_until_stage: 2 },
  { id: 'pack_advanced', title: 'Advanced Coaching Mode', subtitle: 'Timed fluency + plan repair', game_ids: ['micro_scenario_drills_30s', 'fix_the_plan'], locked_until_stage: 3 },
];

// ─── Mastery Skills ───────────────────────
export interface MasterySkill {
  key: string;
  label: string;
}

export const MASTERY_SKILLS: MasterySkill[] = [
  { key: 'functions', label: 'Functions' },
  { key: 'abc', label: 'ABC' },
  { key: 'reinforcement', label: 'Reinforcement' },
  { key: 'consequences', label: 'Consequences' },
  { key: 'antecedents', label: 'Triggers' },
  { key: 'replacement_skills', label: 'Replacement Skills' },
  { key: 'scripts', label: 'Scripts' },
  { key: 'measurement', label: 'Measurement' },
  { key: 'data', label: 'Data Skills' },
  { key: 'de_escalation', label: 'De-escalation' },
  { key: 'coach_regulation', label: 'Coach Regulation' },
  { key: 'generalization', label: 'Generalization' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'retention', label: 'Retention' },
  { key: 'planning', label: 'Planning' },
];

// ─── Daily Drill Pool ─────────────────────
export const DAILY_DRILL_POOL = [
  'function_flash', 'reinforcement_radar', 'abc_builder', 'trigger_spotter',
  'consequence_spotter', 'frequency_vs_duration', 'myth_buster_tf',
  'what_would_nova_say', 'ten_second_reset',
];

// ─── XP Calculation (difficulty-based) ────
const BASE_XP: Record<string, number> = {
  'easy': 12,
  'easy-med': 16,
  'med': 20,
  'hard': 26,
};

const COMPLETION_BONUS = 4;
const STREAK_BONUS = 6;
const XP_CAP = 30;

function accuracyMultiplier(score: number): number {
  if (score >= 95) return 1.25;
  if (score >= 80) return 1.15;
  if (score >= 60) return 1.0;
  return 0.8;
}

export function calculateXp(scorePercent: number, difficulty: string = 'easy', hasStreak: boolean = false): number {
  const base = BASE_XP[difficulty] || 12;
  const withCompletion = base + COMPLETION_BONUS;
  const multiplied = Math.round(withCompletion * accuracyMultiplier(scorePercent));
  const withStreak = hasStreak ? multiplied + STREAK_BONUS : multiplied;
  return Math.min(withStreak, XP_CAP);
}

// ─── Growth Level Helpers ─────────────────
export function getGrowthLevel(totalXp: number) {
  return [...GROWTH_LEVELS].reverse().find(l => totalXp >= l.xp) || GROWTH_LEVELS[0];
}

export function getNextLevel(totalXp: number) {
  return GROWTH_LEVELS.find(l => l.xp > totalXp) || null;
}
